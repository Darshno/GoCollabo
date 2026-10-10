import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { RequestSupabase } from "./supabase";
import {
  canCreateCollaboration,
  createBrief,
  createCollaboration,
  createPortfolioProject,
  deletePortfolioProject,
  getCreatorProfileForUser,
  getCreatorProfileIdForUser,
  listBriefsForBrand,
  listCollaborationsForUser,
  listCreators,
  listPortfolioProjects,
  listPublishedBriefs,
  listSavedCreators,
  removeSavedCreator,
  reorderPortfolioProjects,
  saveCreator,
  saveCreatorProfile,
  updateAccountType,
  updateBriefForBrand,
  updateCollaborationStatus,
  updatePortfolioProject,
} from "./db";

vi.mock("./db", () => ({
  canCreateCollaboration: vi.fn(),
  createBrief: vi.fn(),
  createCollaboration: vi.fn(),
  createPortfolioProject: vi.fn(),
  deletePortfolioProject: vi.fn(),
  getAccountProfile: vi.fn(),
  getCreatorById: vi.fn(),
  getCreatorProfileForUser: vi.fn(),
  getCreatorProfileIdForUser: vi.fn(),
  listBriefsForBrand: vi.fn(),
  listCollaborationsForUser: vi.fn(),
  listCreators: vi.fn(),
  listPortfolioProjects: vi.fn(),
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
}));

const CREATOR_UUID = "10000000-0000-4000-8000-000000000001";
const BRAND_UUID = "20000000-0000-4000-8000-000000000001";
const OTHER_BRAND_UUID = "20000000-0000-4000-8000-000000000002";

const fakeSupabase = {} as unknown as RequestSupabase;

function contextFor(
  user: TrpcContext["user"],
  supabase: RequestSupabase | null = fakeSupabase
): TrpcContext {
  return {
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user,
    supabase,
  };
}

const anonymous = () => contextFor(null);
const creator = () =>
  contextFor({
    id: CREATOR_UUID,
    email: "creator@example.test",
    name: "Creator",
    accountType: "creator",
  });
const brand = () =>
  contextFor({
    id: BRAND_UUID,
    email: "brand@example.test",
    name: "Brand",
    accountType: "brand",
  });

const projectPatch = { id: 7, title: "A project title" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(12);
  vi.mocked(createPortfolioProject).mockResolvedValue({ id: 7 } as never);
  vi.mocked(updatePortfolioProject).mockResolvedValue({ id: 7 } as never);
  vi.mocked(deletePortfolioProject).mockResolvedValue(true);
  vi.mocked(reorderPortfolioProjects).mockResolvedValue(true);
  vi.mocked(listPortfolioProjects).mockResolvedValue([]);
  vi.mocked(listCreators).mockResolvedValue([]);
  vi.mocked(listPublishedBriefs).mockResolvedValue([]);
  vi.mocked(updateAccountType).mockResolvedValue({
    id: BRAND_UUID,
    account_type: "brand",
  } as never);
  vi.mocked(createBrief).mockResolvedValue({ id: 5 } as never);
  vi.mocked(updateBriefForBrand).mockResolvedValue({
    kind: "updated",
    brief: { id: 5 },
  } as never);
  vi.mocked(listBriefsForBrand).mockResolvedValue([]);
  vi.mocked(canCreateCollaboration).mockResolvedValue(true);
  vi.mocked(createCollaboration).mockResolvedValue({ id: 3 } as never);
  vi.mocked(listCollaborationsForUser).mockResolvedValue([]);
  vi.mocked(updateCollaborationStatus).mockResolvedValue({
    kind: "updated",
  } as never);
  vi.mocked(saveCreator).mockResolvedValue({ id: 1 } as never);
  vi.mocked(listSavedCreators).mockResolvedValue([]);
  vi.mocked(removeSavedCreator).mockResolvedValue({ success: true } as never);
  vi.mocked(saveCreatorProfile).mockResolvedValue({ profile: {}, projects: [] } as never);
  vi.mocked(getCreatorProfileForUser).mockResolvedValue({
    profile: {},
    projects: [],
  } as never);
});

