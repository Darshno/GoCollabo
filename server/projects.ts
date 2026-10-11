import fs from "fs";
import path from "path";
import { TRPCError } from "@trpc/server";
import type { RequestSupabase } from "./supabase";
import type { BriefRow, CreatorProfileRow, ProfileRow, CollaborationRequestRow } from "../shared/database.types";

export type ProjectTask = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "high" | "medium" | "low";
  deadline?: string;
  source: "brief" | "manual" | "ai_copilot";
};

export type ProjectDeliverable = {
  id: string;
  version: number;
  title: string;
  notes: string;
  assetUrl?: string;
  submittedAt: string;
  status: "pending_review" | "changes_requested" | "approved";
  feedback?: string;
  reviewedAt?: string;
};

export type SharedProject = {
  id: number;
  requestId: number;
  briefId: number;
  brandId: string;
  brandName: string;
  creatorId: number;
  creatorUserId: string;
  creatorName: string;
  title: string;
  status: "active" | "in_review" | "completed";
  brief: {
    title: string;
    objective: string;
    contentType: string;
    style: string;
    audience: string;
    platform: string;
    duration: string;
    aspectRatio: string;
    deliverables: number;
    budget: string;
    deadline: string;
    location: string;
    workMode: string;
    licensing: string;
  };
  tasks: ProjectTask[];
  deliverables: ProjectDeliverable[];
  createdAt: string;
  updatedAt: string;
};

// Persistent fallback storage setup
let storageFilePath: string | null = path.resolve(process.cwd(), ".data", "projects-store.json");

// Project cache in memory
const projectsStore = new Map<number, SharedProject>();

export function setProjectsStoragePath(customPath: string | null) {
  storageFilePath = customPath;
  reloadProjectsStore();
}

