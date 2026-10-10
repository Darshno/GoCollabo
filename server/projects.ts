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

// In-memory project registry indexed by request/project ID
const projectsStore = new Map<number, SharedProject>();

export function clearProjectsStore() {
  projectsStore.clear();
}

export function getStoredProject(id: number): SharedProject | undefined {
  return projectsStore.get(id);
}

export async function getOrCreateProjectForCollaboration(
  client: RequestSupabase,
  requestId: number,
  currentUserId?: string
): Promise<SharedProject> {
  // Idempotency: Return existing project if already created
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

  projectsStore.set(requestId, project);
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
  const existing = projectsStore.get(projectId);
  if (existing) {
    verifyProjectParticipant(existing, userId);
    return existing;
  }
  // Try loading from collaboration request
  return getOrCreateProjectForCollaboration(client, projectId, userId);
}

export function listProjectsForUser(userId: string): SharedProject[] {
  const matching: SharedProject[] = [];
  for (const project of projectsStore.values()) {
    if (project.brandId === userId || project.creatorUserId === userId) {
      matching.push(project);
    }
  }
  return matching.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function updateProjectTaskStatus(
  projectId: number,
  taskId: string,
  status: "todo" | "in_progress" | "done",
  userId: string
): SharedProject {
  const project = projectsStore.get(projectId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  verifyProjectParticipant(project, userId);

  const task = project.tasks.find(t => t.id === taskId);
  if (!task) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  }

  task.status = status;
  project.updatedAt = new Date().toISOString();
  return project;
}

export function addTasksToProject(
  projectId: number,
  newTasks: Array<{ title: string; description?: string; priority?: "high" | "medium" | "low"; deadline?: string; source?: "manual" | "ai_copilot" }>,
  userId: string
): SharedProject {
  const project = projectsStore.get(projectId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  verifyProjectParticipant(project, userId);

  for (const t of newTasks) {
    if (!t.title || t.title.trim().length === 0) continue;
    project.tasks.push({
      id: `task-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: t.title.trim(),
      description: t.description?.trim() || "",
      priority: t.priority || "medium",
      status: "todo",
      deadline: t.deadline,
      source: t.source || "manual",
    });
  }

  project.updatedAt = new Date().toISOString();
  return project;
}

export function submitDeliverable(
  projectId: number,
  input: { title: string; notes: string; assetUrl?: string },
  userId: string
): SharedProject {
  const project = projectsStore.get(projectId);
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }
  const role = verifyProjectParticipant(project, userId);
  if (role !== "creator") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only creators can submit deliverables" });
  }

  const version = project.deliverables.length + 1;
  const deliverable: ProjectDeliverable = {
    id: `deliv-${projectId}-v${version}`,
    version,
    title: input.title.trim() || `Deliverable v${version}`,
    notes: input.notes.trim(),
    assetUrl: input.assetUrl?.trim() || undefined,
    submittedAt: new Date().toISOString(),
    status: "pending_review",
  };

  project.deliverables.push(deliverable);
  project.status = "in_review";
  project.updatedAt = new Date().toISOString();

  // Mark draft task as done if exists
  const prodTask = project.tasks.find(t => t.title.toLowerCase().includes("draft") || t.title.toLowerCase().includes("produce"));
  if (prodTask && prodTask.status !== "done") {
    prodTask.status = "done";
  }

  return project;
}

export function reviewDeliverable(
  projectId: number,
  deliverableId: string,
  input: { status: "approved" | "changes_requested"; feedback?: string },
  userId: string
): SharedProject {
  const project = projectsStore.get(projectId);
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

  deliv.status = input.status;
  deliv.feedback = input.feedback?.trim() || undefined;
  deliv.reviewedAt = new Date().toISOString();

  if (input.status === "approved") {
    const allApproved = project.deliverables.every(d => d.status === "approved");
    if (allApproved && project.deliverables.length >= project.brief.deliverables) {
      project.status = "completed";
      project.tasks.forEach(t => { t.status = "done"; });
    }
  } else {
    project.status = "active";
  }

  project.updatedAt = new Date().toISOString();
  return project;
}
