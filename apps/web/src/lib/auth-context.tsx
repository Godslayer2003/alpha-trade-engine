'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchSession, loginAccount, logoutAccount, registerAccount } from './api-client';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, acceptedTerms: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Remove tokens written by older releases; authentication now lives only
    // in an HttpOnly cookie that browser JavaScript cannot read.
    window.localStorage.removeItem('alpha-trade-auth');
    fetchSession()
      .then(({ user: sessionUser }) => {
        setUser(sessionUser);
        setToken('cookie-session');
      })
      .catch(() => {
        setUser(null);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function persist(nextUser: AuthUser) {
    setToken('cookie-session');
    setUser(nextUser);
  }

  async function login(email: string, password: string) {
    const result = await loginAccount(email, password);
    persist(result.user);
  }

  async function register(email: string, password: string, acceptedTerms: boolean) {
    const result = await registerAccount(email, password, acceptedTerms);
    persist(result.user);
  }

  async function logout() {
    await logoutAccount().catch(() => undefined);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
