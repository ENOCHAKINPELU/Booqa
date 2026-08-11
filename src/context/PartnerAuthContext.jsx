import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { partnerAuthApi } from '../services/partnerApi';

// Mirrors AuthContext.jsx's shape exactly, but for the hotel-partner
// session — kept as a fully separate context/provider (not a role flag on
// the guest one) because the two sessions are backed by entirely different
// cookies and can be simultaneously true or false independently of each
// other (see lib/partnerAuth.js).
const PartnerAuthContext = createContext(null);

export function PartnerAuthProvider({ children }) {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await partnerAuthApi.get('/me');
      setPartner(data.data);
    } catch {
      setPartner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password, role) => {
    const { data } = await partnerAuthApi.post('/login', { email, password, role });
    setPartner(data.data.partner);
    return data.data.partner;
  };

  const logout = async () => {
    await partnerAuthApi.post('/logout');
    setPartner(null);
  };

  return (
    <PartnerAuthContext.Provider value={{ partner, loading, login, logout, refresh }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error('usePartnerAuth must be used within PartnerAuthProvider');
  return ctx;
}
