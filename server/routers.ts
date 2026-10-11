import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  BriefStatus,
  CollaborationStatus,
  PortfolioProjectRow,
} from "../shared/database.types";
import {
  BriefInput,
  BriefUpdate,
  canCreateCollaboration,
  createBrief,
  createCollaboration,
  createPortfolioProject,
  deletePortfolioProject,
  getCreatorById,
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
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import type { TrpcContext } from "./_core/context";
import { resolvePortfolioAiProvider } from "./portfolio-ai";
import { resolveBriefAiProvider } from "./brief-ai";
import { resolveCopilotAiProvider } from "./copilot-ai";
import {
  getOrCreateProjectForCollaboration,
  getProjectById,
  listProjectsForUser,
  updateProjectTaskStatus,
  addTasksToProject,
  submitDeliverable,
  reviewDeliverable,
} from "./projects";
import { createSupabaseClient, hasSupabaseConfig } from "./supabase";

const csv = z.string().max(4000);
const accountType = z.enum(["creator", "brand"]);
const briefStatus = z.enum(["draft", "published", "closed"]);
const workMode = z.enum(["remote", "hybrid", "on-site"]);

function clientFor(ctx: TrpcContext) {
  if (!ctx.supabase)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Supabase is not configured on the server",
    });
  return ctx.supabase;
}

function publicClientFor(ctx: TrpcContext) {
  if (ctx.supabase) return ctx.supabase;
  if (!hasSupabaseConfig())
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Supabase is not configured on the server",
    });
  return createSupabaseClient();
}

function requireAccountType(ctx: TrpcContext, expected: "creator" | "brand") {
  if (!ctx.user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  if (ctx.user.accountType !== expected)
    throw new TRPCError({ code: "FORBIDDEN", message: `Only ${expected} accounts can perform this action` });
  return ctx.user;
}

async function requireCreatorProfile(ctx: TrpcContext) {
  const user = requireAccountType(ctx, "creator");
  const client = clientFor(ctx);
  const creatorId = await getCreatorProfileIdForUser(client, user.id);
  if (!creatorId)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Create a creator profile before managing portfolio projects",
    });
  return { client, userId: user.id, creatorId };
}

const profileInput = z.object({
  slug: z.string().min(2).max(120),
  name: z.string().min(2).max(160),
  headline: z.string().min(5).max(220),
  bio: z.string().min(20).max(12000),
  location: z.string().min(2).max(160),
  workMode,
  skills: csv,
  tools: csv,
  contentTypes: csv,
  styles: csv,
  experience: z.string().min(1).max(80),
  rates: z.string().max(120).nullable().optional(),
  formats: csv,
  workflow: csv,
  published: z.boolean(),
});

// Field schemas are declared without defaults so the same definitions can be
// reused for create (where a default is applied) and for patch (where every
// field must stay truly optional). Using `.partial()` on a schema that carries
// defaults would re-apply those defaults on a partial update and silently
// overwrite stored project values.
const projectFields = {
  title: z.string().min(2).max(180),
  description: z.string().max(12000),
  contentType: z.string().max(80),
  tools: z.string().max(4000),
  skills: z.string().max(4000),
  role: z.string().max(2000),
  challenge: z.string().max(6000),
  approach: z.string().max(6000),
  outcomes: z.string().max(6000),
  impactSummary: z.string().max(2000),
  mediaPath: z.string().max(500).nullable(),
  mediaName: z.string().max(180).nullable(),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).nullable(),
  mediaSize: z.number().int().positive().max(8 * 1024 * 1024).nullable(),
  isConcept: z.boolean(),
};

const projectInput = z.object({
  ...projectFields,
  tools: projectFields.tools.default(""),
  skills: projectFields.skills.default(""),
  role: projectFields.role.default(""),
  challenge: projectFields.challenge.default(""),
  approach: projectFields.approach.default(""),
  outcomes: projectFields.outcomes.default(""),
  impactSummary: projectFields.impactSummary.default(""),
  mediaPath: projectFields.mediaPath.default(null),
  mediaName: projectFields.mediaName.default(null),
  mediaType: projectFields.mediaType.default(null),
  mediaSize: projectFields.mediaSize.default(null),
  isConcept: projectFields.isConcept.default(false),
});

export type AppRouter = typeof appRouter;

