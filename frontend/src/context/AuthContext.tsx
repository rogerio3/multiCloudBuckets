'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, session } from '@/lib/api';
import type { User } from '@/lib/types';

const REDIRECT_KEY = 'cla_redirect';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the persisted session has been restored on mount. */
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Global auth state: restores the persisted session on load, exposes
 * login/logout, and keeps localStorage in sync.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = session.getToken();
    const stored = session.getUser();
    if (token && stored) {
      setUser(stored);
    } else {
      session.clear();
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.login(username, password);
      session.save(res.token, res.user);
      setUser(res.user);
      const target =
        typeof window !== 'undefined'
          ? window.sessionStorage.getItem(REDIRECT_KEY) ?? '/logs'
          : '/logs';
      if (typeof window !== 'undefined') window.sessionStorage.removeItem(REDIRECT_KEY);
      router.replace(target);
    },
    [router],
  );

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

/** Remembers where an unauthenticated user wanted to go (used by AuthGuard). */
export function rememberRedirectTarget(path: string): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(REDIRECT_KEY, path);
  }
}