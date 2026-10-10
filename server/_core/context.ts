import type { User } from "@supabase/supabase-js";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { AccountType } from "../../shared/database.types";
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
  try {
    const profile = await getAccountProfile(supabase, authUser.id);
    return {
      id: authUser.id,
      email: authUser.email || null,
      name: profile.display_name || authUser.user_metadata?.name || null,
      accountType: profile.account_type,
    };
  } catch {
    return null;
  }
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
    if (!error && data.user) user = await loadVerifiedUser(supabase, data.user);
  }

  return { req: opts.req, res: opts.res, user, supabase };
}