const projectPatchInput = z
  .object({
    id: z.number().int().positive(),
    published: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
    title: projectFields.title.optional(),
    description: projectFields.description.optional(),
    contentType: projectFields.contentType.optional(),
    tools: projectFields.tools.optional(),
    skills: projectFields.skills.optional(),
    role: projectFields.role.optional(),
    challenge: projectFields.challenge.optional(),
    approach: projectFields.approach.optional(),
    outcomes: projectFields.outcomes.optional(),
    impactSummary: projectFields.impactSummary.optional(),
    mediaPath: projectFields.mediaPath.optional(),
    mediaName: projectFields.mediaName.optional(),
    mediaType: projectFields.mediaType.optional(),
    mediaSize: projectFields.mediaSize.optional(),
    isConcept: projectFields.isConcept.optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "No project changes supplied",
  });

function mapProjectInput(input: z.infer<typeof projectInput>): Omit<PortfolioProjectRow, "id" | "creator_id" | "created_at" | "updated_at" | "sort_order" | "published"> {
  return {
    title: input.title,
    description: input.description,
    content_type: input.contentType,
    tools: input.tools,
    skills: input.skills,
    role: input.role,
    challenge: input.challenge,
    approach: input.approach,
    outcomes: input.outcomes,
    impact_summary: input.impactSummary,
    media_path: input.mediaPath,
    media_name: input.mediaName,
    media_type: input.mediaType,
    media_size: input.mediaSize,
    is_concept: input.isConcept,
  };
}

function mapProjectPatch(input: z.infer<typeof projectPatchInput>) {
  const { id: _id, ...rest } = input;
  const map: Record<string, string> = {
    contentType: "content_type",
    impactSummary: "impact_summary",
    mediaPath: "media_path",
    mediaName: "media_name",
    mediaType: "media_type",
    mediaSize: "media_size",
    isConcept: "is_concept",
    sortOrder: "sort_order",
  };
  return Object.fromEntries(Object.entries(rest).map(([key, value]) => [map[key] || key, value]));
}