export function reloadProjectsStore() {
  projectsStore.clear();
  if (!storageFilePath) return;
  try {
    if (fs.existsSync(storageFilePath)) {
      const raw = fs.readFileSync(storageFilePath, "utf8");
      const list: SharedProject[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const p of list) {
          if (p && typeof p.id === "number") {
            projectsStore.set(p.id, p);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load projects store from disk:", err);
  }
}

function persistStore() {
  if (!storageFilePath) return;
  try {
    const dir = path.dirname(storageFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const list = Array.from(projectsStore.values());
    fs.writeFileSync(storageFilePath, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn("Failed to persist projects store to disk:", err);
  }
}

// Initial load
reloadProjectsStore();

export function clearProjectsStore() {
  projectsStore.clear();
  if (storageFilePath && fs.existsSync(storageFilePath)) {
    try {
      fs.unlinkSync(storageFilePath);
    } catch {}
  }
}

export function getStoredProject(id: number): SharedProject | undefined {
  return projectsStore.get(id);
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const code = String(error.code || "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("could not find the table") ||
    msg.includes("relation") && msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

export async function getOrCreateProjectForCollaboration(
  client: RequestSupabase,
  requestId: number,
  currentUserId?: string
): Promise<SharedProject> {
  // 1. Try Supabase as authoritative store first if table exists
  try {
    let dbProj: any = null;
    let dbError: any = null;

    const resReq = await client
      .from("projects")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (resReq.data) {
      dbProj = resReq.data;
    } else if (resReq.error) {
      dbError = resReq.error;
    } else {
      // Also try lookup by project primary id
      const resId = await client
        .from("projects")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      if (resId.data) {
        dbProj = resId.data;
      } else if (resId.error) {
        dbError = resId.error;
      }
    }

    if (dbError) {
      if (isTableMissingError(dbError)) {
        // Table not migrated yet; allow falling back to JSON store
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error querying project: ${dbError.message}`,
        });
      }
    }

    if (dbProj) {
      // Authorization check on existing project
      if (currentUserId && currentUserId !== dbProj.brand_id && currentUserId !== (dbProj as any).creator_user_id) {
        // Resolve creator profile to verify creator user id
        const { data: cp } = await client
          .from("creator_profiles")
          .select("user_id")
          .eq("id", dbProj.creator_id)
          .maybeSingle();
        if (currentUserId !== dbProj.brand_id && currentUserId !== cp?.user_id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not an authorized participant of this project",
          });
        }
      }

      // Fetch tasks and deliverables from Supabase
      const [tasksRes, delivsRes, briefRes, creatorRes, brandRes] = await Promise.all([
        client.from("project_tasks").select("*").eq("project_id", dbProj.id),
        client.from("project_deliverables").select("*").eq("project_id", dbProj.id),
        client.from("briefs").select("*").eq("id", dbProj.brief_id).maybeSingle(),
        client.from("creator_profiles").select("*").eq("id", dbProj.creator_id).maybeSingle(),
        client.from("profiles").select("*").eq("id", dbProj.brand_id).maybeSingle(),
      ]);

      const briefRow = briefRes.data as BriefRow | null;
      const creatorRow = creatorRes.data as CreatorProfileRow | null;
      const brandRow = brandRes.data as ProfileRow | null;

      const tasks: ProjectTask[] = Array.isArray(tasksRes.data)
        ? tasksRes.data.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            deadline: t.deadline || undefined,
            source: t.source,
          }))
        : [];

      const deliverables: ProjectDeliverable[] = Array.isArray(delivsRes.data)
        ? delivsRes.data.map((d: any) => ({
            id: d.id,
            version: d.version,
            title: d.title,
            notes: d.notes,
            assetUrl: d.asset_url || undefined,
            submittedAt: d.submitted_at,
            status: d.status,
            feedback: d.feedback || undefined,
            reviewedAt: d.reviewed_at || undefined,
          }))
        : [];

      const project: SharedProject = {
        id: dbProj.id,
        requestId: dbProj.request_id,
        briefId: dbProj.brief_id,
        brandId: dbProj.brand_id,
        brandName: brandRow?.display_name || "Brand Partner",
        creatorId: dbProj.creator_id,
        creatorUserId: creatorRow?.user_id || "",
        creatorName: creatorRow?.name || "Creator Partner",
        title: briefRow?.title || "Campaign Brief",
        status: dbProj.status as any,
        brief: {
          title: briefRow?.title || "Campaign Brief",
          objective: briefRow?.objective || "",
          contentType: briefRow?.content_type || "",
          style: briefRow?.style || "",
          audience: briefRow?.audience || "",
          platform: briefRow?.platform || "",
          duration: briefRow?.duration || "",
          aspectRatio: briefRow?.aspect_ratio || "",
          deliverables: briefRow?.deliverables || 1,
          budget: briefRow?.budget || "",
          deadline: briefRow?.deadline || "To be confirmed",
          location: briefRow?.location || "Remote",
          workMode: briefRow?.work_mode || "remote",
          licensing: briefRow?.licensing || "",
        },
        tasks,
        deliverables,
        createdAt: dbProj.created_at,
        updatedAt: dbProj.updated_at,
      };

      projectsStore.set(requestId, project);
      if (project.id !== requestId) {
        projectsStore.set(project.id, project);
      }
      persistStore();
      return project;
    }
  } catch (err: any) {
    if (err instanceof TRPCError) throw err;
    // If Supabase query failed because table does not exist, continue to fallback creation
  }

  // Idempotency: Return existing project from cache/file if already created
  const existing = projectsStore.get(requestId);
  if (existing) {
    if (currentUserId && currentUserId !== existing.brandId && currentUserId !== existing.creatorUserId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not an authorized participant of this project",
      });
    }
    return existing;
  }

  // Fetch collaboration request
  const { data: request, error: reqError } = await client
    .from("collaboration_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (reqError) throw new Error(reqError.message);
  if (!request) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Collaboration request not found",
    });
  }

  const reqRow = request as CollaborationRequestRow;

  // Fetch brief, creator profile, and brand profile in parallel
  const [briefRes, creatorRes, brandRes] = await Promise.all([
    client.from("briefs").select("*").eq("id", reqRow.brief_id).maybeSingle(),
    client.from("creator_profiles").select("*").eq("id", reqRow.creator_id).maybeSingle(),
    client.from("profiles").select("*").eq("id", reqRow.brand_id).maybeSingle(),
  ]);

  if (briefRes.error) throw new Error(briefRes.error.message);
  if (creatorRes.error) throw new Error(creatorRes.error.message);
  if (brandRes.error) throw new Error(brandRes.error.message);

  const briefRow = briefRes.data as BriefRow | null;
  const creatorRow = creatorRes.data as CreatorProfileRow | null;
  const brandRow = brandRes.data as ProfileRow | null;

  const creatorUserId = creatorRow?.user_id || "";
  const brandUserId = reqRow.brand_id;

  // Authorization check
  if (currentUserId && currentUserId !== brandUserId && currentUserId !== creatorUserId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not an authorized participant of this project",
    });
  }

  const briefTitle = briefRow?.title || "Campaign Brief";
  const deadline = briefRow?.deadline || "To be confirmed";

  const initialTasks: ProjectTask[] = [
    {
      id: `task-${requestId}-1`,
      title: "Creative brief alignment & requirements pass",
      description: `Confirm creative vision (${briefRow?.style || "style"}, ${briefRow?.aspect_ratio || "format"}).`,
      status: "done",
      priority: "high",
      source: "brief",
    },
    {
      id: `task-${requestId}-2`,
      title: `Produce initial draft (${briefRow?.content_type || "asset"})`,
      description: `Deliver first version (${briefRow?.duration || "full length"}). Target deadline: ${deadline}.`,
      status: "in_progress",
      priority: "high",
      deadline,
      source: "brief",
    },
    {
      id: `task-${requestId}-3`,
      title: "Brand review & feedback pass",
      description: "Brand reviews deliverable and provides feedback or approval.",
      status: "todo",
      priority: "medium",
      source: "brief",
    },
    {
      id: `task-${requestId}-4`,
      title: "Final asset delivery & commercial sign-off",
      description: `Export final master files according to licensing terms (${briefRow?.licensing || "commercial use"}).`,
      status: "todo",
      priority: "medium",
      source: "brief",
    },
  ];

  const now = new Date().toISOString();
  const project: SharedProject = {
    id: requestId,
    requestId,
    briefId: reqRow.brief_id,
    brandId: brandUserId,
    brandName: brandRow?.display_name || "Brand Partner",
    creatorId: reqRow.creator_id,
    creatorUserId,
    creatorName: creatorRow?.name || "Creator Partner",
    title: briefTitle,
    status: "active",
    brief: {
      title: briefTitle,
      objective: briefRow?.objective || "",
      contentType: briefRow?.content_type || "",
      style: briefRow?.style || "",
      audience: briefRow?.audience || "",
      platform: briefRow?.platform || "",
      duration: briefRow?.duration || "",
      aspectRatio: briefRow?.aspect_ratio || "",
      deliverables: briefRow?.deliverables || 1,
      budget: briefRow?.budget || "",
      deadline,
      location: briefRow?.location || "Remote",
      workMode: briefRow?.work_mode || "remote",
      licensing: briefRow?.licensing || "",
    },
    tasks: initialTasks,
    deliverables: [],
    createdAt: now,
    updatedAt: now,
  };

  // Atomically write project + initial tasks via PL/pgSQL function (single transaction).
  // Falls back to JSON store only if the function/table is not yet migrated (PGRST205 / 42P01).
  try {
    const { data: rpcData, error: rpcErr } = await client.rpc("create_project_with_tasks", {
      p_request_id: requestId,
      p_brief_id: reqRow.brief_id,
      p_brand_id: brandUserId,
      p_creator_id: reqRow.creator_id,
      p_tasks: initialTasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline || null,
        source: t.source,
      })),
    });

    if (rpcErr) {
      if (rpcErr.code === "23505") {
        // Idempotent: project already created by concurrent worker — not an error
      } else if (!isTableMissingError(rpcErr)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to persist project atomically: ${rpcErr.message}`,
        });
      }
      // isTableMissingError → migration not yet applied; fall through to JSON store
    } else if (typeof rpcData === "number" && rpcData !== requestId) {
      // The identity sequence generated a different ID than requestId.
      // Update the in-memory project to reflect the real DB primary key.
      project.id = rpcData;
    }
  } catch (err: any) {
    if (err instanceof TRPCError) throw err;
    // If RPC not yet available (schema not migrated), continue with persistent store fallback
  }

  // Store under the DB-generated project id AND under requestId for lookup compatibility.
  projectsStore.set(project.id, project);
  if (project.id !== requestId) {
    projectsStore.set(requestId, project);
  }
  persistStore();
  return project;
}

export function verifyProjectParticipant(project: SharedProject, userId: string): "brand" | "creator" {
  if (userId === project.brandId) return "brand";
  if (userId === project.creatorUserId) return "creator";
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You are not an authorized participant of this project",
  });
}

export async function getProjectById(
  client: RequestSupabase,
  projectId: number,
  userId: string
): Promise<SharedProject> {
  // Try loading or creating from authoritative store
  const project = await getOrCreateProjectForCollaboration(client, projectId, userId);
  verifyProjectParticipant(project, userId);
  return project;
}

export async function listProjectsForUser(
  clientOrUserId: RequestSupabase | string,
  userIdMaybe?: string
): Promise<SharedProject[]> {
  const isClientFirst = typeof clientOrUserId !== "string";
  const userId = isClientFirst ? userIdMaybe! : clientOrUserId;
  const client = isClientFirst ? (clientOrUserId as RequestSupabase) : undefined;

  // If client is available, hydrate any accepted collaboration requests
  if (client) {
    try {
      const { data: acceptedReqs } = await client
        .from("collaboration_requests")
        .select("id")
        .eq("status", "accepted");
      if (Array.isArray(acceptedReqs)) {
        for (const req of acceptedReqs) {
          if (!projectsStore.has(req.id)) {
            try {
              await getOrCreateProjectForCollaboration(client, req.id, userId);
            } catch {
              // Ignore if caller not participant of that specific request
            }
          }
        }
      }
    } catch {
      // Ignore sync errors and continue with stored projects
    }
  }

  const matching: SharedProject[] = [];
  for (const project of projectsStore.values()) {
    if (project.brandId === userId || project.creatorUserId === userId) {
      matching.push(project);
    }
  }
  return matching.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function updateProjectTaskStatus(
  clientOrProjectId: RequestSupabase | number,
  projectIdOrTaskId: number | string,
  taskIdOrStatus: string,
  statusOrUserId: "todo" | "in_progress" | "done" | string,
  userIdMaybe?: string
): Promise<SharedProject> {
  const isClientFirst = typeof clientOrProjectId !== "number";
  const client = isClientFirst ? (clientOrProjectId as RequestSupabase) : undefined;
  const projectId = isClientFirst ? (projectIdOrTaskId as number) : (clientOrProjectId as number);
  const taskId = isClientFirst ? (taskIdOrStatus as string) : (projectIdOrTaskId as string);
  const status = isClientFirst
    ? (statusOrUserId as "todo" | "in_progress" | "done")
    : (taskIdOrStatus as "todo" | "in_progress" | "done");
  const userId = isClientFirst ? userIdMaybe! : (statusOrUserId as string);

  let project = projectsStore.get(projectId) || Array.from(projectsStore.values()).find(p => p.id === projectId || p.requestId === projectId);
  if (!project && client) {
    try {
      project = await getProjectById(client, projectId, userId);
    } catch (err) {
      if (err instanceof TRPCError && err.code === "FORBIDDEN") throw err;
    }
  }
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  verifyProjectParticipant(project, userId);

  const task = project.tasks.find(t => t.id === taskId);
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  task.status = status;
  const now = new Date().toISOString();
  project.updatedAt = now;

  if (client) {
    try {
      const { error: taskErr } = await client
        .from("project_tasks")
        .update({ status, updated_at: now })
        .eq("id", taskId)
        .eq("project_id", projectId);
      if (taskErr && !isTableMissingError(taskErr)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update task in database: ${taskErr.message}`,
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  persistStore();
  return project;
}

export async function addTasksToProject(
  clientOrProjectId: RequestSupabase | number,
  projectIdOrTasks: number | Array<{ title: string; description?: string; priority?: "high" | "medium" | "low"; deadline?: string; source?: "manual" | "ai_copilot" }>,
  tasksOrUserId: Array<{ title: string; description?: string; priority?: "high" | "medium" | "low"; deadline?: string; source?: "manual" | "ai_copilot" }> | string,
  userIdMaybe?: string
): Promise<SharedProject> {
  const isClientFirst = typeof clientOrProjectId !== "number";
  const client = isClientFirst ? (clientOrProjectId as RequestSupabase) : undefined;
  const projectId = isClientFirst ? (projectIdOrTasks as number) : (clientOrProjectId as number);
  const newTasks = isClientFirst
    ? (tasksOrUserId as Array<{ title: string; description?: string; priority?: "high" | "medium" | "low"; deadline?: string; source?: "manual" | "ai_copilot" }>)
    : (projectIdOrTasks as Array<{ title: string; description?: string; priority?: "high" | "medium" | "low"; deadline?: string; source?: "manual" | "ai_copilot" }>);
  const userId = isClientFirst ? userIdMaybe! : (tasksOrUserId as string);

  let project = projectsStore.get(projectId) || Array.from(projectsStore.values()).find(p => p.id === projectId || p.requestId === projectId);
  if (!project && client) {
    try {
      project = await getProjectById(client, projectId, userId);
    } catch (err) {
      if (err instanceof TRPCError && err.code === "FORBIDDEN") throw err;
    }
  }
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  verifyProjectParticipant(project, userId);

  const now = new Date().toISOString();
  const addedRows: ProjectTask[] = [];

  for (const t of newTasks) {
    if (!t.title || t.title.trim().length === 0) continue;
    const taskObj: ProjectTask = {
      id: `task-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: t.title.trim(),
      description: t.description?.trim() || "",
      priority: t.priority || "medium",
      status: "todo",
      deadline: t.deadline,
      source: t.source || "manual",
    };
    project.tasks.push(taskObj);
    addedRows.push(taskObj);
  }

  project.updatedAt = now;

  if (client && addedRows.length > 0) {
    try {
      const { error: insErr } = await client.from("project_tasks").insert(
        addedRows.map(t => ({
          id: t.id,
          project_id: projectId,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline || null,
          source: t.source,
          created_at: now,
          updated_at: now,
        }))
      );
      if (insErr && !isTableMissingError(insErr)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to add tasks in database: ${insErr.message}`,
        });
      }
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  persistStore();
  return project;
}

export async function submitDeliverable(
  clientOrProjectId: RequestSupabase | number,
  projectIdOrInput: number | { title: string; notes: string; assetUrl?: string },
  inputOrUserId: { title: string; notes: string; assetUrl?: string } | string,
  userIdMaybe?: string
): Promise<SharedProject> {
  const isClientFirst = typeof clientOrProjectId !== "number";
  const client = isClientFirst ? (clientOrProjectId as RequestSupabase) : undefined;
  const projectId = isClientFirst ? (projectIdOrInput as number) : (clientOrProjectId as number);
  const input = isClientFirst
    ? (inputOrUserId as { title: string; notes: string; assetUrl?: string })
    : (projectIdOrInput as { title: string; notes: string; assetUrl?: string });
  const userId = isClientFirst ? userIdMaybe! : (inputOrUserId as string);

  let project = projectsStore.get(projectId) || Array.from(projectsStore.values()).find(p => p.id === projectId || p.requestId === projectId);
  if (!project && client) {
    try {
      project = await getProjectById(client, projectId, userId);
    } catch (err) {
      if (err instanceof TRPCError && err.code === "FORBIDDEN") throw err;
    }
  }
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  const role = verifyProjectParticipant(project, userId);
  if (role !== "creator") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only creators can submit deliverables" });
  }

  const version = project.deliverables.length + 1;
  const now = new Date().toISOString();
  const deliverable: ProjectDeliverable = {
    id: `deliv-${projectId}-v${version}`,
    version,
    title: input.title.trim() || `Deliverable v${version}`,
    notes: input.notes.trim(),
    assetUrl: input.assetUrl?.trim() || undefined,
    submittedAt: now,
    status: "pending_review",
  };

  project.deliverables.push(deliverable);
  project.status = "in_review";
  project.updatedAt = now;

  // Mark draft task as done if exists
  const prodTask = project.tasks.find(t => t.title.toLowerCase().includes("draft") || t.title.toLowerCase().includes("produce"));
  if (prodTask && prodTask.status !== "done") {
    prodTask.status = "done";
  }

  if (client) {
    try {
      const { error: delivErr } = await client.from("project_deliverables").insert({
        id: deliverable.id,
        project_id: projectId,
        version: deliverable.version,
        title: deliverable.title,
        notes: deliverable.notes,
        asset_url: deliverable.assetUrl || null,
        status: deliverable.status,
        submitted_at: now,
      });
      if (delivErr && !isTableMissingError(delivErr)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to persist deliverable in database: ${delivErr.message}`,
        });
      }
      await client.from("projects").update({ status: "in_review", updated_at: now }).eq("id", projectId);
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  persistStore();
  return project;
}

export async function reviewDeliverable(
  clientOrProjectId: RequestSupabase | number,
  projectIdOrDelivId: number | string,
  delivIdOrInput: string | { status: "approved" | "changes_requested"; feedback?: string },
  inputOrUserId: { status: "approved" | "changes_requested"; feedback?: string } | string,
  userIdMaybe?: string
): Promise<SharedProject> {
  const isClientFirst = typeof clientOrProjectId !== "number";
  const client = isClientFirst ? (clientOrProjectId as RequestSupabase) : undefined;
  const projectId = isClientFirst ? (projectIdOrDelivId as number) : (clientOrProjectId as number);
  const deliverableId = isClientFirst ? (delivIdOrInput as string) : (projectIdOrDelivId as string);
  const input = isClientFirst
    ? (inputOrUserId as { status: "approved" | "changes_requested"; feedback?: string })
    : (delivIdOrInput as { status: "approved" | "changes_requested"; feedback?: string });
  const userId = isClientFirst ? userIdMaybe! : (inputOrUserId as string);

  let project = projectsStore.get(projectId) || Array.from(projectsStore.values()).find(p => p.id === projectId || p.requestId === projectId);
  if (!project && client) {
    try {
      project = await getProjectById(client, projectId, userId);
    } catch (err) {
      if (err instanceof TRPCError && err.code === "FORBIDDEN") throw err;
    }
  }
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  const role = verifyProjectParticipant(project, userId);
  if (role !== "brand") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only brand partners can review deliverables" });
  }

  const deliv = project.deliverables.find(d => d.id === deliverableId);
  if (!deliv) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Deliverable not found" });
  }

  const now = new Date().toISOString();
  deliv.status = input.status;
  deliv.feedback = input.feedback?.trim() || undefined;
  deliv.reviewedAt = now;

  if (input.status === "approved") {
    const allApproved = project.deliverables.every(d => d.status === "approved");
    if (allApproved && project.deliverables.length >= project.brief.deliverables) {
      project.status = "completed";
      project.tasks.forEach(t => { t.status = "done"; });
    }
  } else {
    project.status = "active";
  }

  project.updatedAt = now;

  if (client) {
    try {
      const { error: revErr } = await client
        .from("project_deliverables")
        .update({
          status: deliv.status,
          feedback: deliv.feedback || null,
          reviewed_at: now,
        })
        .eq("id", deliverableId);
      if (revErr && !isTableMissingError(revErr)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to persist review in database: ${revErr.message}`,
        });
      }

      await client
        .from("projects")
        .update({ status: project.status, updated_at: now })
        .eq("id", projectId);
    } catch (err) {
      if (err instanceof TRPCError) throw err;
    }
  }

  persistStore();
  return project;
}
