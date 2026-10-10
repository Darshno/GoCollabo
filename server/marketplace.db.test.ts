import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  events: [] as string[],
  wherePredicates: [] as unknown[],
  insertError: undefined as Error | undefined,
  deleteAffectedRows: 1,
}));

const dbMock = {
  select: () => {
    state.events.push("select");
    const query: Record<string, (...args: any[]) => any> = {};
    query.from = () => query;
    query.where = condition => {
      state.events.push("where");
      state.wherePredicates.push(condition);
      return query;
    };
    query.innerJoin = () => query;
    query.limit = async () => state.selectResults.shift() || [];
    query.orderBy = () => query;
    query.then = (
      resolve: (value: unknown[]) => unknown,
      reject: (reason: unknown) => unknown
    ) =>
      Promise.resolve(state.selectResults.shift() || []).then(resolve, reject);
    return query;
  },
  insert: (_table: unknown) => ({
    values: (values: unknown) => {
      state.events.push(`insert:${JSON.stringify(values)}`);
      if (state.insertError) return Promise.reject(state.insertError);
      const result = Promise.resolve([{ insertId: 42 }]) as Promise<
        { insertId: number }[]
      > & {
        onDuplicateKeyUpdate?: (
          input: unknown
        ) => Promise<{ insertId: number }[]>;
      };
      result.onDuplicateKeyUpdate = () => result;
      return result;
    },
  }),
  update: (_table: unknown) => ({
    set: (values: unknown) => ({
      where: () => {
        state.events.push(`update:${JSON.stringify(values)}`);
        return Promise.resolve([{ affectedRows: 1 }]);
      },
    }),
  }),
  delete: (_table: unknown) => ({
    where: () => {
      state.events.push("delete");
      return Promise.resolve([{ affectedRows: state.deleteAffectedRows }]);
    },
  }),
  transaction: (callback: (tx: any) => Promise<unknown>) => callback(dbMock),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => dbMock }));

import {
  getCreatorById,
  createPortfolioProject,
  isValidBriefStatusTransition,
  createBrief,
  canCreateCollaboration,
  saveCreator,
  saveCreatorProfile,
  deletePortfolioProject,
  listPortfolioProjects,
  reorderPortfolioProjects,
  updatePortfolioProject,
  updateCollaborationStatus,
  updateBriefForBrand,
} from "./db";

const profile = {
  id: 17,
  userId: 7,
  slug: "framefoundry-7",
  name: "Frame Foundry",
  headline: "An independent creator",
  bio: "A creator profile with enough detail to be useful.",
  location: "Remote",
  workMode: "remote" as const,
  skills: "Direction",
  tools: "Runway",
  contentTypes: "Film",
  styles: "Cinematic",
  experience: "4 years",
  rates: null,
  formats: "16:9",
  workflow: "Plan, prototype, deliver.",
  verificationStatus: "self-reported" as const,
  availability: "available" as const,
  published: 0,
};

function sqlText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const sql = value as {
    queryChunks?: unknown[];
    value?: unknown[];
    name?: string;
  };
  if (Array.isArray(sql.queryChunks))
    return sql.queryChunks.map(sqlText).join(" ");
  if (Array.isArray(sql.value)) return sql.value.map(String).join(" ");
  return sql.name || "";
}

beforeEach(() => {
  state.selectResults.length = 0;
  state.events.length = 0;
  state.wherePredicates.length = 0;
  state.insertError = undefined;
  state.deleteAffectedRows = 1;
  vi.stubEnv("DATABASE_URL", "mysql://unit:unit@127.0.0.1:3306/framefoundry");
});