function validateMediaPath(path: string | null | undefined, userId: string, projectId?: number) {
  if (!path) return true;
  const segments = path.split("/");
  return segments.length === 3 && segments[0] === userId &&
    (!projectId || segments[1] === String(projectId)) &&
    !segments.some(segment => !segment || segment === "." || segment === "..");
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    setAccountType: protectedProcedure
      .input(z.object({ accountType }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountTypeIdentity(ctx);
        const profile = await updateAccountType(clientFor(ctx), user.id, input.accountType);
        return { accountType: profile.account_type };
      }),
  }),
  marketplace: router({
    creators: publicProcedure.query(({ ctx }) => listCreators(publicClientFor(ctx))),
    briefs: publicProcedure.query(({ ctx }) => listPublishedBriefs(publicClientFor(ctx))),
    creator: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => getCreatorById(publicClientFor(ctx), input.id)),
    myProfile: protectedProcedure.query(({ ctx }) => {
      const user = requireAccountType(ctx, "creator");
      return getCreatorProfileForUser(clientFor(ctx), user.id);
    }),
    saveCreator: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        const saved = await saveCreator(clientFor(ctx), user.id, input.creatorId);
        if (!saved)
          throw new TRPCError({ code: "NOT_FOUND", message: "Published creator not found" });
        return saved;
      }),
    savedCreators: protectedProcedure.query(({ ctx }) => {
      const user = requireAccountType(ctx, "brand");
      return listSavedCreators(clientFor(ctx), user.id);
    }),
    removeSavedCreator: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        return removeSavedCreator(clientFor(ctx), user.id, input.creatorId);
      }),
    createBrief: protectedProcedure
      .input(z.object({
        title: z.string().min(3).max(180),
        objective: z.string().min(10),
        contentType: z.string().min(1).max(100),
        style: z.string().min(1).max(160),
        audience: csv,
        platform: z.string().min(1).max(100),
        duration: z.string().min(1).max(80),
        aspectRatio: z.string().min(1).max(40),
        deliverables: z.number().int().positive(),
        budget: z.string().min(1).max(100),
        deadline: z.string().min(1).max(80),
        location: z.string().min(1).max(160),
        workMode,
        licensing: csv,
        status: z.enum(["draft", "published"]).default("draft"),
      }))
      .mutation(({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        return createBrief(clientFor(ctx), user.id, input as BriefInput);
      }),
    myBriefs: protectedProcedure.query(({ ctx }) => {
      const user = requireAccountType(ctx, "brand");
      return listBriefsForBrand(clientFor(ctx), user.id);
    }),
    updateBrief: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        title: z.string().min(3).max(180).optional(),
        objective: z.string().min(10).optional(),
        contentType: z.string().min(1).max(100).optional(),
        style: z.string().min(1).max(160).optional(),
        audience: csv.optional(),
        platform: z.string().min(1).max(100).optional(),
        duration: z.string().min(1).max(80).optional(),
        aspectRatio: z.string().min(1).max(40).optional(),
        deliverables: z.number().int().positive().optional(),
        budget: z.string().min(1).max(100).optional(),
        deadline: z.string().min(1).max(80).optional(),
        location: z.string().min(1).max(160).optional(),
        workMode: workMode.optional(),
        licensing: csv.optional(),
        status: z.enum(["draft", "published", "closed"]).optional(),
      }).refine(value => Object.keys(value).length > 1, "No brief changes supplied"))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        const { id, ...changes } = input;
        const result = await updateBriefForBrand(clientFor(ctx), user.id, id, changes as BriefUpdate);
        if (result.kind === "not-found")
          throw new TRPCError({ code: "NOT_FOUND", message: "Brief not found" });
        if (result.kind === "invalid-transition")
          throw new TRPCError({ code: "CONFLICT", message: "Invalid brief status transition" });
        return result.brief;
      }),
    saveProfile: protectedProcedure
      .input(profileInput)
      .mutation(({ ctx, input }) => {
        const user = requireAccountType(ctx, "creator");
        return saveCreatorProfile(clientFor(ctx), user.id, input);
      }),
    requests: protectedProcedure.query(({ ctx }) => {
      const user = requireAccountTypeIdentity(ctx);
      return listCollaborationsForUser(clientFor(ctx), user.id, user.accountType);
    }),
    collaborate: protectedProcedure
      .input(z.object({
        briefId: z.number().int().positive(),
        creatorId: z.number().int().positive(),
        message: z.string().min(10).max(12000),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        const client = clientFor(ctx);
        if (!(await canCreateCollaboration(client, input.briefId, user.id, input.creatorId)))
          throw new TRPCError({ code: "NOT_FOUND", message: "Published brief or creator not found" });
        return createCollaboration(client, {
          brief_id: input.briefId,
          brand_id: user.id,
          creator_id: input.creatorId,
          message: input.message,
        });
      }),
    updateRequestStatus: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), status: z.enum(["accepted", "declined"]) }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "creator");
        const client = clientFor(ctx);
        const result = await updateCollaborationStatus(client, user.id, input.requestId, input.status);
        if (result.kind === "not-found")
          throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
        if (result.kind === "invalid-transition")
          throw new TRPCError({ code: "CONFLICT", message: "Request has already been answered" });

        let projectId = input.requestId;
        if (input.status === "accepted") {
          try {
            const project = await getOrCreateProjectForCollaboration(client, input.requestId, user.id);
            projectId = project.id;
          } catch {
            // Keep acceptance response successful
          }
        }
        return { success: true, projectId } as const;
      }),
  }),
  portfolio: router({
    capabilities: protectedProcedure.query(({ ctx }) => {
      requireAccountType(ctx, "creator");
      return { aiConfigured: Boolean(resolvePortfolioAiProvider()), uploadsConfigured: Boolean(ctx.supabase), maxUploadBytes: 8 * 1024 * 1024 };
    }),
    projects: protectedProcedure.query(async ({ ctx }) => {
      const { client, creatorId } = await requireCreatorProfile(ctx);
      return listPortfolioProjects(client, creatorId);
    }),
    createProject: protectedProcedure
      .input(projectInput)
      .mutation(async ({ ctx, input }) => {
        const { client, creatorId, userId } = await requireCreatorProfile(ctx);
        if (!validateMediaPath(input.mediaPath, userId))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Media path must belong to your account" });
        return createPortfolioProject(client, creatorId, mapProjectInput(input));
      }),
    updateProject: protectedProcedure
      .input(projectPatchInput)
      .mutation(async ({ ctx, input }) => {
        const { client, creatorId, userId } = await requireCreatorProfile(ctx);
        if (!validateMediaPath(input.mediaPath, userId, input.id))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Media path must belong to this project and account" });
        const updated = await updatePortfolioProject(client, creatorId, input.id, mapProjectPatch(input));
        if (!updated)
          throw new TRPCError({ code: "NOT_FOUND", message: "Portfolio project not found" });
        return updated;
      }),
    deleteProject: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { client, creatorId } = await requireCreatorProfile(ctx);
        if (!(await deletePortfolioProject(client, creatorId, input.id)))
          throw new TRPCError({ code: "NOT_FOUND", message: "Portfolio project not found" });
        return { success: true } as const;
      }),
    reorderProjects: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { client, creatorId } = await requireCreatorProfile(ctx);
        if (!(await reorderPortfolioProjects(client, creatorId, input.ids)))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Reorder must include each of your projects exactly once" });
        return { success: true } as const;
      }),
    assist: protectedProcedure
      .input(z.object({ sourceNotes: z.string().min(10).max(12000), title: z.string().max(180).default("") }))
      .mutation(async ({ ctx, input }) => {
        await requireCreatorProfile(ctx);
        const provider = resolvePortfolioAiProvider();
        if (!provider)
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No portfolio AI provider is configured. Continue with manual editing." });
        
        try {
          return await provider.generateDraft(input);
        } catch (error: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to generate AI draft" });
        }
      }),
  }),
  briefs: router({
    capabilities: publicProcedure.query(({ ctx }) => {
      if (ctx.user && ctx.user.accountType === "creator") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only brand accounts can perform this action",
        });
      }
      return {
        aiConfigured: Boolean(resolveBriefAiProvider()),
      };
    }),
    assist: publicProcedure
      .input(
        z
          .object({
            idea: z.string().max(12000).optional(),
            prompt: z.string().max(12000).optional(),
          })
          .refine(
            data =>
              Boolean(
                (data.idea && data.idea.trim().length >= 5) ||
                  (data.prompt && data.prompt.trim().length >= 5)
              ),
            {
              message: "Please enter a campaign idea of at least 5 characters",
            }
          )
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user && ctx.user.accountType === "creator") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brand accounts can perform this action",
          });
        }
        const provider = resolveBriefAiProvider();
        if (!provider) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "No brief AI provider is configured. Continue with manual brief creation.",
          });
        }

        try {
          return await provider.generateDraft(input);
        } catch (error: any) {
          if (error.message?.includes("rate limit")) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: error.message,
            });
          }
          if (error.message?.includes("malformed") || error.message?.includes("invalid")) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: error.message || "AI returned malformed output",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to generate AI brief draft",
          });
        }
      }),
  }),
  projects: router({
    capabilities: protectedProcedure.query(({ ctx }) => {
      requireAccountTypeIdentity(ctx);
      return {
        aiConfigured: Boolean(resolveCopilotAiProvider()),
      };
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const user = requireAccountTypeIdentity(ctx);
        return getProjectById(clientFor(ctx), input.id, user.id);
      }),
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const user = requireAccountTypeIdentity(ctx);
        return listProjectsForUser(clientFor(ctx), user.id);
      }),
    updateTask: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        taskId: z.string().min(1),
        status: z.enum(["todo", "in_progress", "done"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountTypeIdentity(ctx);
        return updateProjectTaskStatus(clientFor(ctx), input.projectId, input.taskId, input.status, user.id);
      }),
    addTasks: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        tasks: z.array(z.object({
          title: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          priority: z.enum(["high", "medium", "low"]).optional(),
          deadline: z.string().max(100).optional(),
          source: z.enum(["manual", "ai_copilot"]).optional(),
        })).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountTypeIdentity(ctx);
        return addTasksToProject(clientFor(ctx), input.projectId, input.tasks, user.id);
      }),
    copilotFeedback: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        feedback: z.string().min(5).max(12000),
        deliverableTitle: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountTypeIdentity(ctx);
        const project = await getProjectById(clientFor(ctx), input.projectId, user.id);
        const provider = resolveCopilotAiProvider();
        if (!provider) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No AI copilot provider is configured. Continue with manual task creation.",
          });
        }
        try {
          return await provider.analyzeFeedback({
            feedback: input.feedback,
            deliverableTitle: input.deliverableTitle,
            briefContext: {
              title: project.title,
              objective: project.brief.objective,
              contentType: project.brief.contentType,
              style: project.brief.style,
            },
          });
        } catch (error: any) {
          if (error.message?.includes("rate limit")) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: error.message,
            });
          }
          if (error.message === "AI returned malformed output") {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "AI returned malformed output",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to analyze feedback with AI Copilot",
          });
        }
      }),
    submitDeliverable: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        title: z.string().min(2).max(180),
        notes: z.string().max(4000).default(""),
        assetUrl: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "creator");
        return submitDeliverable(clientFor(ctx), input.projectId, input, user.id);
      }),
    reviewDeliverable: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        deliverableId: z.string().min(1),
        status: z.enum(["approved", "changes_requested"]),
        feedback: z.string().max(4000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = requireAccountType(ctx, "brand");
        return reviewDeliverable(clientFor(ctx), input.projectId, input.deliverableId, input, user.id);
      }),
  }),
});

function requireAccountTypeIdentity(ctx: TrpcContext) {
  if (!ctx.user)
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  return ctx.user;
}

