import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  createPortfolioProject,
  canCreateCollaboration,
  createBrief,
  createCollaboration,
  getCreatorProfileForUser,
  getCreatorProfileIdForUser,
  getUserByOpenId,
  listBriefsForBrand,
  listCollaborationsForUser,
  listPortfolioProjects,
  listSavedCreators,
  removeSavedCreator,
  reorderPortfolioProjects,
  saveCreatorProfile,
  updateAccountType,
  updateBriefForBrand,
  updateCollaborationStatus,
  updatePortfolioProject,
  deletePortfolioProject,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

vi.mock("./db", () => ({
  canCreateCollaboration: vi.fn(),
  createPortfolioProject: vi.fn(),
  createBrief: vi.fn(),
  createCollaboration: vi.fn(),
  getCreatorById: vi.fn(),
  getCreatorProfileForUser: vi.fn(),
  getCreatorProfileIdForUser: vi.fn(),
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  listBriefsForBrand: vi.fn(),
  listCollaborationsForUser: vi.fn(),
  listPortfolioProjects: vi.fn(),
  listCreators: vi.fn(),
  listPublishedBriefs: vi.fn(),
  listSavedCreators: vi.fn(),
  removeSavedCreator: vi.fn(),
  reorderPortfolioProjects: vi.fn(),
  saveCreator: vi.fn(),
  saveCreatorProfile: vi.fn(),
  updateAccountType: vi.fn(),
  updateBriefForBrand: vi.fn(),
  updateCollaborationStatus: vi.fn(),
  updatePortfolioProject: vi.fn(),
  deletePortfolioProject: vi.fn(),
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
  afterEach(() => vi.unstubAllEnvs());

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

  it("persists an eligible collaboration request under the authenticated brand", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    vi.mocked(canCreateCollaboration).mockResolvedValue(true);
    const created = {
      id: 51,
      briefId: 41,
      creatorId: 92,
      brandId: 7,
      status: "sent",
    };
    vi.mocked(createCollaboration).mockResolvedValue(created as never);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.marketplace.collaborate({
        briefId: 41,
        creatorId: 92,
        message: "We would like to discuss a possible collaboration.",
      })
    ).resolves.toEqual(created);
    expect(createCollaboration).toHaveBeenCalledWith({
      briefId: 41,
      creatorId: 92,
      brandId: 7,
      message: "We would like to discuss a possible collaboration.",
      status: "sent",
    });
  });

  it("rejects collaboration requests from creator accounts", async () => {
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.marketplace.collaborate({
        briefId: 41,
        creatorId: 92,
        message: "We would like to discuss a possible collaboration.",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(getUserByOpenId).not.toHaveBeenCalled();
    expect(canCreateCollaboration).not.toHaveBeenCalled();
    expect(createCollaboration).not.toHaveBeenCalled();
  });

  it("lists only the current brand's briefs and saved creators", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    const caller = appRouter.createCaller(ctx);

    await caller.marketplace.myBriefs();
    await caller.marketplace.savedCreators();

    expect(listBriefsForBrand).toHaveBeenCalledWith(7);
    expect(listSavedCreators).toHaveBeenCalledWith(7);
  });

  it("removes only a saved creator belonging to the authenticated brand", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    const caller = appRouter.createCaller(ctx);

    await caller.marketplace.removeSavedCreator({ creatorId: 92 });

    expect(removeSavedCreator).toHaveBeenCalledWith(7, 92);
  });

  it("changes the current user's account type without accepting admin as a selectable type", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.setAccountType({ accountType: "creator" })
    ).resolves.toEqual({ accountType: "creator" });
    expect(updateAccountType).toHaveBeenCalledWith(7, "creator");
    await expect(
      caller.auth.setAccountType({ accountType: "admin" } as never)
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents creator accounts from using brand-only saved creator operations", async () => {
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(caller.marketplace.savedCreators()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.marketplace.removeSavedCreator({ creatorId: 92 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listSavedCreators).not.toHaveBeenCalled();
    expect(removeSavedCreator).not.toHaveBeenCalled();
  });

  it("uses the authenticated creator owner id for profile reload and save", async () => {
    const creatorContext = {
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    };
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileForUser).mockResolvedValue(undefined);
    vi.mocked(saveCreatorProfile).mockResolvedValue(undefined as never);
    const caller = appRouter.createCaller(creatorContext);

    await caller.marketplace.myProfile();
    await caller.marketplace.saveProfile({
      slug: "maker",
      name: "Maker",
      headline: "Independent visual maker",
      bio: "A profile description with enough detail to be valid.",
      location: "Remote",
      workMode: "remote",
      skills: "Direction",
      tools: "Runway",
      contentTypes: "Film",
      styles: "Cinematic",
      experience: "4 years",
      formats: "16:9",
      workflow: "Plan, prototype, deliver.",
      published: 1,
    });

    expect(getCreatorProfileForUser).toHaveBeenCalledWith(23);
    expect(saveCreatorProfile).toHaveBeenCalledWith(
      23,
      expect.objectContaining({ published: 1 })
    );
  });

  it("returns not found rather than updating a brief owned by another brand", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    vi.mocked(updateBriefForBrand).mockResolvedValue({ kind: "not-found" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.marketplace.updateBrief({ id: 88, title: "Not mine" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updateBriefForBrand).toHaveBeenCalledWith(7, 88, {
      title: "Not mine",
    });
  });

  it("persists a new brief under the authenticated brand id", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    const createdBrief = { id: 44, brandId: 7, title: "A campaign" };
    vi.mocked(createBrief).mockResolvedValue(createdBrief as never);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.marketplace.createBrief({
        title: "A campaign",
        objective: "Introduce the new product to customers.",
        contentType: "Brand film",
        style: "Cinematic",
        audience: "Designers",
        platform: "Site",
        duration: "30 seconds",
        aspectRatio: "16:9",
        deliverables: 1,
        budget: "$2k",
        deadline: "2026-11-01",
        location: "Remote",
        workMode: "remote",
        licensing: "Commercial use",
        status: "published",
      })
    ).resolves.toEqual(createdBrief);
    expect(createBrief).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ status: "published" })
    );
  });

  it("lists requests for the current brand and creator using their owner ids", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 7 } as never);
    const brandCaller = appRouter.createCaller(ctx);
    await brandCaller.marketplace.requests();
    expect(listCollaborationsForUser).toHaveBeenCalledWith(7, "brand");

    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    const creatorCaller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });
    await creatorCaller.marketplace.requests();
    expect(listCollaborationsForUser).toHaveBeenCalledWith(23, "creator");
  });

  it("lets the request's creator accept once and rejects already answered requests", async () => {
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(updateCollaborationStatus)
      .mockResolvedValueOnce({ kind: "updated" })
      .mockResolvedValueOnce({ kind: "invalid-transition" });

    await expect(
      caller.marketplace.updateRequestStatus({
        requestId: 9,
        status: "accepted",
      })
    ).resolves.toEqual({ success: true });
    await expect(
      caller.marketplace.updateRequestStatus({
        requestId: 9,
        status: "declined",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(updateCollaborationStatus).toHaveBeenNthCalledWith(
      1,
      23,
      9,
      "accepted"
    );
  });

  it("rejects portfolio access for non-creator accounts", async () => {
    const caller = appRouter.createCaller(ctx);

    await expect(caller.portfolio.projects()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getCreatorProfileIdForUser).not.toHaveBeenCalled();
    expect(listPortfolioProjects).not.toHaveBeenCalled();
  });

  it("lists portfolio projects using the signed-in creator's profile ID", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(listPortfolioProjects).mockResolvedValue([]);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(caller.portfolio.projects()).resolves.toEqual([]);
    expect(getCreatorProfileIdForUser).toHaveBeenCalledWith(23);
    expect(listPortfolioProjects).toHaveBeenCalledWith(55);
  });

  it("denies editing a portfolio project owned by another creator", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(updatePortfolioProject).mockResolvedValue(undefined);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.updateProject({ id: 99, title: "Not mine" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(updatePortfolioProject).toHaveBeenCalledWith(55, 99, {
      title: "Not mine",
    });
  });

  it("updates and deletes a project using the authenticated creator owner ID", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(updatePortfolioProject).mockResolvedValue({
      id: 99,
      creatorId: 55,
      title: "Updated project",
    } as never);
    vi.mocked(deletePortfolioProject).mockResolvedValue(true);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.updateProject({ id: 99, title: "Updated project" })
    ).resolves.toMatchObject({ title: "Updated project" });
    await expect(caller.portfolio.deleteProject({ id: 99 })).resolves.toEqual({
      success: true,
    });
    expect(updatePortfolioProject).toHaveBeenCalledWith(
      55,
      99,
      expect.objectContaining({ title: "Updated project" })
    );
    expect(deletePortfolioProject).toHaveBeenCalledWith(55, 99);
  });

  it("rejects portfolio reorder requests containing projects outside the creator's list", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(reorderPortfolioProjects).mockResolvedValue(false);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.reorderProjects({ ids: [1, 999] })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(reorderPortfolioProjects).toHaveBeenCalledWith(55, [1, 999]);
  });

  it("persists project media metadata only under the authenticated creator", async () => {
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    const stored = {
      id: 6,
      creatorId: 55,
      title: "Product film",
      mediaKey: "portfolio/55/asset.png",
      mediaName: "asset.png",
      mediaType: "image/png",
      mediaSize: 1024,
      published: 0,
    };
    vi.mocked(createPortfolioProject).mockResolvedValue(stored as never);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.createProject({
        title: "Product film",
        description: "A product film built from user-provided project details.",
        contentType: "Campaign",
        imageUrl: "/manus-storage/portfolio/55/asset.png",
        mediaKey: "portfolio/55/asset.png",
        mediaName: "asset.png",
        mediaType: "image/png",
        mediaSize: 1024,
      })
    ).resolves.toMatchObject({ published: 0 });
    expect(createPortfolioProject).toHaveBeenCalledWith(
      55,
      expect.objectContaining({ mediaKey: "portfolio/55/asset.png" })
    );
  });

  it("returns an explicit unavailable error instead of faking a media upload", async () => {
    vi.stubEnv("MANUS_API_URL", "");
    vi.stubEnv("MANUS_API_KEY", "");
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.uploadMedia({
        fileName: "cover.png",
        mimeType: "image/png",
        size: 8,
        dataBase64: "iVBORw0KGgo=",
      })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("uploads supported media through managed storage and returns persisted metadata", async () => {
    vi.stubEnv("MANUS_API_URL", "https://storage.example");
    vi.stubEnv("MANUS_API_KEY", "unit-test-key");
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(storagePut).mockResolvedValue({
      key: "portfolio/55/object.png",
      url: "/manus-storage/portfolio/55/object.png",
    });
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.uploadMedia({
        fileName: "cover.png",
        mimeType: "image/png",
        size: 8,
        dataBase64: "iVBORw0KGgo=",
      })
    ).resolves.toMatchObject({
      key: "portfolio/55/object.png",
      fileName: "cover.png",
      mimeType: "image/png",
      size: 8,
    });
    expect(storagePut).toHaveBeenCalledWith(
      expect.stringMatching(/^portfolio\/55\//),
      expect.any(Buffer),
      "image/png"
    );
  });

  it("rejects media bytes that do not match their declared MIME type", async () => {
    vi.stubEnv("MANUS_API_URL", "https://storage.example");
    vi.stubEnv("MANUS_API_KEY", "unit-test-key");
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.uploadMedia({
        fileName: "cover.png",
        mimeType: "image/png",
        size: 5,
        dataBase64: "aGVsbG8=",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("reports AI unavailable without configuration and does not call the provider", async () => {
    vi.stubEnv("MANUS_API_URL", "");
    vi.stubEnv("MANUS_API_KEY", "");
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.assist({
        sourceNotes: "A project note from the creator.",
      })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns generated portfolio text as an unpersisted review draft", async () => {
    vi.stubEnv("MANUS_API_URL", "https://llm.example");
    vi.stubEnv("MANUS_API_KEY", "unit-test-key");
    vi.mocked(getUserByOpenId).mockResolvedValue({ id: 23 } as never);
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(55);
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "Creator-provided project",
              description: "A concise description based on supplied details.",
              challenge: "The challenge provided by the creator.",
              approach: "The approach provided by the creator.",
              outcomes: "No outcome was specified in the source information.",
              impactSummary: "Impact not specified.",
              skills: ["Art direction"],
            }),
          },
        },
      ],
    } as never);
    const caller = appRouter.createCaller({
      ...ctx,
      user: { ...ctx.user!, accountType: "creator" },
    });

    await expect(
      caller.portfolio.assist({
        title: "A real project",
        sourceNotes: "The creator supplied this project background.",
      })
    ).resolves.toMatchObject({
      title: "Creator-provided project",
      isDraft: true,
    });
    expect(createPortfolioProject).not.toHaveBeenCalled();
    expect(updatePortfolioProject).not.toHaveBeenCalled();
  });
});
