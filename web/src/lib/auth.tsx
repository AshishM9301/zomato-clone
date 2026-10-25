// Auth context + provider.
//
// The JWT lives in an httpOnly cookie set by the backend on login; this
// provider never sees the token. Auth state is bootstrapped on mount by
// calling `GET /auth/me`, which succeeds if the cookie is valid and 401s
// otherwise. `UNAUTHENTICATED` responses anywhere trigger an
// `auth:unauthorized` window event that we listen for and react to.

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { ApiError } from "./errors";
import { ROLE_HOME, type StaffRole } from "./constants";
import type { LoginResponse, MeResponse, User } from "./types";

type AuthState = {
  user: User | null;
  role: StaffRole | null;
  merchantId: string | null;
  riderId: string | null;
};

type AuthContextValue = AuthState & {
  isLoading: boolean;
  login: (role: StaffRole, email: string, password: string) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stateFromUser(user: User, role: StaffRole): AuthState {
  return {
    user,
    role,
    merchantId: user.merchantId ?? null,
    riderId: user.riderId ?? null,
  };
}

function emptyState(): AuthState {
  return { user: null, role: null, merchantId: null, riderId: null };
}

// The user record carries `role` directly; map to our narrower StaffRole.
function roleFromUser(user: User): StaffRole | null {
  if (user.role === "admin" || user.role === "merchant" || user.role === "rider") {
    return user.role;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(emptyState());
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap: probe /auth/me to see if the cookie session is still valid.
  // While in-flight, `isLoading` is true so role guards wait.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const data = await api.get<MeResponse>("/auth/me");
        if (cancelled) return;
        const role = roleFromUser(data.user);
        if (!role) {
          setState(emptyState());
        } else {
          setState(stateFromUser(data.user, role));
        }
      } catch (err) {
        if (cancelled) return;
        // 401 (UNAUTHENTICATED) is the expected "no session" path; the api
        // client already dispatched `auth:unauthorized`, so just stay empty.
        if (!(err instanceof ApiError) || err.code !== "UNAUTHENTICATED") {
          // Network / 5xx — log but don't bounce, the user can retry.
          // eslint-disable-next-line no-console
          console.error("auth bootstrap failed", err);
        }
        setState(emptyState());
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();

    // Listen for forced logouts (401 from anywhere).
    const onUnauth = () => {
      setState(emptyState());
      router.replace("/login");
    };
    window.addEventListener("auth:unauthorized", onUnauth);
    return () => {
      cancelled = true;
      window.removeEventListener("auth:unauthorized", onUnauth);
    };
  }, [router]);

  const login = useCallback(
    async (role: StaffRole, email: string, password: string) => {
      const data = await api.post<LoginResponse>(
        `/auth/${role}/login`,
        { email, password },
      );
      // Backend set the httpOnly cookie via Set-Cookie. We don't see the
      // token in JS — that's the whole point.
      const userRole = roleFromUser(data.user);
      if (!userRole || userRole !== role) {
        // Server claimed a role we didn't ask for. Treat as auth failure.
        throw new ApiError({
          code: "UNAUTHENTICATED",
          message: "Login response role mismatch",
          status: 200,
        });
      }
      setState(stateFromUser(data.user, role));
      router.replace(ROLE_HOME[role]);
    },
    [router],
  );

  const logout = useCallback(
    async (redirectTo: string = "/login") => {
      // Best-effort server-side clear; ignore failures so the UI can always
      // reach /login even if the backend is unreachable.
      try {
        await api.post("/auth/logout");
      } catch {
        // intentionally ignored
      }
      setState(emptyState());
      router.replace(redirectTo);
    },
    [router],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, isLoading, login, logout }),
    [state, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Convenience hook: assert a role. Throws via redirect if mismatched.
// Use inside a client component.
export function useRequireRole(role: StaffRole) {
  const { role: current, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (isLoading) return;
    if (current !== role) {
      router.replace(current ? ROLE_HOME[current] : "/login");
    }
  }, [current, role, isLoading, router]);
  return { isLoading, ready: current === role };
}