import type { User } from "@supabase/supabase-js";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { AccountType, ProfileRow } from "../../shared/database.types";
import { getAccountProfile } from "../db";
import { createSupabaseClient, hasSupabaseConfig, type RequestSupabase } from "../supabase";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
  accountType: AccountType;
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
  supabase: RequestSupabase | null;
};

async function loadVerifiedUser(
  supabase: RequestSupabase,
  authUser: User
): Promise<AuthenticatedUser | null> {
  const meta = authUser.user_metadata || {};
  let displayName: string | null =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (meta.display_name as string) ||
    null;
  let accountType: AccountType = meta.account_type === "brand" ? "brand" : "creator";

  try {
    const profile = await getAccountProfile(supabase, authUser.id);
    if (profile) {
      return {
        id: authUser.id,
        email: authUser.email || null,
        name: profile.display_name || displayName,
        accountType: profile.account_type || accountType,
      };
    }
  } catch {
    // If profile record lookup fails (e.g. newly registered user or table trigger delay),
    // attempt to insert a profile row or fall back gracefully to verified auth user metadata.
    try {
      const { data: created } = await supabase
        .from("profiles")
        .insert({
          id: authUser.id,
          display_name: displayName,
          account_type: accountType,
        })
        .select("*")
        .single();
      if (created) {
        const row = created as ProfileRow;
        return {
          id: authUser.id,
          email: authUser.email || null,
          name: row.display_name || displayName,
          accountType: row.account_type || accountType,
        };
      }
    } catch {
      // Non-fatal: still return verified auth user so valid Supabase sessions are never rejected
    }
  }

  return {
    id: authUser.id,
    email: authUser.email || null,
    name: displayName,
    accountType,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  if (!hasSupabaseConfig()) {
    return { req: opts.req, res: opts.res, user: null, supabase: null };
  }

  const authorization = opts.req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;
  const supabase = createSupabaseClient(token);
  let user: AuthenticatedUser | null = null;

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) user = await loadVerifiedUser(supabase, data.user);
  }

  return { req: opts.req, res: opts.res, user, supabase };
}
