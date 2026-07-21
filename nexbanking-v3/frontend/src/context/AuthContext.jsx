import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nex_user')); } catch { return null; }
  });
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAccount = useCallback(async () => {
    try {
      const res = await api.get('/account');
      setAccount(res.data.data.account);
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('nex_token');
    if (token && user) {
      fetchAccount().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, data } = res.data;
    localStorage.setItem('nex_token', token);
    localStorage.setItem('nex_user', JSON.stringify(data.user));
    setUser(data.user);
    setAccount(data.account);
    return data;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    const { token, data } = res.data;
    localStorage.setItem('nex_token', token);
    localStorage.setItem('nex_user', JSON.stringify(data.user));
    setUser(data.user);
    setAccount(data.account);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('nex_token');
    localStorage.removeItem('nex_user');
    setUser(null);
    setAccount(null);
  };

  return (
    <AuthContext.Provider value={{ user, account, setAccount, loading, login, register, logout, fetchAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