describe("authentication gate", () => {
  it("rejects every protected procedure when no verified Supabase user is present", async () => {
    const caller = appRouter.createCaller(anonymous());
    await expect(caller.auth.setAccountType({ accountType: "brand" })).rejects.toThrow(
      /Authentication required/
    );
    await expect(caller.marketplace.myBriefs()).rejects.toThrow(
      /Authentication required/
    );
    await expect(caller.marketplace.savedCreators()).rejects.toThrow(
      /Authentication required/
    );
    await expect(caller.marketplace.myProfile()).rejects.toThrow(
      /Authentication required/
    );
    await expect(caller.portfolio.projects()).rejects.toThrow(
      /Authentication required/
    );
    expect(createBrief).not.toHaveBeenCalled();
    expect(createPortfolioProject).not.toHaveBeenCalled();
  });

  it("still serves public discovery reads without a user", async () => {
    const caller = appRouter.createCaller(anonymous());
    await expect(caller.marketplace.creators()).resolves.toBeDefined();
    await expect(caller.auth.me()).resolves.toBeNull();
  });
});

describe("account type enforcement", () => {
  it("blocks brand-only procedures for a creator account", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(caller.marketplace.myBriefs()).rejects.toThrow(
      /Only brand accounts/
    );
    await expect(caller.marketplace.savedCreators()).rejects.toThrow(
      /Only brand accounts/
    );
    await expect(
      caller.briefs.assist({ idea: "I need a video for my brand" })
    ).rejects.toThrow(/Only brand accounts/);
    await expect(caller.briefs.capabilities()).rejects.toThrow(
      /Only brand accounts/
    );
    await expect(
      caller.marketplace.createBrief({
        title: "A valid brief title",
        objective: "A sufficiently long objective statement.",
        contentType: "Film",
        style: "Editorial",
        audience: "General",
        platform: "Site",
        duration: "30 seconds",
        aspectRatio: "16:9",
        deliverables: 1,
        budget: "$1000",
        deadline: "2026-12-01",
        location: "Remote",
        workMode: "remote",
        licensing: "Discuss",
      })
    ).rejects.toThrow(/Only brand accounts/);
    expect(createBrief).not.toHaveBeenCalled();
  });

  it("blocks creator-only procedures for a brand account", async () => {
    const caller = appRouter.createCaller(brand());
    await expect(caller.marketplace.myProfile()).rejects.toThrow(
      /Only creator accounts/
    );
    await expect(caller.portfolio.projects()).rejects.toThrow(
      /Only creator accounts/
    );
    await expect(caller.portfolio.capabilities()).rejects.toThrow(
      /Only creator accounts/
    );
    await expect(
      caller.marketplace.updateRequestStatus({ requestId: 3, status: "accepted" })
    ).rejects.toThrow(/Only creator accounts/);
    expect(listPortfolioProjects).not.toHaveBeenCalled();
    expect(updateCollaborationStatus).not.toHaveBeenCalled();
  });
});

