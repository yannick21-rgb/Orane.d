import React, { createContext, useState, useContext, useEffect } from 'react';
import { hashPassword, verifyPassword, checkPinRateLimit, recordFailedPinAttempt, resetPinRateLimit } from '../utils/security';
import { safeAsyncReadJSON, safeAsyncWriteJSON, safeAsyncRemove, validateUser, filterValidRecords } from '../utils/storage';
import { initSecureStorage, resetSecureStorage } from '../utils/secureStorage';

const AuthContext = createContext({});

const USERS_KEY = '@oraned_all_users';
const AUTH_USER_KEY = '@AuthUser';
const ACCOUNTS_INDEX_KEY = '@orane_accounts_index';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [accountsIndex, setAccountsIndex] = useState([]);
  const [encryptionReady, setEncryptionReady] = useState(false);

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
          const remaining = result.remainingAttempts;
          let msg = 'Code PIN incorrect.';
          if (result.locked && result.attempts >= 10) {
            msg += ' Compte verrouillé 1h. Utilisez "PIN oublié" dans Paramètres.';
          } else if (result.attempts >= 5) {
            msg += ` Bloqué 5min. Encore ${10 - result.attempts} tentative(s) avant verrouillage 1h.`;
          } else if (result.attempts >= 3) {
            msg += ` Bloqué 30s. Encore ${5 - result.attempts} tentative(s) avant blocage 5min.`;
          } else {
            msg += ` Encore ${remaining} tentative(s).`;
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

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const authData = await safeAsyncReadJSON(AUTH_USER_KEY, null);
        if (authData) {
          setUser(authData);
          const ok = await initSecureStorage(authData.email);
          setEncryptionReady(ok);
        }
        await loadAllUsers();
        const idx = await safeAsyncReadJSON(ACCOUNTS_INDEX_KEY, []);
        setAccountsIndex(idx);
      } catch (e) {
        console.error('[AuthContext] Erreur chargement :', e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (email, password) => {
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) {
      throw new Error('Email ou mot de passe incorrect');
    }
    const isHashed = typeof found.password === 'string' && found.password.includes(':');
    if (!isHashed) {
      if (found.password !== password) {
        throw new Error('Email ou mot de passe incorrect');
      }
      const hashed = await hashPassword(password);
      const updated = users.map((u) =>
        u.email === found.email ? { ...u, password: hashed } : u
      );
      await safeAsyncWriteJSON(USERS_KEY, updated);
    } else {
      const isValid = await verifyPassword(password, found.password);
      if (!isValid) {
        throw new Error('Email ou mot de passe incorrect');
      }
    }
    const userData = { name: found.name, email: found.email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
  };

  const register = async (name, email, password) => {
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    if (users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error('Cet email est déjà utilisé');
    }
    const hashed = await hashPassword(password);
    const newUser = { name, email, password: hashed };
    const updated = [...users, newUser];
    await safeAsyncWriteJSON(USERS_KEY, updated);
    setAllUsers(updated);
    const userData = { name, email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
    await addToAccountsIndex(email, name);
  };

  const switchToUser = async (targetEmail) => {
    const target = allUsers.find((u) => u.email === targetEmail);
    if (!target) return;
    const userData = { name: target.name, email: target.email };
    setUser(userData);
    await safeAsyncWriteJSON(AUTH_USER_KEY, userData);
  };

  const logout = async () => {
    setUser(null);
    setEncryptionReady(false);
    await safeAsyncRemove(AUTH_USER_KEY);
  };

  const updateProfile = async (name) => {
    if (!user) return;
    const users = await safeAsyncReadJSON(USERS_KEY, []);
    const updatedUsers = users.map((u) =>
      u.email === user.email ? { ...u, name } : u
    );
    await safeAsyncWriteJSON(USERS_KEY, updatedUsers);
    setAllUsers(updatedUsers);
    const updatedUser = { ...user, name };
    setUser(updatedUser);
    await safeAsyncWriteJSON(AUTH_USER_KEY, updatedUser);
    const idx = await safeAsyncReadJSON(ACCOUNTS_INDEX_KEY, []);
    await safeAsyncWriteJSON(
      ACCOUNTS_INDEX_KEY,
      idx.map((a) => (a.id === user.email ? { ...a, name } : a))
    );
  };

  const userId = user?.email || null;

  return (
    <AuthContext.Provider value={{ user, userId, loading, allUsers, login, register, switchToUser, logout, updateProfile, accountsIndex, loginToUser, encryptionReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
