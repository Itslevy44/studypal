import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  university: string;
  campus: string;
  yearOfStudy: string;
  hasActiveSubscription?: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string; password: string; fullName: string;
    university: string; campus: string; yearOfStudy: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          storage.getToken(),
          storage.getUser(),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password);
    await storage.setToken(data.token);
    await storage.setUser(data.user);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: any) => {
    const data = await api.auth.register(payload);
    await storage.setToken(data.token);
    await storage.setUser(data.user);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await storage.clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.auth.me();
      if (data.success && data.user) {
        await storage.setUser(data.user);
        setUser(data.user);
      }
    } catch {
      // Silently fail — stale data is fine
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