describe("marketplace database helpers", () => {
  it("updates the existing creator profile for its owner without inserting a duplicate", async () => {
    state.selectResults.push([{ id: profile.id }], [profile], []);

    const result = await saveCreatorProfile(7, {
      slug: "framefoundry",
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      workMode: profile.workMode,
      skills: profile.skills,
      tools: profile.tools,
      contentTypes: profile.contentTypes,
      styles: profile.styles,
      experience: profile.experience,
      rates: undefined,
      formats: profile.formats,
      workflow: profile.workflow,
      published: 0,
    });

    expect(result?.profile.id).toBe(profile.id);
    expect(state.events.some(event => event.startsWith("update:"))).toBe(true);
    expect(state.events.some(event => event.startsWith("insert:"))).toBe(false);
    expect(
      state.events.some(event => event.includes('"slug":"framefoundry-7"'))
    ).toBe(true);
  });

  it("inserts and reloads a new creator profile for the signed-in owner", async () => {
    state.selectResults.push([], [profile], []);

    const result = await saveCreatorProfile(7, {
      slug: "framefoundry",
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      workMode: profile.workMode,
      skills: profile.skills,
      tools: profile.tools,
      contentTypes: profile.contentTypes,
      styles: profile.styles,
      experience: profile.experience,
      rates: undefined,
      formats: profile.formats,
      workflow: profile.workflow,
      published: 1,
    });

    expect(result?.profile.published).toBe(0);
    expect(state.events.some(event => event.startsWith("insert:"))).toBe(true);
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);
  });

  it("does not overwrite another creator when a profile slug collides", async () => {
    state.selectResults.push([], []);
    state.insertError = new Error("Duplicate slug");

    await expect(
      saveCreatorProfile(7, {
        slug: "framefoundry",
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        workMode: profile.workMode,
        skills: profile.skills,
        tools: profile.tools,
        contentTypes: profile.contentTypes,
        styles: profile.styles,
        experience: profile.experience,
        rates: undefined,
        formats: profile.formats,
        workflow: profile.workflow,
        published: 1,
      })
    ).rejects.toThrow("Duplicate slug");
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);
  });

  it("does not load portfolio projects for a public unpublished profile", async () => {
    state.selectResults.push([]);

    await expect(getCreatorById(profile.id)).resolves.toBeUndefined();
    expect(state.events).toEqual(["select", "where"]);
    expect(state.selectResults).toHaveLength(0);
  });

  it("returns only published projects from a public creator profile", async () => {
    const publishedProject = {
      id: 62,
      creatorId: profile.id,
      title: "Published project",
      published: 1,
    };
    state.selectResults.push(
      [{ ...profile, published: 1 }],
      [publishedProject]
    );

    await expect(getCreatorById(profile.id)).resolves.toMatchObject({
      projects: [publishedProject],
    });

    expect(sqlText(state.wherePredicates[1])).toContain("published");
  });

  it("creates a private portfolio project under the resolved creator profile", async () => {
    const project = {
      id: 42,
      creatorId: 25,
      title: "Field study",
      description: "A real project description.",
      contentType: "Campaign",
      published: 0,
      sortOrder: 3,
    };
    state.selectResults.push([{ sortOrder: 2 }], [project]);

    await expect(
      createPortfolioProject(25, {
        title: project.title,
        description: project.description,
        contentType: project.contentType,
        imageUrl: null,
      })
    ).resolves.toEqual(project);
    expect(
      state.events.some(
        event =>
          event.includes('"creatorId":25') && event.includes('"published":0')
      )
    ).toBe(true);
  });

  it("does not update or delete a project when the creator does not own it", async () => {
    state.selectResults.push([]);
    await expect(
      updatePortfolioProject(25, 90, { title: "Not mine" })
    ).resolves.toBeUndefined();
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);

    state.deleteAffectedRows = 0;
    await expect(deletePortfolioProject(25, 90)).resolves.toBe(false);
  });

  it("reorders the complete owned project set transactionally", async () => {
    state.selectResults.push([{ id: 1 }, { id: 2 }]);

    await expect(reorderPortfolioProjects(25, [2, 1])).resolves.toBe(true);
    expect(
      state.events.filter(event => event.startsWith('update:{"sortOrder":'))
    ).toHaveLength(2);
  });

  it("rejects reordering that includes a project belonging to another creator", async () => {
    state.selectResults.push([{ id: 1 }, { id: 2 }]);

    await expect(reorderPortfolioProjects(25, [1, 99])).resolves.toBe(false);
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);
  });

  it("returns an existing brand save instead of inserting a duplicate", async () => {
    const saved = { id: 3, brandId: 12, creatorId: profile.id };
    state.selectResults.push([{ id: profile.id }], [saved]);

    await expect(saveCreator(12, profile.id)).resolves.toEqual(saved);
    expect(
      state.events.some(event => event.startsWith("insert:saved_creators:"))
    ).toBe(false);
  });

  it("does not update a brief that the brand does not own", async () => {
    state.selectResults.push([]);

    await expect(
      updateBriefForBrand(12, 88, { title: "Changed title" })
    ).resolves.toEqual({ kind: "not-found" });
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);
  });

  it("inserts a new brief and reloads it under its brand owner", async () => {
    const brief = { id: 42, brandId: 12, title: "A campaign" };
    state.selectResults.push([brief]);

    await expect(
      createBrief(12, {
        title: "A campaign",
        objective: "Introduce a new product to customers.",
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
    ).resolves.toEqual(brief);
    expect(state.events.some(event => event.startsWith("insert:"))).toBe(true);
  });

  it("does not allow a request to be answered twice", async () => {
    state.selectResults.push([{ id: 9, status: "accepted" }]);

    await expect(updateCollaborationStatus(23, 9, "declined")).resolves.toEqual(
      {
        kind: "invalid-transition",
      }
    );
    expect(state.events.some(event => event.startsWith("update:"))).toBe(false);
  });

  it("persists the first creator response to a pending request", async () => {
    state.selectResults.push([{ id: 9, status: "sent" }]);

    await expect(updateCollaborationStatus(23, 9, "accepted")).resolves.toEqual(
      {
        kind: "updated",
      }
    );
    expect(
      state.events.some(event =>
        event.startsWith('update:{"status":"accepted"}')
      )
    ).toBe(true);
  });

  it("requires an owned published brief and a published creator before collaboration", async () => {
    state.selectResults.push([{ id: 42 }], [{ id: 17 }]);
    await expect(canCreateCollaboration(42, 12, 17)).resolves.toBe(true);

    state.selectResults.push([]);
    await expect(canCreateCollaboration(88, 12, 17)).resolves.toBe(false);
  });

  it("permits only the supported brief status transitions", () => {
    expect(isValidBriefStatusTransition("draft", "published")).toBe(true);
    expect(isValidBriefStatusTransition("published", "closed")).toBe(true);
    expect(isValidBriefStatusTransition("closed", "published")).toBe(false);
    expect(isValidBriefStatusTransition("draft", "closed")).toBe(false);
  });
});
