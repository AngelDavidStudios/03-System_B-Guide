"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchSession,
  logout as logoutApi,
  refresh as refreshApi,
  startLogin,
  type SessionUser,
} from "@/lib/api/auth";

interface SessionContextValue {
  user: SessionUser | null;
  loaded: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  load: () => Promise<void>;
  signIn: (returnTo?: string) => void;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const res = await fetchSession();
      setUser(res.authenticated && res.user ? res.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoaded(true);
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void load();
    const onUnauthorized = (): void => setUser(null);
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, [load]);

  const signOut = useCallback(async () => {
    try {
      const { logoutUrl } = await logoutApi();
      setUser(null);
      window.location.assign(logoutUrl);
    } catch {
      setUser(null);
    }
  }, []);

  const signIn = useCallback((returnTo = "/post-login") => {
    startLogin(returnTo);
  }, []);

  const refreshTokens = useCallback(async () => {
    await refreshApi();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loaded,
      loading,
      isAuthenticated: user !== null,
      isAdmin: user?.groups.includes("Admins") ?? false,
      load,
      signIn,
      signOut,
      refreshTokens,
    }),
    [user, loaded, loading, load, signIn, signOut, refreshTokens],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  }
  return ctx;
}