describe("ownership is taken from the verified token, never from client input", () => {
  it("scopes a new brief to the caller's own brand UUID", async () => {
    const caller = appRouter.createCaller(brand());
    await caller.marketplace.createBrief({
      title: "A valid brief title",
      objective: "A sufficiently long objective statement.",
      contentType: "Film",
      style: "Editorial",
      audience: "General",
      platform: "Site",
      duration: "30 seconds",
      aspectRatio: "16:9",
      deliverables: 1,
      budget: "$1000",
      deadline: "2026-12-01",
      location: "Remote",
      workMode: "remote",
      licensing: "Discuss",
      // A client attempting to write into another brand's briefs.
      brandId: OTHER_BRAND_UUID,
    } as never);

    expect(createBrief).toHaveBeenCalledTimes(1);
    const [, brandId] = vi.mocked(createBrief).mock.calls[0];
    expect(brandId).toBe(BRAND_UUID);
  });

  it("scopes brief reads, saves and collaboration requests to the caller's brand", async () => {
    const caller = appRouter.createCaller(brand());
    await caller.marketplace.myBriefs();
    await caller.marketplace.savedCreators();
    await caller.marketplace.saveCreator({ creatorId: 12 });
    await caller.marketplace.removeSavedCreator({ creatorId: 12 });
    await caller.marketplace.collaborate({
      briefId: 5,
      creatorId: 12,
      message: "We would like to discuss a possible collaboration.",
    });

    expect(vi.mocked(listBriefsForBrand).mock.calls[0][1]).toBe(BRAND_UUID);
    expect(vi.mocked(listSavedCreators).mock.calls[0][1]).toBe(BRAND_UUID);
    expect(vi.mocked(saveCreator).mock.calls[0][1]).toBe(BRAND_UUID);
    expect(vi.mocked(removeSavedCreator).mock.calls[0][1]).toBe(BRAND_UUID);
    expect(vi.mocked(createCollaboration).mock.calls[0][1].brand_id).toBe(BRAND_UUID);
  });

  it("scopes the creator profile upsert to the authenticated user UUID", async () => {
    const caller = appRouter.createCaller(creator());
    const input = {
      slug: "creator-one",
      name: "Creator One",
      headline: "A sufficiently long professional headline",
      bio: "A sufficiently detailed creator biography for the profile.",
      location: "Remote",
      workMode: "remote",
      skills: "",
      tools: "",
      contentTypes: "",
      styles: "",
      experience: "4 years",
      formats: "",
      workflow: "",
      published: false,
    };
    await caller.marketplace.saveProfile(input);
    const [, userId] = vi.mocked(saveCreatorProfile).mock.calls[0];
    expect(userId).toBe(CREATOR_UUID);
  });

  it("resolves the creator profile id from the database rather than client input", async () => {
    const caller = appRouter.createCaller(creator());
    await caller.portfolio.projects();
    await caller.portfolio.deleteProject({ id: 7 });
    expect(getCreatorProfileIdForUser).toHaveBeenCalledWith(fakeSupabase, CREATOR_UUID);
    expect(vi.mocked(listPortfolioProjects).mock.calls[0][1]).toBe(12);
    expect(vi.mocked(deletePortfolioProject).mock.calls[0][1]).toBe(12);
  });

  it("refuses to set account type when Supabase is not configured", async () => {
    const caller = appRouter.createCaller(contextFor(
      {
        id: CREATOR_UUID,
        email: "creator@example.test",
        name: "Creator",
        accountType: "creator",
      },
      null
    ));
    await expect(caller.auth.setAccountType({ accountType: "brand" })).rejects.toThrow(
      /Supabase is not configured/
    );
    expect(updateAccountType).not.toHaveBeenCalled();
  });

  it("uses the database account type when listing collaborations", async () => {
    const creatorCaller = appRouter.createCaller(creator());
    await creatorCaller.marketplace.requests();
    expect(vi.mocked(listCollaborationsForUser).mock.calls[0][2]).toBe("creator");
    const brandCaller = appRouter.createCaller(brand());
    await brandCaller.marketplace.requests();
    expect(vi.mocked(listCollaborationsForUser).mock.calls[1][1]).toBe(BRAND_UUID);
  });
});

describe("portfolio studio media ownership", () => {
  it("rejects a media path owned by another account", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.portfolio.createProject({
        title: "A project title",
        description: "Source project details.",
        contentType: "Campaign",
        mediaPath: `${OTHER_BRAND_UUID}/9/file.png`,
        mediaName: "file.png",
        mediaType: "image/png",
        mediaSize: 1024,
      })
    ).rejects.toThrow(/Media path must belong to your account/);
    expect(createPortfolioProject).not.toHaveBeenCalled();
  });

  it("rejects path traversal segments in a media path", async () => {
    const caller = appRouter.createCaller(creator());
    for (const path of [
      `${CREATOR_UUID}/../${OTHER_BRAND_UUID}/file.png`,
      `${CREATOR_UUID}//file.png`,
      `${CREATOR_UUID}/9/../../file.png`,
    ]) {
      await expect(
        caller.portfolio.updateProject({
          id: 9,
          mediaPath: path,
          mediaName: "file.png",
          mediaType: "image/png",
          mediaSize: 1024,
        })
      ).rejects.toThrow(/Media path must belong to this project and account/);
    }
    expect(updatePortfolioProject).not.toHaveBeenCalled();
  });

  it("accepts a media path scoped to the caller and the project", async () => {
    const caller = appRouter.createCaller(creator());
    await caller.portfolio.updateProject({
      id: 9,
      mediaPath: `${CREATOR_UUID}/9/file.png`,
      mediaName: "file.png",
      mediaType: "image/png",
      mediaSize: 1024,
    });
    expect(updatePortfolioProject).toHaveBeenCalledTimes(1);
  });

  it("rejects a declared media size above the bucket limit", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.portfolio.createProject({
        title: "A project title",
        description: "Source project details.",
        contentType: "Campaign",
        mediaSize: 9 * 1024 * 1024,
      })
    ).rejects.toThrow();
    expect(createPortfolioProject).not.toHaveBeenCalled();
  });

  it("rejects a media type outside the allowed image list", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.portfolio.createProject({
        title: "A project title",
        description: "Source project details.",
        contentType: "Campaign",
        mediaType: "application/pdf",
      })
    ).rejects.toThrow();
    expect(createPortfolioProject).not.toHaveBeenCalled();
  });

  it("surfaces reorder rejection when the ids do not cover the caller's projects", async () => {
    vi.mocked(reorderPortfolioProjects).mockResolvedValue(false);
    const caller = appRouter.createCaller(creator());
    await expect(caller.portfolio.reorderProjects({ ids: [7, 8] })).rejects.toThrow(
      /Reorder must include each of your projects exactly once/
    );
  });

  it("reports a missing creator profile as a precondition failure", async () => {
    vi.mocked(getCreatorProfileIdForUser).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(creator());
    await expect(caller.portfolio.projects()).rejects.toThrow(
      /Create a creator profile before managing portfolio projects/
    );
  });
});

