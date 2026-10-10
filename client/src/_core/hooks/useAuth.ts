import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionLoading(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
      queueMicrotask(() => void utils.auth.me.invalidate());
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [utils.auth.me]);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isSupabaseConfigured && Boolean(session),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  return {
    user: meQuery.data ?? null,
    loading: sessionLoading || (Boolean(session) && meQuery.isLoading),
    error: meQuery.error ?? null,
    isAuthenticated: Boolean(session && meQuery.data),
    isConfigured: isSupabaseConfigured,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
