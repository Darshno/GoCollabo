import { createClient } from "@supabase/supabase-js";
import type { Database } from "../shared/database.types";
import { ENV } from "./_core/env";

export function hasSupabaseConfig() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}

export function createSupabaseClient(accessToken?: string) {
  const url = ENV.supabaseUrl;
  const anonKey = ENV.supabaseAnonKey;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

export type RequestSupabase = ReturnType<typeof createSupabaseClient>;