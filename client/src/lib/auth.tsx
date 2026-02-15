import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setOnAuthError } from './api';

interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  isTemporary: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser, accessToken: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
  }, []);

  useEffect(() => {
    setOnAuthError(clearAuth);

    // Try to restore session via refresh token
    async function init() {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setUser(data.user);
        }
      } catch {
        // No session
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [clearAuth]);

  const login = async (username: string, password: string) => {
    const data = await api<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    clearAuth();
  };

  const updateUser = (newUser: AuthUser, newAccessToken: string) => {
    setAccessToken(newAccessToken);
    setUser(newUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
