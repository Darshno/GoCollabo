import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountType: "creator" | "brand";
};

export type AuthContextValue = {
  user: AuthenticatedUser | null;
  session: Session | null;
  loading: boolean;
  error: unknown | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  refresh: () => Promise<unknown>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractUserFromSession(authUser: User | null | undefined): AuthenticatedUser | null {
  if (!authUser) return null;
  const meta = authUser.user_metadata || {};
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (meta.display_name as string) ||
    null;
  const accountType = meta.account_type === "brand" ? "brand" : "creator";
  return {
    id: authUser.id,
    email: authUser.email || null,
    name,
    accountType,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  const utils = trpc.useUtils();

  // Listen to Supabase auth state and restore session
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      return;
    }

    let alive = true;

    // 1. Initial session restoration on load
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data?.session) {
          setSession(data.session);
          void utils.auth.me.invalidate();
        } else {
          setSession(null);
        }
        setSessionLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setSession(null);
        setSessionLoading(false);
      });

    // 2. Respond to onAuthStateChange events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!alive) return;

      if (event === "SIGNED_OUT" || !nextSession) {
        setSession(null);
        setSessionLoading(false);
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
        return;
      }

      setSession(nextSession);
      setSessionLoading(false);

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        await utils.auth.me.invalidate();
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [utils.auth.me]);

  // Query server for verified user profile and account type
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isSupabaseConfigured && Boolean(session),
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Logout handler
  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  // Refresh handler
  const refresh = useCallback(() => meQuery.refetch(), [meQuery]);

  // Fallback to session user so authenticated UI appears immediately without flicker/race conditions
  const fallbackUser = useMemo(
    () => extractUserFromSession(session?.user),
    [session?.user]
  );

  const user: AuthenticatedUser | null = useMemo(() => {
    if (!session) return null;
    if (meQuery.data) return meQuery.data;
    return fallbackUser;
  }, [session, meQuery.data, fallbackUser]);

  const isAuthenticated = Boolean(session && (user || session.user));
  const loading = sessionLoading || (Boolean(session) && !user && meQuery.isLoading);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      session,
      loading,
      error: meQuery.error ?? null,
      isAuthenticated,
      isConfigured: isSupabaseConfigured,
      refresh,
      logout,
    }),
    [user, session, loading, meQuery.error, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
