export const ENV = {
  get supabaseUrl() { return process.env.SUPABASE_URL ?? ""; },
  // Accept either the canonical SUPABASE_ANON_KEY or the Supabase dashboard's
  // SUPABASE_PUBLISHABLE_KEY name — they are the same credential (anon/public key).
  get supabaseAnonKey() {
    return process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  },
};
