import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_USER_STORAGE_KEY = 'plachet_auth_user';
const AUTH_TOKEN_STORAGE_KEY = 'plachet_auth_token';

type AuthContextValue = {
  user: any | null;
  token: string;
  login: (payload: { user: any; token?: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const safeParse = (value: string | null) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (_err) {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(() => safeParse(typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_STORAGE_KEY) : null));
  const [token, setToken] = useState<string>(() => (typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '' : ''));

  useEffect(() => {
    try {
      if (user) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }, [user, token]);

  const login = (payload: { user: any; token?: string }) => {
    setUser(payload.user);
    setToken(payload.token || '');
  };

  const logout = () => {
    setUser(null);
    setToken('');
  };

  const value = useMemo(() => ({ user, token, login, logout }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