describe("collaboration request transitions", () => {
  it("maps a rejected request to NOT_FOUND and a settled request to CONFLICT", async () => {
    vi.mocked(updateCollaborationStatus).mockResolvedValue({
      kind: "not-found",
    } as never);
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.marketplace.updateRequestStatus({ requestId: 3, status: "accepted" })
    ).rejects.toThrow(/Request not found/);

    vi.mocked(updateCollaborationStatus).mockResolvedValue({
      kind: "invalid-transition",
    } as never);
    await expect(
      caller.marketplace.updateRequestStatus({ requestId: 3, status: "declined" })
    ).rejects.toThrow(/already been answered/);
  });

  it("does not create a request when the brief or creator is not eligible", async () => {
    vi.mocked(canCreateCollaboration).mockResolvedValue(false);
    const caller = appRouter.createCaller(brand());
    await expect(
      caller.marketplace.collaborate({
        briefId: 5,
        creatorId: 12,
        message: "We would like to discuss a possible collaboration.",
      })
    ).rejects.toThrow(/Published brief or creator not found/);
    expect(createCollaboration).not.toHaveBeenCalled();
  });

  it("does not save an unpublished or unknown creator", async () => {
    vi.mocked(saveCreator).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(brand());
    await expect(caller.marketplace.saveCreator({ creatorId: 12 })).rejects.toThrow(
      /Published creator not found/
    );
  });
});

describe("brief status transitions", () => {
  it("maps an invalid transition to CONFLICT and a missing brief to NOT_FOUND", async () => {
    vi.mocked(updateBriefForBrand).mockResolvedValue({
      kind: "invalid-transition",
    } as never);
    const caller = appRouter.createCaller(brand());
    await expect(
      caller.marketplace.updateBrief({ id: 5, status: "published" })
    ).rejects.toThrow(/Invalid brief status transition/);

    vi.mocked(updateBriefForBrand).mockResolvedValue({ kind: "not-found" } as never);
    await expect(
      caller.marketplace.updateBrief({ id: 5, status: "published" })
    ).rejects.toThrow(/Brief not found/);
  });

  it("rejects an update with no fields other than the id", async () => {
    const caller = appRouter.createCaller(brand());
    await expect(caller.marketplace.updateBrief({ id: 5 })).rejects.toThrow(
      /No brief changes supplied/
    );
    expect(updateBriefForBrand).not.toHaveBeenCalled();
  });

  it("rejects a project update with no fields other than the id", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(caller.portfolio.updateProject({ id: 7 })).rejects.toThrow(
      /No project changes supplied/
    );
    expect(updatePortfolioProject).not.toHaveBeenCalled();
  });

  it("does not inject creation defaults into a partial project update", async () => {
    // Regression: building the patch schema with `.partial()` over a schema that
    // carries `.default()` re-applies those defaults, which silently wiped
    // stored tools/media/flags whenever a caller only toggled `published`.
    const caller = appRouter.createCaller(creator());
    await caller.portfolio.updateProject({ id: 7, published: true });

    const patch = vi.mocked(updatePortfolioProject).mock.calls[0][3];
    expect(patch).toEqual({ published: true });
    expect(Object.keys(patch)).not.toContain("tools");
    expect(Object.keys(patch)).not.toContain("mediaPath");
    expect(Object.keys(patch)).not.toContain("isConcept");
  });

  it("does not inject creation defaults when clearing media fields", async () => {
    const caller = appRouter.createCaller(creator());
    await caller.portfolio.updateProject({
      id: 7,
      mediaPath: null,
      mediaName: null,
      mediaType: null,
      mediaSize: null,
    });

    const patch = vi.mocked(updatePortfolioProject).mock.calls[0][3];
    expect(patch).toEqual({
      media_path: null,
      media_name: null,
      media_type: null,
      media_size: null,
    });
  });
});

describe("portfolio AI assistance", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("reports that no provider is configured instead of inventing one", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.portfolio.assist({
        sourceNotes: "A detailed set of production notes for the project.",
      })
    ).rejects.toThrow(/No portfolio AI provider is configured/);
  });

  it("advertises AI as unavailable so manual editing stays the path", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(caller.portfolio.capabilities()).resolves.toEqual({
      aiConfigured: false,
      uploadsConfigured: true,
      maxUploadBytes: 8 * 1024 * 1024,
    });
  });
});

