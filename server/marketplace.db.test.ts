import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestSupabase } from "./supabase";
import {
  createPortfolioProject,
  getCreatorById,
  getCreatorProfileForUser,
  listBriefsForBrand,
  listPortfolioProjects,
  reorderPortfolioProjects,
  saveCreator,
  saveCreatorProfile,
  updateBriefForBrand,
  updatePortfolioProject,
} from "./db";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  operations: [] as Array<{ table: string; action: string; payload?: unknown; filters: unknown[] }>,
  nextId: 1000,
  duplicateSavedCreator: false,
}));

function fakeSupabase() {
  return {
    from(table: string) {
      let action = "select";
      let payload: unknown;
      const filters: Array<[string, unknown, string]> = [];
      const operation = () => {
        const rows = state.tables[table] || (state.tables[table] = []);
        const matches = (row: Record<string, unknown>) => filters.every(([key, value, type]) => {
          if (type === "in") return (value as unknown[]).includes(row[key]);
          return row[key] === value;
        });
        state.operations.push({ table, action, payload, filters });
        if (action === "insert") {
          const values = Array.isArray(payload) ? payload : [payload];
          if (table === "saved_creators" && state.duplicateSavedCreator)
            return { data: null, error: { code: "23505", message: "duplicate" } };
          const inserted = values.map(value => {
            const row = { id: state.nextId++, ...(value as object) };
            rows.push(row);
            return row;
          });
          return { data: inserted, error: null };
        }
        if (action === "upsert") {
          const values = Array.isArray(payload) ? payload : [payload];
          const inserted = values.map(value => {
            const input = value as Record<string, unknown>;
            const key = table === "creator_profiles" ? "user_id" : "id";
            const existing = rows.find(row => row[key] === input[key]);
            if (existing) Object.assign(existing, input);
            else rows.push({ id: state.nextId++, ...input });
            return existing || rows[rows.length - 1];
          });
          return { data: inserted, error: null };
        }
        if (action === "update") {
          const selected = rows.filter(matches);
          for (const row of selected) Object.assign(row, payload);
          return { data: selected, error: null };
        }
        if (action === "delete") {
          const deleted = rows.filter(matches);
          state.tables[table] = rows.filter(row => !matches(row));
          return { data: deleted, error: null };
        }
        return { data: rows.filter(matches), error: null };
      };
      const query: any = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value, "eq"]); return query; },
        in: (key: string, value: unknown[]) => { filters.push([key, value, "in"]); return query; },
        order: () => query,
        limit: () => query,
        insert: (value: unknown) => { action = "insert"; payload = value; return query; },
        upsert: (value: unknown) => { action = "upsert"; payload = value; return query; },
        update: (value: unknown) => { action = "update"; payload = value; return query; },
        delete: () => { action = "delete"; return query; },
        single: async () => { const response = operation(); return { ...response, data: Array.isArray(response.data) ? response.data[0] || null : response.data }; },
        maybeSingle: async () => { const response = operation(); return { ...response, data: Array.isArray(response.data) ? response.data[0] || null : response.data }; },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(operation()).then(resolve, reject),
      };
      return query;
    },
    storage: { from: () => ({ createSignedUrl: async (path: string) => ({ data: { signedUrl: `signed:${path}` }, error: null }) }) },
    rpc: async (_name: string, _args: unknown) => ({ data: true, error: null }),
  };
}

