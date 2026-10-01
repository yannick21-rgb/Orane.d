import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../utils/supabase';
import { hashPassword, verifyPassword, checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from '../utils/security';
import { safeAsyncReadJSON, safeAsyncWriteJSON, safeAsyncRemove, validateUser } from '../utils/storage';
import { initSecureStorage, resetSecureStorage } from '../utils/secureStorage';

const AuthContext = createContext({});

const USERS_KEY = '@oraned_all_users';
const AUTH_USER_KEY = '@AuthUser';
const ACCOUNTS_INDEX_KEY = '@orane_accounts_index';
const MIGRATED_KEY = (uid) => `@migrated_to_supabase_${uid}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [accountsIndex, setAccountsIndex] = useState([]);
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState(null);

  const loadAllUsers = async () => {
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    const valid = users.filter((u) => {
      const { valid: ok } = validateUser(u);
      if (!ok) console.warn('[AuthContext] Utilisateur corrompu filtré :', u?.email);
      return ok;
    });
    setAllUsers(valid);
  };

  const addToAccountsIndex = async (id, name) => {
    try {
      const index = await safeAsyncReadJSON(ACCOUNTS_INDEX_KEY, []);
      if (!index.some((a) => a.id === id)) {
        const updated = [...index, { id, name }];
        await safeAsyncWriteJSON(ACCOUNTS_INDEX_KEY, updated);
        setAccountsIndex(updated);
      }
    } catch (e) {
      console.error('[AuthContext] Erreur addToAccountsIndex :', e);
    }
  };

  const loginToUser = async (id, pin) => {
    if (pin) {
      const { locked, waitMs } = await checkPinRateLimit(id);
      if (locked) {
        const sec = Math.ceil(waitMs / 1000);
        let msg = 'Trop de tentatives. ';
        if (sec >= 3600) msg += `Réessayez dans ${Math.floor(sec / 3600)}h.`;
        else if (sec >= 60) msg += `Réessayez dans ${Math.floor(sec / 60)}min ${sec % 60}s.`;
        else msg += `Réessayez dans ${sec}s.`;
        if (waitMs >= 3600000) {
          msg += ' Utilisez "PIN oublié" dans Paramètres pour réinitialiser.';
        }
        throw new Error(msg);
      }
      const storedHash = await safeAsyncReadJSON(`@oraned_pin_${id}`, null);
      if (storedHash) {
        const { verifyPin } = await import('../utils/security');
        const valid = await verifyPin(pin, storedHash);
        if (!valid) {
          const result = await recordFailedPinAttempt(id);
          let msg = 'Code PIN incorrect.';
          if (result.locked && result.attempts >= 10) {
            msg += ' Compte verrouillé 1h. Utilisez "PIN oublié" dans Paramètres.';
          } else if (result.attempts >= 5) {
            msg += ` Bloqué 5min. Encore ${10 - result.attempts} tentative(s) avant verrouillage 1h.`;
          } else if (result.attempts >= 3) {
            msg += ` Bloqué 30s. Encore ${5 - result.attempts} tentative(s) avant blocage 5min.`;
          } else {
            msg += ` Encore ${result.remainingAttempts} tentative(s).`;
          }
          throw new Error(msg);
        }
        await resetPinRateLimit(id);
      }
    }
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    const target = users.find((u) => u.email === id);
    if (!target) throw new Error('Compte introuvable');
    const userData = { name: target.name, email: target.email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
    const ok = await initSecureStorage(id);
    setEncryptionReady(ok);
  };

  const migrateLocalData = async (email, uid) => {
    const migrated = await safeAsyncReadJSON(MIGRATED_KEY(email), false);
    if (migrated) return;
    const userIdForMigration = uid || supabaseUser?.id;
    if (!userIdForMigration) return;
    try {
      const transactions = await safeAsyncReadJSON(`@oraned_transactions_${email}`, []);
      if (transactions.length > 0) {
        const { error } = await supabase.from('transactions').upsert(
          transactions.map((t) => ({ ...t, user_id: userIdForMigration }))
        );
        if (error) console.warn('[AuthContext] Échec migration transactions :', error.message);
      }
      const debts = await safeAsyncReadJSON(`@oraned_debts_${email}`, []);
      if (debts.length > 0) {
        const { error } = await supabase.from('debts').upsert(
          debts.map((d) => ({ ...d, user_id: userIdForMigration }))
        );
        if (error) console.warn('[AuthContext] Échec migration dettes :', error.message);
      }
      const tontines = await safeAsyncReadJSON(`@oraned_tontines_${email}`, []);
      if (tontines.length > 0) {
        const { error } = await supabase.from('tontines').upsert(
          tontines.map((t) => ({ ...t, user_id: userIdForMigration }))
        );
        if (error) console.warn('[AuthContext] Échec migration tontines :', error.message);
      }
      const settings = await safeAsyncReadJSON(`@oraned_settings_${email}`, null);
      if (settings) {
        const { error } = await supabase.from('user_settings').upsert({
          user_id: userIdForMigration,
          theme: settings.theme || 'Système',
          accent_color: settings.accentColor || '#3b82f6',
          devise: settings.devise || '€ (EUR)',
          budget_limit: settings.budgetLimit || 0,
          budget_period: settings.budgetPeriod || 'month',
          reminder_hour: settings.reminderHour || 20,
          reminder_minute: settings.reminderMinute || 0,
        });
        if (error) console.warn('[AuthContext] Échec migration paramètres :', error.message);
      }
      await safeAsyncWriteJSON(MIGRATED_KEY(email), true);
    } catch (e) {
      console.warn('[AuthContext] Erreur migration données locales :', e.message);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', session.user.id)
          .single();
        const userData = {
          name: profile?.name || session.user.email?.split('@')[0] || 'Utilisateur',
          email: session.user.email,
        };
        setUser(userData);
        await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
        const ok = await initSecureStorage(session.user.email);
        setEncryptionReady(ok);
        migrateLocalData(session.user.email, session.user.id);
      } else {
        setUser(null);
        setSupabaseUser(null);
        setEncryptionReady(false);
      }
      setLoading(false);
    });

    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSupabaseUser(session.user);
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', session.user.id)
            .single();
          const userData = {
            name: profile?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            email: session.user.email,
          };
          setUser(userData);
          await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
          const ok = await initSecureStorage(session.user.email);
          setEncryptionReady(ok);
          migrateLocalData(session.user.email, session.user.id);
        }
        await loadAllUsers();
        const idx = await safeAsyncReadJSON(ACCOUNTS_INDEX_KEY, []);
        setAccountsIndex(idx);
      } catch (e) {
        console.error('[AuthContext] Erreur restauration session :', e);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const isNetworkError = (e) => {
    const m = (e?.message || '').toLowerCase();
    return m.includes('network') || m.includes('fetch') || m.includes('failed to fetch') || m.includes('nom ou service inconnu') || m.includes('networkerror');
  };

  const localLogin = async (cleanEmail, password) => {
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    const target = users.find((u) => u.email === cleanEmail);
    if (!target) throw new Error('Email ou mot de passe incorrect');
    const ok = await verifyPassword(password, target.password);
    if (!ok) throw new Error('Email ou mot de passe incorrect');
    const userData = { name: target.name, email: target.email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
    await addToAccountsIndex(cleanEmail, target.name);
    const encOk = await initSecureStorage(cleanEmail);
    setEncryptionReady(encOk);
    await loadAllUsers();
    return true;
  };

  const localRegister = async (cleanName, cleanEmail, password) => {
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    if (users.some((u) => u.email === cleanEmail)) throw new Error('Cet email est déjà utilisé');
    const hashed = await hashPassword(password);
    const newUser = { name: cleanName, email: cleanEmail, password: hashed };
    const updated = [...users, newUser];
    await safeAsyncWriteJSON(USERS_KEY, updated);
    await addToAccountsIndex(cleanEmail, cleanName);
    setAllUsers(updated);
    const userData = { name: cleanName, email: cleanEmail };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
    const encOk = await initSecureStorage(cleanEmail);
    setEncryptionReady(encOk);
    return { user: { id: cleanEmail }, session: true };
  };

  const login = async (email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) throw new Error('Veuillez remplir tous les champs');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) throw new Error('Format d\'email invalide');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid email or password')) {
          throw new Error('Email ou mot de passe incorrect');
        }
        if (msg.includes('email not confirmed')) {
          throw new Error('Email non confirmé. Vérifie ta boîte de réception et clique sur le lien.');
        }
        if (isNetworkError(error)) {
          return localLogin(cleanEmail, password);
        }
        throw new Error(error.message || 'Erreur de connexion');
      }
    } catch (e) {
      if (isNetworkError(e) || e.message === 'Email ou mot de passe incorrect') {
        if (e.message === 'Email ou mot de passe incorrect') throw e;
        try { return await localLogin(cleanEmail, password); } catch (le) { throw le; }
      }
      throw e;
    }
  };

  const register = async (name, email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    if (!cleanName || !cleanEmail || !password) throw new Error('Veuillez remplir tous les champs');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) throw new Error('Format d\'email invalide');
    if (cleanName.length < 2) throw new Error('Le nom doit contenir au moins 2 caractères');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { name: cleanName } },
      });
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('email already exists') || msg.includes('duplicate')) {
          throw new Error('Cet email est déjà utilisé');
        }
        if (msg.includes('password')) throw new Error(error.message);
        if (isNetworkError(error)) {
          return localRegister(cleanName, cleanEmail, password);
        }
        throw new Error(error.message || "Erreur lors de l'inscription");
      }
      if (data?.user) {
        try {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name: cleanName,
            email: cleanEmail,
          }, { onConflict: 'id' });
          if (profileError && !profileError.message.includes('not authenticated')) {
            console.warn('[AuthContext] Erreur création profil :', profileError.message);
          }
        } catch (e) {
          console.warn('[AuthContext] Erreur création profil :', e.message);
        }
      }
      if (!data?.session) {
        return { ...data, needsConfirmation: true };
      }
      return data;
    } catch (e) {
      if (isNetworkError(e)) {
        return localRegister(cleanName, cleanEmail, password);
      }
      throw e;
    }
  };

  const switchToUser = async (targetEmail) => {
    const target = allUsers.find((u) => u.email === targetEmail);
    if (!target) return;
    const userData = { name: target.name, email: target.email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setEncryptionReady(false);
    await safeAsyncRemove(AUTH_USER_KEY);
  };

  const updateProfile = async (name) => {
    if (!user || !supabaseUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', supabaseUser.id);
    if (error) {
      console.warn('[AuthContext] Erreur mise à jour profil :', error.message);
      throw new Error('Erreur lors de la mise à jour du profil');
    }
    const updatedUser = { ...user, name: name.trim() };
    setUser(updatedUser);
    await safeAsyncWriteJSON(AUTH_USER_KEY, updatedUser);
  };

  const userId = user?.email || null;

  return (
    <AuthContext.Provider value={{ user, userId, loading, allUsers, login, register, switchToUser, logout, updateProfile, accountsIndex, loginToUser, encryptionReady, supabaseUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
