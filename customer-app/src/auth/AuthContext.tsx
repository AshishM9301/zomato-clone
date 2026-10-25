// AuthContext — the customer app's session lifecycle. Mirrors
// web/src/lib/auth.tsx but with a single role (customer) and a simpler
// bootstrap (read token from keychain → call /auth/me → either populate
// user or redirect to login).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as meApi from '../api/auth';
import { onUnauthorized } from '../api/client';
import { ApiError } from '../api/errors';
import { clearToken, setToken } from './storage';
import type { User } from '../types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User };

type AuthContextValue = {
  state: AuthState;
  requestOtp: (phone: string) => Promise<{ devCode?: string }>;
  login: (phone: string, otp: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const { user } = await meApi.me();
      setState({ status: 'authenticated', user });
    } catch (err) {
      // 401 → already cleared token via onUnauthorized listener
      if (err instanceof ApiError && err.status === 401) {
        setState({ status: 'unauthenticated' });
        return;
      }
      // Network error during boot: keep the user on a "loading" state so
      // the app retries when connectivity returns. For MVP just bounce to
      // login.
      setState({ status: 'unauthenticated' });
    }
  }, []);

  // Bootstrap: if a token is in keychain, validate via /auth/me.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for 401s anywhere in the app.
  useEffect(() => {
    return onUnauthorized(() => setState({ status: 'unauthenticated' }));
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    const res = await meApi.requestOtp(phone);
    return { devCode: res.devCode };
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const { token, user } = await meApi.verifyOtp(phone, otp);
    await setToken(token);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await meApi.logout();
    } catch {
      // Even if the server logout fails, clear local state.
    }
    await clearToken();
    setState({ status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, requestOtp, login, logout, refresh }),
    [state, requestOtp, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
