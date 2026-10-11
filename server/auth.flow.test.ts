import { describe, it, expect, vi, beforeEach } from "vitest";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";
import * as dbModule from "./db";
import * as supabaseModule from "./supabase";
import type { RequestSupabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

describe("Authentication flow and context verification", () => {
  const fakeAuthUser: User = {
    id: "30000000-0000-4000-8000-000000000001",
    app_metadata: {},
    user_metadata: { name: "Test Creator", account_type: "creator" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "creator@example.com",
    role: "authenticated",
    phone: "",
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
  };

  let fakeClient: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fakeClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: fakeAuthUser }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: fakeAuthUser.id,
            display_name: "Test Creator",
            account_type: "creator",
          },
          error: null,
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: fakeAuthUser.id,
                display_name: "Test Creator",
                account_type: "creator",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseModule, "hasSupabaseConfig").mockReturnValue(true);
    vi.spyOn(supabaseModule, "createSupabaseClient").mockReturnValue(fakeClient as unknown as RequestSupabase);
  });

  it("restores verified user from token when profile exists", async () => {
    vi.spyOn(dbModule, "getAccountProfile").mockResolvedValueOnce({
      id: fakeAuthUser.id,
      display_name: "Profile Name",
      account_type: "brand",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const ctx = await createContext({
      req: { headers: { authorization: "Bearer valid-jwt-token" } } as any,
      res: {} as any,
    });

    expect(ctx.user).toEqual({
      id: fakeAuthUser.id,
      email: "creator@example.com",
      name: "Profile Name",
      accountType: "brand",
    });

    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toEqual(ctx.user);
  });

  it("does not drop verified user to null when profile lookup fails", async () => {
    // Simulate database lookup failure (e.g. no profile row yet or trigger delay)
    vi.spyOn(dbModule, "getAccountProfile").mockRejectedValueOnce(
      new Error("Row not found in profiles")
    );

    const ctx = await createContext({
      req: { headers: { authorization: "Bearer valid-jwt-token" } } as any,
      res: {} as any,
    });

    // The user should still be authenticated with auth metadata, never null!
    expect(ctx.user).not.toBeNull();
    expect(ctx.user?.id).toBe(fakeAuthUser.id);
    expect(ctx.user?.email).toBe("creator@example.com");
    expect(ctx.user?.name).toBe("Test Creator");
    expect(ctx.user?.accountType).toBe("creator");

    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me?.id).toBe(fakeAuthUser.id);
  });

  it("handles token refresh by re-verifying updated bearer token", async () => {
    const refreshedUser = {
      ...fakeAuthUser,
      user_metadata: { name: "Updated Name", account_type: "brand" },
    };

    fakeClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: refreshedUser },
      error: null,
    });

    vi.spyOn(dbModule, "getAccountProfile").mockResolvedValueOnce({
      id: fakeAuthUser.id,
      display_name: "Updated Name",
      account_type: "brand",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const ctx = await createContext({
      req: { headers: { authorization: "Bearer refreshed-token-456" } } as any,
      res: {} as any,
    });

    expect(ctx.user?.name).toBe("Updated Name");
    expect(ctx.user?.accountType).toBe("brand");
  });

  it("handles logout by returning null for unauthenticated requests", async () => {
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: {} as any,
    });

    expect(ctx.user).toBeNull();

    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});
