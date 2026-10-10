import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createPortfolioProject,
  canCreateCollaboration,
  createBrief,
  createCollaboration,
  deletePortfolioProject,
  getCreatorById,
  getCreatorProfileForUser,
  getCreatorProfileIdForUser,
  getUserByOpenId,
  listCreators,
  listBriefsForBrand,
  listCollaborationsForUser,
  listPortfolioProjects,
  listPublishedBriefs,
  listSavedCreators,
  reorderPortfolioProjects,
  removeSavedCreator,
  saveCreator,
  saveCreatorProfile,
  updateAccountType,
  updateBriefForBrand,
  updateCollaborationStatus,
  updatePortfolioProject,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { z } from "zod";

const csv = z.string().min(1).max(4000);
const accountType = z.enum(["creator", "brand"]);
const briefStatus = z.enum(["draft", "published", "closed"]);
const portfolioProjectFields = z.object({
  title: z.string().min(2).max(180),
  description: z.string().min(1).max(12000),
  contentType: z.string().min(1).max(80),
  tools: z.string().max(4000).optional(),
  skills: z.string().max(4000).optional(),
  role: z.string().max(2000).optional(),
  challenge: z.string().max(6000).optional(),
  approach: z.string().max(6000).optional(),
  outcomes: z.string().max(6000).optional(),
  impactSummary: z.string().max(2000).optional(),
  imageUrl: z.string().max(1200).nullable().optional(),
  mediaKey: z.string().max(500).nullable().optional(),
  mediaName: z.string().max(180).nullable().optional(),
  mediaType: z
    .enum(["image/jpeg", "image/png", "image/webp", "image/gif"])
    .nullable()
    .optional(),
  mediaSize: z
    .number()
    .int()
    .positive()
    .max(8 * 1024 * 1024)
    .nullable()
    .optional(),
  isConcept: z.number().int().min(0).max(1).optional(),
});
const projectMediaIsSafe = <
  T extends { imageUrl?: string | null; mediaKey?: string | null },
>(
  value: T
) => {
  if (value.imageUrl && !value.imageUrl.startsWith("/manus-storage/"))
    return false;
  if (value.mediaKey && value.imageUrl !== `/manus-storage/${value.mediaKey}`)
    return false;
  return true;
};
const hasImageSignature = (
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
  data: Buffer
) => {
  if (mimeType === "image/jpeg")
    return (
      data.length >= 3 &&
      data[0] === 0xff &&
      data[1] === 0xd8 &&
      data[2] === 0xff
    );
  if (mimeType === "image/png")
    return data
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/gif")
    return (
      data
        .subarray(0, 6)
        .toString("ascii")
        .match(/^GIF8[79]a$/) !== null
    );
  return (
    data.length >= 12 &&
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  );
};
const portfolioAssistResult = z.object({
  title: z.string().max(180),
  description: z.string().max(12000),
  challenge: z.string().max(6000),
  approach: z.string().max(6000),
  outcomes: z.string().max(6000),
  impactSummary: z.string().max(2000),
  skills: z.array(z.string().max(80)).max(30),
});

