import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";
import {
  clearProjectsStore,
  getOrCreateProjectForCollaboration,
  getProjectById,
  listProjectsForUser,
  updateProjectTaskStatus,
  addTasksToProject,
  submitDeliverable,
  reviewDeliverable,
  setProjectsStoragePath,
  reloadProjectsStore,
} from "./projects";
import type { RequestSupabase } from "./supabase";

const TEST_STORAGE_PATH = path.resolve(process.cwd(), ".data", "test-projects-store.json");

function createMockSupabase(overrides?: {
  request?: Record<string, unknown>;
  brief?: Record<string, unknown>;
  creator?: Record<string, unknown>;
  brand?: Record<string, unknown>;
}): RequestSupabase {
  const reqData = {
    id: 42,
    brief_id: 10,
    brand_id: "brand-user-123",
    creator_id: 5,
    message: "Let's collaborate on this brand film",
    status: "accepted",
    created_at: "2026-10-10T10:00:00Z",
    updated_at: "2026-10-10T10:05:00Z",
    ...overrides?.request,
  };

  const briefData = {
    id: 10,
    brand_id: "brand-user-123",
    title: "Eco Apparel Spring Launch",
    objective: "Create tactile, cinematic launch film for sustainable fashion line.",
    content_type: "Brand Film",
    style: "Cinematic, textural, warm",
    audience: "Conscious urban consumers",
    platform: "Instagram + Site",
    duration: "45 sec",
    aspect_ratio: "16:9 + 9:16",
    deliverables: 2,
    budget: "₹3,50,000",
    deadline: "Nov 30, 2026",
    location: "Mumbai, IN",
    work_mode: "remote",
    licensing: "Full digital commercial rights",
    status: "published",
    created_at: "2026-10-09T10:00:00Z",
    updated_at: "2026-10-09T10:00:00Z",
    ...overrides?.brief,
  };

  const creatorData = {
    id: 5,
    user_id: "creator-user-456",
    slug: "ananya-sharma",
    name: "Ananya Sharma",
    headline: "Visual director",
    published: true,
    created_at: "2026-10-08T10:00:00Z",
    updated_at: "2026-10-08T10:00:00Z",
    ...overrides?.creator,
  };

  const brandData = {
    id: "brand-user-123",
    display_name: "Eco Apparel Co.",
    account_type: "brand",
    created_at: "2026-10-08T10:00:00Z",
    updated_at: "2026-10-08T10:00:00Z",
    ...overrides?.brand,
  };

  return {
    from(table: string) {
      let filterCol = "";
      let filterVal: unknown = null;

      return {
        select() {
          return this;
        },
        eq(col: string, val: unknown) {
          filterCol = col;
          filterVal = val;
          return this;
        },
        async maybeSingle() {
          if (table === "collaboration_requests") {
            if (filterCol === "id" && filterVal === reqData.id) {
              return { data: reqData, error: null };
            }
            return { data: null, error: null };
          }
          if (table === "briefs") {
            if (filterCol === "id" && filterVal === briefData.id) {
              return { data: briefData, error: null };
            }
            return { data: null, error: null };
          }
          if (table === "creator_profiles") {
            if (filterCol === "id" && filterVal === creatorData.id) {
              return { data: creatorData, error: null };
            }
            return { data: null, error: null };
          }
          if (table === "profiles") {
            if (filterCol === "id" && filterVal === brandData.id) {
              return { data: brandData, error: null };
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        },
      };
    },
  } as unknown as RequestSupabase;
}

describe("Shared Projects & Task Persistence", () => {
  beforeEach(() => {
    setProjectsStoragePath(TEST_STORAGE_PATH);
    clearProjectsStore();
  });

  afterEach(() => {
    clearProjectsStore();
    setProjectsStoragePath(null);
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      try {
        fs.unlinkSync(TEST_STORAGE_PATH);
      } catch {}
    }
  });

  it("creates a shared project when collaboration request is accepted", async () => {
    const client = createMockSupabase();
    const project = await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");

    expect(project.id).toBe(42);
    expect(project.requestId).toBe(42);
    expect(project.briefId).toBe(10);
    expect(project.title).toBe("Eco Apparel Spring Launch");
    expect(project.brandId).toBe("brand-user-123");
    expect(project.brandName).toBe("Eco Apparel Co.");
    expect(project.creatorUserId).toBe("creator-user-456");
    expect(project.creatorName).toBe("Ananya Sharma");
    expect(project.status).toBe("active");

    // Brief requirements mapped
    expect(project.brief.style).toBe("Cinematic, textural, warm");
    expect(project.brief.duration).toBe("45 sec");
    expect(project.brief.aspectRatio).toBe("16:9 + 9:16");
    expect(project.brief.budget).toBe("₹3,50,000");

    // Tasks populated from brief
    expect(project.tasks.length).toBeGreaterThanOrEqual(4);
    expect(project.tasks[0].title).toContain("alignment");
    expect(project.tasks[1].title).toContain("draft");
    expect(project.tasks[1].deadline).toBe("Nov 30, 2026");
  });

  it("is strictly idempotent — subsequent calls return existing project without duplicating tasks", async () => {
    const client = createMockSupabase();
    const first = await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");
    const initialTaskCount = first.tasks.length;

    // Call again for brand participant
    const second = await getOrCreateProjectForCollaboration(client, 42, "brand-user-123");
    expect(second.id).toBe(first.id);
    expect(second.tasks.length).toBe(initialTaskCount);
  });

  it("enforces participant access security — rejects unrelated users", async () => {
    const client = createMockSupabase();
    await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");

    await expect(
      getProjectById(client, 42, "unrelated-user-999")
    ).rejects.toThrow(TRPCError);

    await expect(
      getOrCreateProjectForCollaboration(client, 42, "unrelated-user-999")
    ).rejects.toThrow(/not an authorized participant/i);
  });

  it("persists task status updates across operations", async () => {
    const client = createMockSupabase();
    const project = await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");
    const targetTaskId = project.tasks[1].id;

    // Creator updates task status
    const updated = await updateProjectTaskStatus(42, targetTaskId, "done", "creator-user-456");
    expect(updated.tasks.find(t => t.id === targetTaskId)?.status).toBe("done");

    // Brand reads project and sees updated task status
    const reloaded = await getProjectById(client, 42, "brand-user-123");
    expect(reloaded.tasks.find(t => t.id === targetTaskId)?.status).toBe("done");
  });

  it("persists newly added tasks (manual and AI Copilot source)", async () => {
    const client = createMockSupabase();
    await getOrCreateProjectForCollaboration(client, 42, "brand-user-123");

    const withNewTasks = await addTasksToProject(
      42,
      [
        {
          title: "Color grade grade pass for evening light",
          description: "Adjust golden hour warmth per client feedback",
          priority: "high",
          source: "ai_copilot",
        },
      ],
      "brand-user-123"
    );

    const added = withNewTasks.tasks.find(t => t.title.includes("Color grade"));
    expect(added).toBeDefined();
    expect(added?.priority).toBe("high");
    expect(added?.source).toBe("ai_copilot");
    expect(added?.status).toBe("todo");
  });

  it("supports deliverable submission by creator and review by brand", async () => {
    const client = createMockSupabase();
    await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");

    // Non-creator cannot submit deliverable
    await expect(
      submitDeliverable(42, { title: "Draft cut", notes: "First cut" }, "brand-user-123")
    ).rejects.toThrow(/only creators can submit/i);

    // Creator submits deliverable v1
    const withDeliv = await submitDeliverable(
      42,
      {
        title: "Draft Cut v1",
        notes: "Here is the first 45s cut with original soundtrack.",
        assetUrl: "https://example.com/asset-v1.mp4",
      },
      "creator-user-456"
    );

    expect(withDeliv.deliverables).toHaveLength(1);
    expect(withDeliv.deliverables[0].version).toBe(1);
    expect(withDeliv.deliverables[0].status).toBe("pending_review");
    expect(withDeliv.status).toBe("in_review");

    const delivId = withDeliv.deliverables[0].id;

    // Creator cannot review own deliverable
    await expect(
      reviewDeliverable(42, delivId, { status: "approved" }, "creator-user-456")
    ).rejects.toThrow(/only brand partners can review/i);

    // Brand requests changes with feedback
    const reviewed = await reviewDeliverable(
      42,
      delivId,
      {
        status: "changes_requested",
        feedback: "Loved the intro pacing. Please soften transitions in the middle third.",
      },
      "brand-user-123"
    );

    expect(reviewed.deliverables[0].status).toBe("changes_requested");
    expect(reviewed.deliverables[0].feedback).toContain("soften transitions");
    expect(reviewed.status).toBe("active");
  });

  it("is durable — project and task state survive reload from disk", async () => {
    const client = createMockSupabase();
    const created = await getOrCreateProjectForCollaboration(client, 42, "creator-user-456");

    // Modify a task and add a custom task
    const taskId = created.tasks[0].id;
    await updateProjectTaskStatus(42, taskId, "done", "creator-user-456");
    await addTasksToProject(
      42,
      [{ title: "Custom audio mixdown", priority: "medium", source: "manual" }],
      "creator-user-456"
    );

    // Verify file exists on disk
    expect(fs.existsSync(TEST_STORAGE_PATH)).toBe(true);

    // Simulate process restart by reloading store from disk
    reloadProjectsStore();

    // Verify rehydrated state matches
    const rehydrated = await getProjectById(client, 42, "brand-user-123");
    expect(rehydrated.id).toBe(42);
    expect(rehydrated.tasks.find(t => t.id === taskId)?.status).toBe("done");
    expect(rehydrated.tasks.find(t => t.title === "Custom audio mixdown")).toBeDefined();
  });

  describe("Authoritative Supabase Persistence Layer (Mocked DB Driver)", () => {
    function createAuthoritativeMockSupabase(options?: {
      simulateQueryError?: boolean;
      simulateInsertError?: boolean;
    }) {
      const dbProjects: any[] = [];
      const dbTasks: any[] = [];
      const dbDeliverables: any[] = [];

      const reqData = {
        id: 100,
        brief_id: 20,
        brand_id: "brand-corp-99",
        creator_id: 7,
        message: "Excited to partner on this launch campaign",
        status: "accepted",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:05:00Z",
      };

      const briefData = {
        id: 20,
        brand_id: "brand-corp-99",
        title: "Autumn Capsule Film",
        objective: "Atmospheric 4K showcase",
        content_type: "Brand Film",
        style: "Moody, tactile, 35mm grain",
        audience: "Creative professionals",
        platform: "Instagram & Cinema",
        duration: "60 sec",
        aspect_ratio: "2.39:1",
        deliverables: 2,
        budget: "₹5,00,000",
        deadline: "Dec 15, 2026",
        location: "Bengaluru, IN",
        work_mode: "hybrid",
        licensing: "Full commercial global buy-out",
        status: "published",
        created_at: "2026-10-09T10:00:00Z",
        updated_at: "2026-10-09T10:00:00Z",
      };

      const creatorData = {
        id: 7,
        user_id: "creator-artist-88",
        slug: "rohan-sen",
        name: "Rohan Sen",
        headline: "Cinematographer & Colorist",
        published: true,
        created_at: "2026-10-08T10:00:00Z",
        updated_at: "2026-10-08T10:00:00Z",
      };

      const brandData = {
        id: "brand-corp-99",
        display_name: "Capsule Studio",
        account_type: "brand",
        created_at: "2026-10-08T10:00:00Z",
        updated_at: "2026-10-08T10:00:00Z",
      };

      return {
        _db: { dbProjects, dbTasks, dbDeliverables },
        from(table: string) {
          let filters: Record<string, any> = {};
          let updatePayload: any = null;

          return {
            select() {
              return this;
            },
            eq(col: string, val: any) {
              filters[col] = val;
              return this;
            },
            async maybeSingle() {
              if (options?.simulateQueryError && table === "projects") {
                return { data: null, error: { message: "connection to server terminated", code: "57P01" } };
              }
              if (table === "collaboration_requests") {
                if (filters.id === reqData.id) return { data: reqData, error: null };
                return { data: null, error: null };
              }
              if (table === "briefs") {
                if (filters.id === briefData.id) return { data: briefData, error: null };
                return { data: null, error: null };
              }
              if (table === "creator_profiles") {
                if (filters.id === creatorData.id || filters.user_id === creatorData.user_id) {
                  return { data: creatorData, error: null };
                }
                return { data: null, error: null };
              }
              if (table === "profiles") {
                if (filters.id === brandData.id) return { data: brandData, error: null };
                return { data: null, error: null };
              }
              if (table === "projects") {
                const found = dbProjects.find(p =>
                  (filters.request_id !== undefined && p.request_id === filters.request_id) ||
                  (filters.id !== undefined && p.id === filters.id)
                );
                return { data: found || null, error: null };
              }
              return { data: null, error: null };
            },
            update(payload: any) {
              updatePayload = payload;
              return this;
            },
            then(resolve: any) {
              if (updatePayload) {
                if (table === "project_tasks") {
                  const task = dbTasks.find(t => t.id === filters.id);
                  if (task) Object.assign(task, updatePayload);
                  resolve({ data: task, error: null });
                  return;
                }
                if (table === "project_deliverables") {
                  const deliv = dbDeliverables.find(d => d.id === filters.id);
                  if (deliv) Object.assign(deliv, updatePayload);
                  resolve({ data: deliv, error: null });
                  return;
                }
                if (table === "projects") {
                  const proj = dbProjects.find(p => p.id === filters.id);
                  if (proj) Object.assign(proj, updatePayload);
                  resolve({ data: proj, error: null });
                  return;
                }
                resolve({ data: null, error: null });
                return;
              }
              // Promise resolution for .select()
              if (table === "project_tasks") {
                const matched = dbTasks.filter(t => !filters.project_id || t.project_id === filters.project_id);
                resolve({ data: matched, error: null });
              } else if (table === "project_deliverables") {
                const matched = dbDeliverables.filter(d => !filters.project_id || d.project_id === filters.project_id);
                resolve({ data: matched, error: null });
              } else if (table === "collaboration_requests") {
                resolve({ data: [reqData], error: null });
              } else {
                resolve({ data: [], error: null });
              }
            },
            async insert(payload: any) {
              if (options?.simulateInsertError) {
                return { data: null, error: { message: "database constraint violation", code: "23503" } };
              }
              if (table === "projects") {
                const row = Array.isArray(payload) ? payload[0] : payload;
                if (dbProjects.some(p => p.request_id === row.request_id)) {
                  return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
                }
                dbProjects.push({ ...row });
                return { data: [row], error: null };
              }
              if (table === "project_tasks") {
                const rows = Array.isArray(payload) ? payload : [payload];
                dbTasks.push(...rows);
                return { data: rows, error: null };
              }
              if (table === "project_deliverables") {
                const row = Array.isArray(payload) ? payload[0] : payload;
                dbDeliverables.push(row);
                return { data: [row], error: null };
              }
              return { data: null, error: null };
            },
          };
        },
        async rpc(fn: string, args: any) {
          if (fn === "create_project_with_tasks") {
            if (options?.simulateInsertError) {
              return { data: null, error: { message: "database constraint violation", code: "23503" } };
            }
            // Idempotency check
            if (dbProjects.some(p => p.request_id === args.p_request_id)) {
              return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
            }
            // Simulate atomic insert of project + tasks
            const projectRow = {
              id: args.p_request_id,
              request_id: args.p_request_id,
              brief_id: args.p_brief_id,
              brand_id: args.p_brand_id,
              creator_id: args.p_creator_id,
              status: "active",
            };
            dbProjects.push(projectRow);
            if (Array.isArray(args.p_tasks)) {
              for (const t of args.p_tasks) {
                dbTasks.push({ ...t, project_id: args.p_request_id });
              }
            }
            return { data: args.p_request_id, error: null };
          }
          return { data: null, error: null };
        },
      } as unknown as RequestSupabase & { _db: any };
    }

    it("persists project and tasks directly into Supabase tables on creation", async () => {
      const client = createAuthoritativeMockSupabase();
      const project = await getOrCreateProjectForCollaboration(client, 100, "creator-artist-88");

      expect(project.id).toBe(100);
      expect(project.title).toBe("Autumn Capsule Film");
      expect(client._db.dbProjects).toHaveLength(1);
      expect(client._db.dbProjects[0].request_id).toBe(100);
      expect(client._db.dbTasks.length).toBeGreaterThan(0);
    });

    it("idempotently handles concurrent retries when Postgres code 23505 (unique collision) occurs", async () => {
      const client = createAuthoritativeMockSupabase();

      // Pre-populate project in db to trigger code 23505 on insert retry
      client._db.dbProjects.push({
        id: 100,
        request_id: 100,
        brief_id: 20,
        brand_id: "brand-corp-99",
        creator_id: 7,
        status: "active",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      });

      // Clear memory cache to simulate concurrent worker
      clearProjectsStore();

      // Should succeed cleanly using existing database project row
      const project = await getOrCreateProjectForCollaboration(client, 100, "creator-artist-88");
      expect(project.id).toBe(100);
      expect(project.brandId).toBe("brand-corp-99");
    });

    it("propagates genuine database query errors instead of silently masking them with demo data", async () => {
      const failingClient = createAuthoritativeMockSupabase({ simulateQueryError: true });
      clearProjectsStore();

      await expect(
        getOrCreateProjectForCollaboration(failingClient, 100, "creator-artist-88")
      ).rejects.toThrow(/database error querying project/i);
    });

    it("enforces participant authorization and denies unauthorized actors", async () => {
      const client = createAuthoritativeMockSupabase();
      await expect(
        getOrCreateProjectForCollaboration(client, 100, "unauthorized-stranger")
      ).rejects.toThrow(/not an authorized participant/i);
    });

    it("persists deliverable submission and approval workflow in Supabase", async () => {
      const client = createAuthoritativeMockSupabase();
      await getOrCreateProjectForCollaboration(client, 100, "creator-artist-88");

      // Creator submits deliverable
      const withDeliv = await submitDeliverable(
        client,
        100,
        { title: "First Rough Cut", notes: "Color grade match", assetUrl: "https://example.com/cut1.mov" },
        "creator-artist-88"
      );

      expect(client._db.dbDeliverables).toHaveLength(1);
      expect(client._db.dbDeliverables[0].title).toBe("First Rough Cut");
      expect(client._db.dbDeliverables[0].status).toBe("pending_review");

      // Brand reviews deliverable
      const delivId = withDeliv.deliverables[0].id;
      const approved = await reviewDeliverable(
        client,
        100,
        delivId,
        { status: "approved" },
        "brand-corp-99"
      );

      expect(approved.deliverables[0].status).toBe("approved");
      expect(client._db.dbDeliverables[0].status).toBe("approved");
    });
  });
});
