import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  canCreateCollaboration,
  createCollaboration,
  getUserByOpenId,
} from "./db";

vi.mock("./db", () => ({
  canCreateCollaboration: vi.fn(),
  createCollaboration: vi.fn(),
  getCreatorById: vi.fn(),
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  listCreators: vi.fn(),
  saveCreator: vi.fn(),
  upsertUser: vi.fn(),
}));

const ctx: TrpcContext = {
  user: {
    id: 7,
    openId: "brand-user",
    email: "brand@example.com",
    name: "Brand User",
    loginMethod: "manus",
    role: "user",
    accountType: "brand",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("marketplace.collaborate authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not create a request for a brief or creator the brand cannot access", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    vi.mocked(canCreateCollaboration).mockResolvedValue(false);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.marketplace.collaborate({
        briefId: 41,
        creatorId: 92,
        message: "We would like to discuss a possible collaboration.",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(canCreateCollaboration).toHaveBeenCalledWith(41, 7, 92);
    expect(createCollaboration).not.toHaveBeenCalled();
  });
});