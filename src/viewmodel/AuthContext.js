import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

const USERS_KEY = '@oraned_all_users';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const authDataSerialized = await AsyncStorage.getItem('@AuthUser');
        if (authDataSerialized) setUser(JSON.parse(authDataSerialized));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadStorageData();
  }, []);

  const login = async (email, password) => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found || found.password !== password) {
      throw new Error('Email ou mot de passe incorrect');
    }
    const userData = { name: found.name, email: found.email };
    setUser(userData);
    await AsyncStorage.setItem('@AuthUser', JSON.stringify(userData));
  };

  const register = async (name, email, password) => {
    const raw = await AsyncStorage.getItem(USERS_KEY);
    const users = raw ? JSON.parse(raw) : [];
    if (users.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error('Cet email est déjà utilisé');
    }
    const newUser = { name, email, password };
    const updated = [...users, newUser];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
    const userData = { name, email };
    setUser(userData);
    await AsyncStorage.setItem('@AuthUser', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@AuthUser');
  };

  const userId = user?.email || null;

  return (
    <AuthContext.Provider value={{ user, userId, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