const creatorProfile = {
  id: 12,
  user_id: "10000000-0000-4000-8000-000000000001",
  slug: "creator-one",
  name: "Creator One",
  headline: "Independent creator",
  bio: "A sufficiently detailed creator bio.",
  location: "Remote",
  work_mode: "remote",
  skills: "Direction",
  tools: "Blender",
  content_types: "Film",
  styles: "Editorial",
  experience: "4 years",
  rates: null,
  formats: "16:9",
  workflow: "Plan, make, deliver",
  verification_status: "self-reported",
  availability: "available",
  published: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const project = (id: number, published: boolean) => ({
  id,
  creator_id: 12,
  title: `Project ${id}`,
  description: "Creator-provided work",
  content_type: "Campaign",
  tools: "Runway",
  skills: "Art direction",
  role: "Director",
  challenge: "A stated challenge",
  approach: "A stated approach",
  outcomes: "",
  impact_summary: "",
  media_path: null,
  media_name: null,
  media_type: null,
  media_size: null,
  is_concept: false,
  published,
  sort_order: id,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

beforeEach(() => {
  state.tables = {};
  state.operations = [];
  state.nextId = 1000;
  state.duplicateSavedCreator = false;
});

describe("Supabase marketplace data access", () => {
  it("filters unpublished creators and portfolio projects from public profiles", async () => {
    state.tables.creator_profiles = [{ ...creatorProfile }];
    state.tables.portfolio_projects = [project(101, true), project(102, false)];
    const result = await getCreatorById(fakeSupabase() as unknown as RequestSupabase, 12);

    expect(result?.projects.map(item => item.id)).toEqual([101]);
    const profileQuery = state.operations.find(operation => operation.table === "creator_profiles");
    expect(profileQuery?.filters).toContainEqual(["published", true, "eq"]);
    const projectQuery = state.operations.find(operation => operation.table === "portfolio_projects");
    expect(projectQuery?.filters).toContainEqual(["published", true, "eq"]);
  });

  it("returns no public profile when the creator profile is private", async () => {
    state.tables.creator_profiles = [{ ...creatorProfile, published: false }];
    state.tables.portfolio_projects = [project(101, true)];
    await expect(getCreatorById(fakeSupabase() as unknown as RequestSupabase, 12)).resolves.toBeUndefined();
    expect(state.operations.filter(operation => operation.table === "portfolio_projects")).toHaveLength(0);
  });

  it("loads all private and public projects only for the supplied owner profile", async () => {
    state.tables.portfolio_projects = [project(101, true), project(102, false), { ...project(103, true), creator_id: 99 }];
    const result = await listPortfolioProjects(fakeSupabase() as unknown as RequestSupabase, 12);
    expect(result).toHaveLength(2);
    expect(state.operations[0]?.filters).toContainEqual(["creator_id", 12, "eq"]);
  });

  it("upserts a creator profile using the authenticated Supabase user UUID", async () => {
    state.tables.creator_profiles = [];
    const client = fakeSupabase() as unknown as RequestSupabase;
    await saveCreatorProfile(client, creatorProfile.user_id, {
      slug: creatorProfile.slug,
      name: creatorProfile.name,
      headline: creatorProfile.headline,
      bio: creatorProfile.bio,
      location: creatorProfile.location,
      workMode: "remote",
      skills: creatorProfile.skills,
      tools: creatorProfile.tools,
      contentTypes: creatorProfile.content_types,
      styles: creatorProfile.styles,
      experience: creatorProfile.experience,
      rates: null,
      formats: creatorProfile.formats,
      workflow: creatorProfile.workflow,
      published: true,
    });
    expect(state.tables.creator_profiles[0]?.user_id).toBe(creatorProfile.user_id);
    expect(state.operations.some(operation => operation.action === "upsert")).toBe(true);
  });

  it("creates private projects and constrains project edits by both ID and owner", async () => {
    state.tables.portfolio_projects = [];
    const client = fakeSupabase() as unknown as RequestSupabase;
    const created = await createPortfolioProject(client, 12, {
      title: "New project",
      description: "Source project details.",
      content_type: "Campaign",
      tools: "",
      skills: "",
      role: "",
      challenge: "",
      approach: "",
      outcomes: "",
      impact_summary: "",
      media_path: null,
      media_name: null,
      media_type: null,
      media_size: null,
      is_concept: false,
    });
    expect(created.published).toBe(false);
    expect(created.creatorId).toBe(12);

    state.tables.portfolio_projects.push({ ...project(500, false), creator_id: 99 });
    const updated = await updatePortfolioProject(client, 12, 500, { title: "Not mine" });
    expect(updated).toBeUndefined();
    expect(state.tables.portfolio_projects.find(row => row.id === 500)?.title).toBe("Project 500");
  });

  it("scopes brief reads to the caller's brand and routes ordering through the RLS RPC", async () => {
    state.tables.briefs = [
      { id: 1, brand_id: "brand-a", title: "A" },
      { id: 2, brand_id: "brand-b", title: "B" },
    ];
    const client = fakeSupabase() as unknown as RequestSupabase;
    const rows = await listBriefsForBrand(client, "brand-a");
    expect(rows.map(row => row.id)).toEqual([1]);
    await expect(reorderPortfolioProjects(client, 12, [101])).resolves.toBe(true);
  });

  it("returns the existing saved creator when the unique constraint rejects a duplicate save", async () => {
    state.tables.creator_profiles = [{ ...creatorProfile }];
    state.duplicateSavedCreator = true;
    state.tables.saved_creators = [{ id: 70, brand_id: "20000000-0000-4000-8000-000000000001", creator_id: 12 }];
    const saved = await saveCreator(fakeSupabase() as unknown as RequestSupabase, "20000000-0000-4000-8000-000000000001", 12);
    expect(saved).toMatchObject({ id: 70, creator_id: 12 });
    expect(state.tables.saved_creators).toHaveLength(1);
  });
});