async function requireCreatorProfile(ctx: {
  user: { id: number; openId: string; accountType: string };
}) {
  if (ctx.user.accountType !== "creator")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only creator accounts can manage portfolio projects",
    });
  const user = await getUserByOpenId(ctx.user.openId);
  if (!user)
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Account record not found",
    });
  const creatorId = await getCreatorProfileIdForUser(user.id);
  if (!creatorId)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Create a creator profile before managing portfolio projects",
    });
  return { userId: user.id, creatorId };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    setAccountType: protectedProcedure
      .input(z.object({ accountType }))
      .mutation(async ({ ctx, input }) => {
        await updateAccountType(ctx.user.id, input.accountType);
        return { accountType: input.accountType };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    creators: publicProcedure.query(() => listCreators()),
    briefs: publicProcedure.query(() => listPublishedBriefs()),
    creator: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getCreatorById(input.id)),
    myProfile: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.accountType !== "creator")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only creator accounts can access creator profiles",
        });
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Account record not found",
        });
      return getCreatorProfileForUser(user.id);
    }),
    saveCreator: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "brand")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brand accounts can save creators",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const saved = await saveCreator(user.id, input.creatorId);
        if (!saved)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Published creator not found",
          });
        return saved;
      }),
    savedCreators: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.accountType !== "brand")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only brands can view saved creators",
        });
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Account record not found",
        });
      return listSavedCreators(user.id);
    }),
    removeSavedCreator: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "brand")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brands can remove saved creators",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        return removeSavedCreator(user.id, input.creatorId);
      }),
    createBrief: protectedProcedure
      .input(
        z.object({
          title: z.string().min(3),
          objective: z.string().min(10),
          contentType: z.string().min(1),
          style: z.string().min(1),
          audience: csv,
          platform: z.string().min(1),
          duration: z.string().min(1),
          aspectRatio: z.string().min(1),
          deliverables: z.number().int().positive(),
          budget: z.string().min(1),
          deadline: z.string().min(1),
          location: z.string().min(1),
          workMode: z.enum(["remote", "hybrid", "on-site"]),
          licensing: csv,
          status: z.enum(["draft", "published"]).default("draft"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "brand")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brand accounts can create briefs",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        return createBrief(user.id, input);
      }),
    myBriefs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.accountType !== "brand")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only brands can view their briefs",
        });
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Account record not found",
        });
      return listBriefsForBrand(user.id);
    }),
    updateBrief: protectedProcedure
      .input(
        z
          .object({
            id: z.number().int().positive(),
            title: z.string().min(3).optional(),
            objective: z.string().min(10).optional(),
            contentType: z.string().min(1).optional(),
            style: z.string().min(1).optional(),
            audience: csv.optional(),
            platform: z.string().min(1).optional(),
            duration: z.string().min(1).optional(),
            aspectRatio: z.string().min(1).optional(),
            deliverables: z.number().int().positive().optional(),
            budget: z.string().min(1).optional(),
            deadline: z.string().min(1).optional(),
            location: z.string().min(1).optional(),
            workMode: z.enum(["remote", "hybrid", "on-site"]).optional(),
            licensing: csv.optional(),
            status: briefStatus.optional(),
          })
          .refine(input => Object.keys(input).some(key => key !== "id"), {
            message: "At least one brief field must be updated",
          })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "brand")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brands can update briefs",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const { id, ...changes } = input;
        const result = await updateBriefForBrand(user.id, id, changes);
        if (result.kind === "not-found")
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Brief not found",
          });
        if (result.kind === "invalid-transition")
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invalid brief status transition",
          });
        return result.brief;
      }),
    saveProfile: protectedProcedure
      .input(
        z.object({
          slug: z.string().min(2),
          name: z.string().min(2),
          headline: z.string().min(5),
          bio: z.string().min(20),
          location: z.string().min(2),
          workMode: z.enum(["remote", "hybrid", "on-site"]),
          skills: csv,
          tools: csv,
          contentTypes: csv,
          styles: csv,
          experience: z.string().min(1),
          rates: z.string().optional(),
          formats: csv,
          workflow: csv,
          published: z.number().int().min(0).max(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "creator")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only creator accounts can publish creator profiles",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const { slug, ...profile } = input;
        return saveCreatorProfile(user.id, { ...profile, slug });
      }),
    requests: protectedProcedure.query(async ({ ctx }) => {
      if (
        ctx.user.accountType !== "creator" &&
        ctx.user.accountType !== "brand"
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Marketplace account required",
        });
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Account record not found",
        });
      return listCollaborationsForUser(user.id, ctx.user.accountType);
    }),
    collaborate: protectedProcedure
      .input(
        z.object({
          briefId: z.number().int().positive(),
          creatorId: z.number().int().positive(),
          message: z.string().min(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "brand")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only brand accounts can send collaboration requests",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        if (
          !(await canCreateCollaboration(
            input.briefId,
            user.id,
            input.creatorId
          ))
        )
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Published brief or creator not found",
          });
        return createCollaboration({
          ...input,
          brandId: user.id,
          status: "sent",
        });
      }),
    updateRequestStatus: protectedProcedure
      .input(
        z.object({
          requestId: z.number().int().positive(),
          status: z.enum(["accepted", "declined"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.accountType !== "creator")
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only creators can respond to requests",
          });
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const result = await updateCollaborationStatus(
          user.id,
          input.requestId,
          input.status
        );
        if (result.kind === "not-found")
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Request not found",
          });
        if (result.kind === "invalid-transition")
          throw new TRPCError({
            code: "CONFLICT",
            message: "Request has already been answered",
          });
        return { success: true } as const;
      }),
  }),
  portfolio: router({
    capabilities: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.accountType !== "creator")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Creator account required",
        });
      return {
        aiConfigured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
        uploadsConfigured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
        maxUploadBytes: 8 * 1024 * 1024,
      };
    }),
    projects: protectedProcedure.query(async ({ ctx }) => {
      const { creatorId } = await requireCreatorProfile(ctx);
      return listPortfolioProjects(creatorId);
    }),
    createProject: protectedProcedure
      .input(
        portfolioProjectFields.superRefine((value, issueContext) => {
          if (!projectMediaIsSafe(value))
            issueContext.addIssue({
              code: "custom",
              message: "Project media must use managed storage",
            });
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { creatorId } = await requireCreatorProfile(ctx);
        return createPortfolioProject(creatorId, {
          ...input,
          tools: input.tools ?? "",
          skills: input.skills ?? "",
          role: input.role ?? "",
          challenge: input.challenge ?? "",
          approach: input.approach ?? "",
          outcomes: input.outcomes ?? "",
          impactSummary: input.impactSummary ?? "",
          imageUrl: input.imageUrl ?? null,
          mediaKey: input.mediaKey ?? null,
          mediaName: input.mediaName ?? null,
          mediaType: input.mediaType ?? null,
          mediaSize: input.mediaSize ?? null,
          isConcept: input.isConcept ?? 0,
        });
      }),
    updateProject: protectedProcedure
      .input(
        portfolioProjectFields
          .partial()
          .extend({
            id: z.number().int().positive(),
            published: z.number().int().min(0).max(1).optional(),
          })
          .superRefine((value, issueContext) => {
            if (!projectMediaIsSafe(value))
              issueContext.addIssue({
                code: "custom",
                message: "Project media must use managed storage",
              });
            if (Object.keys(value).length === 1)
              issueContext.addIssue({
                code: "custom",
                message: "No project changes supplied",
              });
          })
      )
      .mutation(async ({ ctx, input }) => {
        const { creatorId } = await requireCreatorProfile(ctx);
        const { id, ...changes } = input;
        const project = await updatePortfolioProject(creatorId, id, changes);
        if (!project)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portfolio project not found",
          });
        return project;
      }),
    deleteProject: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { creatorId } = await requireCreatorProfile(ctx);
        if (!(await deletePortfolioProject(creatorId, input.id)))
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portfolio project not found",
          });
        return { success: true } as const;
      }),
    reorderProjects: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()).max(100) }))
      .mutation(async ({ ctx, input }) => {
        const { creatorId } = await requireCreatorProfile(ctx);
        if (!(await reorderPortfolioProjects(creatorId, input.ids)))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Reorder must include each of your projects exactly once",
          });
        return { success: true } as const;
      }),
    uploadMedia: protectedProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(180),
          mimeType: z.enum([
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ]),
          size: z
            .number()
            .int()
            .positive()
            .max(8 * 1024 * 1024),
          dataBase64: z
            .string()
            .min(4)
            .max(11_184_812)
            .regex(/^[A-Za-z0-9+/]+={0,2}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { creatorId } = await requireCreatorProfile(ctx);
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Uploads are unavailable. Configure MANUS_API_URL and MANUS_API_KEY on the server.",
          });
        const data = Buffer.from(input.dataBase64, "base64");
        if (data.byteLength !== input.size)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size did not match the uploaded data",
          });
        if (!hasImageSignature(input.mimeType, data))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File contents do not match the selected image type",
          });
        const extensionByMime = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/gif": "gif",
        } as const;
        const safeName =
          input.fileName.split(/[\\/]/).pop() || "portfolio-image";
        try {
          const asset = await storagePut(
            `portfolio/${creatorId}/${crypto.randomUUID()}.${extensionByMime[input.mimeType]}`,
            data,
            input.mimeType
          );
          return {
            ...asset,
            fileName: safeName,
            mimeType: input.mimeType,
            size: input.size,
          };
        } catch {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Storage upload failed. Check server storage configuration and retry.",
          });
        }
      }),
    assist: protectedProcedure
      .input(
        z.object({
          title: z.string().max(180).default(""),
          category: z.string().max(80).default(""),
          role: z.string().max(2000).default(""),
          tools: z.string().max(4000).default(""),
          skills: z.string().max(4000).default(""),
          challenge: z.string().max(6000).default(""),
          approach: z.string().max(6000).default(""),
          outcomes: z.string().max(6000).default(""),
          sourceNotes: z.string().min(10).max(8000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireCreatorProfile(ctx);
        if (!ENV.forgeApiUrl || !ENV.forgeApiKey)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "AI assistance is unavailable. Configure MANUS_API_URL and MANUS_API_KEY on the server.",
          });
        try {
          const result = await invokeLLM({
            maxTokens: 1800,
            responseFormat: {
              type: "json_schema",
              json_schema: {
                name: "portfolio_project_draft",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "title",
                    "description",
                    "challenge",
                    "approach",
                    "outcomes",
                    "impactSummary",
                    "skills",
                  ],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    challenge: { type: "string" },
                    approach: { type: "string" },
                    outcomes: { type: "string" },
                    impactSummary: { type: "string" },
                    skills: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
            messages: [
              {
                role: "system",
                content:
                  "You edit portfolio case studies. Return only the requested JSON. Use only facts explicitly present in the creator's source information. Never invent clients, metrics, credentials, outcomes, tools, or claims. If outcomes are not provided, say they were not specified. Keep the title concise, description professional, case-study sections clear, impact summary factual and brief, and skill tags limited to skills supported by the input. All text is an unverified draft for creator review.",
              },
              {
                role: "user",
                content: JSON.stringify(input),
              },
            ],
          });
          const content = result.choices[0]?.message.content;
          const responseText =
            typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content
                    .filter(part => part.type === "text")
                    .map(part => part.text)
                    .join("\n")
                : "";
          const draft = portfolioAssistResult.parse(JSON.parse(responseText));
          return { ...draft, isDraft: true as const };
        } catch {
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message:
              "AI assistance failed. Your project is unchanged; retry or continue editing manually.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