describe("brief AI assistance", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("requires authentication for brief AI assistance", async () => {
    const caller = appRouter.createCaller(anonymous());
    await expect(
      caller.briefs.assist({
        idea: "A campaign idea for a new product launch",
      })
    ).rejects.toThrow(/Authentication required/);
  });

  it("reports that no brief AI provider is configured instead of inventing one", async () => {
    const caller = appRouter.createCaller(brand());
    await expect(
      caller.briefs.assist({
        idea: "A launch video for our sustainable beauty brand.",
      })
    ).rejects.toThrow(/No brief AI provider is configured/);
  });

  it("advertises brief AI as unavailable when GEMINI_API_KEY is missing", async () => {
    const caller = appRouter.createCaller(brand());
    await expect(caller.briefs.capabilities()).resolves.toEqual({
      aiConfigured: false,
    });
  });

  it("advertises brief AI as available when GEMINI_API_KEY is present", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const caller = appRouter.createCaller(brand());
    await expect(caller.briefs.capabilities()).resolves.toEqual({
      aiConfigured: true,
    });
  });

  it("successfully generates brief draft through briefs.assist when configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch");
    const mockDraft = {
      title: "Eco Skincare Launch Video",
      objective: "Build organic awareness for new sustainable moisturizer.",
      targetAudience: "Gen Z & Millennials interested in sustainability",
      contentType: "Launch Video",
      creativeStyle: "Tactile & luminous",
      platform: "Instagram & TikTok",
      aspectRatio: "9:16",
      duration: "30-60 sec",
      deliverables: 2,
      budget: "",
      deadline: "",
      workMode: "remote",
      licensing: "",
      location: "Remote",
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockDraft) }] } }],
      }),
    } as Response);

    const caller = appRouter.createCaller(brand());
    const result = await caller.briefs.assist({
      idea: "I need a launch video for my sustainable skincare brand.",
    });

    expect(result.title).toBe("Eco Skincare Launch Video");
    expect(result.targetAudience).toBe("Gen Z & Millennials interested in sustainability");
    expect(result.contentType).toBe("Launch Video");
    expect(result.deliverables).toBe(2);
    expect(result.budget).toBe("");
    expect(result.deadline).toBe("");
    expect(result.licensing).toBe("");
  });

  it("rejects campaign ideas that are too short", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const caller = appRouter.createCaller(brand());
    await expect(caller.briefs.assist({ idea: "too" })).rejects.toThrow();
  });

  it("handles provider rate limits properly", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    } as Response);

    const caller = appRouter.createCaller(brand());
    await expect(
      caller.briefs.assist({ idea: "A brand launch campaign idea" })
    ).rejects.toThrow(/rate limit exceeded/);
  });

  it("handles malformed provider responses gracefully", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not-json" }] } }],
      }),
    } as Response);

    const caller = appRouter.createCaller(brand());
    await expect(
      caller.briefs.assist({ idea: "A brand launch campaign idea" })
    ).rejects.toThrow(/AI returned malformed output/);
  });
});

describe("input validation bounds", () => {
  it("requires a meaningful collaboration message", async () => {
    const caller = appRouter.createCaller(brand());
    await expect(
      caller.marketplace.collaborate({ briefId: 5, creatorId: 12, message: "hi" })
    ).rejects.toThrow();
    expect(createCollaboration).not.toHaveBeenCalled();
  });

  it("requires a sufficiently detailed creator bio", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.marketplace.saveProfile({
        slug: "creator-one",
        name: "Creator One",
        headline: "A sufficiently long professional headline",
        bio: "too short",
        location: "Remote",
        workMode: "remote",
        skills: "",
        tools: "",
        contentTypes: "",
        styles: "",
        experience: "4 years",
        formats: "",
        workflow: "",
        published: false,
      })
    ).rejects.toThrow();
    expect(saveCreatorProfile).not.toHaveBeenCalled();
  });

  it("caps the number of reordered project ids", async () => {
    const caller = appRouter.createCaller(creator());
    await expect(
      caller.portfolio.reorderProjects({ ids: Array.from({ length: 101 }, (_, i) => i + 1) })
    ).rejects.toThrow();
    expect(reorderPortfolioProjects).not.toHaveBeenCalled();
  });

  it("keeps the project patch helper exported for reuse", () => {
    expect(projectPatch.id).toBe(7);
  });
});