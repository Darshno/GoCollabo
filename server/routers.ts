import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  canCreateCollaboration,
  createCollaboration,
  getCreatorById,
  getDb,
  getUserByOpenId,
  listCreators,
  saveCreator,
  upsertUser,
} from "./db";
import { briefs, creatorProfiles } from "../drizzle/schema";
import { z } from "zod";

const csv = z.string().min(1).max(4000);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    creators: publicProcedure.query(() => listCreators()),
    creator: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ input }) => getCreatorById(input.id)),
    saveCreator: protectedProcedure
      .input(z.object({ creatorId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        return saveCreator(user.id, input.creatorId);
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
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Database is not available",
          });
        const result = await db
          .insert(briefs)
          .values({ ...input, brandId: user.id });
        return { id: Number(result[0].insertId), ...input };
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
        const user = await getUserByOpenId(ctx.user.openId);
        if (!user)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Account record not found",
          });
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Database is not available",
          });
        await db
          .insert(creatorProfiles)
          .values({
            ...input,
            userId: user.id,
            verificationStatus: "self-reported",
            availability: "available",
          });
        return { success: true };
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
  }),
});

export type AppRouter = typeof appRouter;
