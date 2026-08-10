import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api';

// Plain React context, not a new state library — the auth state is small
// (a guest object or null) and only a handful of components read it.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await authApi.get('/me');
      setGuest(data.data);
    } catch {
      setGuest(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signup = async (payload) => {
    const { data } = await authApi.post('/auth/signup', payload);
    setGuest(data.data.guest);
    return data.data.guest;
  };

  const login = async (email, password) => {
    const { data } = await authApi.post('/auth/login', { email, password });
    setGuest(data.data.guest);
    return data.data.guest;
  };

  const logout = async () => {
    await authApi.post('/auth/logout');
    setGuest(null);
  };

  return (
    <AuthContext.Provider value={{ guest, loading, signup, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
