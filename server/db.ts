import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  creatorProfiles,
  InsertUser,
  users,
  briefs,
  savedCreators,
  collaborationRequests,
  portfolioProjects,
  brandProfiles,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod", "accountType"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] as never;
      updateSet[field] = user[field];
    }
  });
  if (user.lastSignedIn) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0];
}

export async function updateAccountType(
  userId: number,
  accountType: "creator" | "brand"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ accountType }).where(eq(users.id, userId));
}

export async function listCreators() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.published, 1))
    .orderBy(desc(creatorProfiles.updatedAt));
}

export async function getCreatorById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(and(eq(creatorProfiles.id, id), eq(creatorProfiles.published, 1)))
    .limit(1);
  if (!profile) return undefined;
  const projects = await db
    .select()
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.creatorId, id),
        eq(portfolioProjects.published, 1)
      )
    )
    .orderBy(portfolioProjects.sortOrder, desc(portfolioProjects.createdAt));
  return { profile, projects };
}

export async function getCreatorProfileForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);
  if (!profile) return undefined;
  const projects = await db
    .select()
    .from(portfolioProjects)
    .where(eq(portfolioProjects.creatorId, profile.id))
    .orderBy(desc(portfolioProjects.createdAt));
  return { profile, projects };
}

export async function getCreatorProfileIdForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [profile] = await db
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);
  return profile?.id;
}

export type PortfolioProjectInput = Omit<
  typeof portfolioProjects.$inferInsert,
  "id" | "creatorId" | "createdAt" | "sortOrder" | "published"
>;

export type PortfolioProjectUpdate = Partial<PortfolioProjectInput> & {
  published?: number;
};

export async function listPortfolioProjects(creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(portfolioProjects)
    .where(eq(portfolioProjects.creatorId, creatorId))
    .orderBy(
      asc(portfolioProjects.sortOrder),
      desc(portfolioProjects.createdAt)
    );
}

export async function createPortfolioProject(
  creatorId: number,
  input: PortfolioProjectInput
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [lastProject] = await db
    .select({ sortOrder: portfolioProjects.sortOrder })
    .from(portfolioProjects)
    .where(eq(portfolioProjects.creatorId, creatorId))
    .orderBy(desc(portfolioProjects.sortOrder))
    .limit(1);
  const result = await db.insert(portfolioProjects).values({
    ...input,
    creatorId,
    published: 0,
    sortOrder: (lastProject?.sortOrder ?? -1) + 1,
  });
  const [created] = await db
    .select()
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, Number(result[0].insertId)),
        eq(portfolioProjects.creatorId, creatorId)
      )
    )
    .limit(1);
  return created;
}

export async function updatePortfolioProject(
  creatorId: number,
  projectId: number,
  input: PortfolioProjectUpdate
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [existing] = await db
    .select({ id: portfolioProjects.id })
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, projectId),
        eq(portfolioProjects.creatorId, creatorId)
      )
    )
    .limit(1);
  if (!existing) return undefined;
  await db
    .update(portfolioProjects)
    .set(input)
    .where(
      and(
        eq(portfolioProjects.id, projectId),
        eq(portfolioProjects.creatorId, creatorId)
      )
    );
  const [updated] = await db
    .select()
    .from(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, projectId),
        eq(portfolioProjects.creatorId, creatorId)
      )
    )
    .limit(1);
  return updated;
}

export async function deletePortfolioProject(
  creatorId: number,
  projectId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db
    .delete(portfolioProjects)
    .where(
      and(
        eq(portfolioProjects.id, projectId),
        eq(portfolioProjects.creatorId, creatorId)
      )
    );
  return Boolean(result[0].affectedRows);
}

export async function reorderPortfolioProjects(
  creatorId: number,
  projectIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const owned = await db
    .select({ id: portfolioProjects.id })
    .from(portfolioProjects)
    .where(eq(portfolioProjects.creatorId, creatorId));
  const ownedIds = owned.map(project => project.id).sort((a, b) => a - b);
  const requestedIds = [...projectIds].sort((a, b) => a - b);
  if (
    projectIds.length !== new Set(projectIds).size ||
    ownedIds.length !== requestedIds.length ||
    ownedIds.some((id, index) => id !== requestedIds[index])
  )
    return false;
  await db.transaction(async tx => {
    for (const [sortOrder, projectId] of projectIds.entries()) {
      await tx
        .update(portfolioProjects)
        .set({ sortOrder })
        .where(
          and(
            eq(portfolioProjects.id, projectId),
            eq(portfolioProjects.creatorId, creatorId)
          )
        );
    }
  });
  return true;
}

export async function saveCreatorProfile(
  userId: number,
  input: Omit<
    typeof creatorProfiles.$inferInsert,
    | "id"
    | "userId"
    | "createdAt"
    | "updatedAt"
    | "availability"
    | "verificationStatus"
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [existing] = await db
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);
  const ownerSuffix = `-${userId}`;
  const baseSlug = input.slug.endsWith(ownerSuffix)
    ? input.slug.slice(0, -ownerSuffix.length)
    : input.slug;
  const values = {
    ...input,
    slug: `${baseSlug.slice(0, 120 - ownerSuffix.length)}${ownerSuffix}`,
    verificationStatus: "self-reported" as const,
    availability: "available" as const,
  };
  if (existing) {
    await db
      .update(creatorProfiles)
      .set(values)
      .where(
        and(
          eq(creatorProfiles.id, existing.id),
          eq(creatorProfiles.userId, userId)
        )
      );
  } else {
    try {
      await db.insert(creatorProfiles).values({ ...values, userId });
    } catch (error) {
      const [racedProfile] = await db
        .select({ id: creatorProfiles.id })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, userId))
        .limit(1);
      if (!racedProfile) throw error;
      await db
        .update(creatorProfiles)
        .set(values)
        .where(
          and(
            eq(creatorProfiles.id, racedProfile.id),
            eq(creatorProfiles.userId, userId)
          )
        );
    }
  }
  return getCreatorProfileForUser(userId);
}

export async function getBrandProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [brand] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.userId, userId))
    .limit(1);
  return brand;
}

export async function listBriefsForBrand(brandId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(briefs)
    .where(eq(briefs.brandId, brandId))
    .orderBy(desc(briefs.updatedAt));
}

export async function listPublishedBriefs() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(briefs)
    .where(eq(briefs.status, "published"))
    .orderBy(desc(briefs.updatedAt));
}

export async function createBrief(
  brandId: number,
  input: Omit<
    typeof briefs.$inferInsert,
    "id" | "brandId" | "createdAt" | "updatedAt"
  >
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(briefs).values({ ...input, brandId });
  const [created] = await db
    .select()
    .from(briefs)
    .where(
      and(
        eq(briefs.id, Number(result[0].insertId)),
        eq(briefs.brandId, brandId)
      )
    )
    .limit(1);
  return created;
}

export type BriefUpdate = Partial<
  Omit<typeof briefs.$inferInsert, "id" | "brandId" | "createdAt" | "updatedAt">
>;

export function isValidBriefStatusTransition(
  current: "draft" | "published" | "closed",
  next: "draft" | "published" | "closed"
) {
  return (
    current === next ||
    (current === "draft" && next === "published") ||
    (current === "published" && (next === "draft" || next === "closed"))
  );
}

export async function updateBriefForBrand(
  brandId: number,
  briefId: number,
  input: BriefUpdate
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [current] = await db
    .select()
    .from(briefs)
    .where(and(eq(briefs.id, briefId), eq(briefs.brandId, brandId)))
    .limit(1);
  if (!current) return { kind: "not-found" as const };
  if (
    input.status &&
    !isValidBriefStatusTransition(current.status, input.status)
  )
    return { kind: "invalid-transition" as const };
  const result = await db
    .update(briefs)
    .set(input)
    .where(
      and(
        eq(briefs.id, briefId),
        eq(briefs.brandId, brandId),
        eq(briefs.status, current.status)
      )
    );
  if (
    input.status &&
    input.status !== current.status &&
    !result[0].affectedRows
  )
    return { kind: "invalid-transition" as const };
  const [updated] = await db
    .select()
    .from(briefs)
    .where(and(eq(briefs.id, briefId), eq(briefs.brandId, brandId)))
    .limit(1);
  return updated
    ? { kind: "updated" as const, brief: updated }
    : { kind: "not-found" as const };
}

export async function saveCreator(brandId: number, creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [creator] = await db
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(
      and(eq(creatorProfiles.id, creatorId), eq(creatorProfiles.published, 1))
    )
    .limit(1);
  if (!creator) return undefined;
  const existing = await db
    .select()
    .from(savedCreators)
    .where(
      and(
        eq(savedCreators.brandId, brandId),
        eq(savedCreators.creatorId, creatorId)
      )
    )
    .limit(1);
  if (existing[0]) return existing[0];
  await db
    .insert(savedCreators)
    .values({ brandId, creatorId })
    .onDuplicateKeyUpdate({ set: { creatorId } });
  const [saved] = await db
    .select()
    .from(savedCreators)
    .where(
      and(
        eq(savedCreators.brandId, brandId),
        eq(savedCreators.creatorId, creatorId)
      )
    )
    .limit(1);
  return saved;
}

export async function listSavedCreators(brandId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({ savedId: savedCreators.id, profile: creatorProfiles })
    .from(savedCreators)
    .innerJoin(creatorProfiles, eq(savedCreators.creatorId, creatorProfiles.id))
    .where(
      and(eq(savedCreators.brandId, brandId), eq(creatorProfiles.published, 1))
    )
    .orderBy(desc(savedCreators.createdAt));
}

export async function removeSavedCreator(brandId: number, creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db
    .delete(savedCreators)
    .where(
      and(
        eq(savedCreators.brandId, brandId),
        eq(savedCreators.creatorId, creatorId)
      )
    );
  return { success: true } as const;
}

export async function listCollaborationsForUser(
  userId: number,
  accountType: "creator" | "brand" | "admin"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (accountType === "brand") {
    return db
      .select({
        request: collaborationRequests,
        briefTitle: briefs.title,
        creatorName: creatorProfiles.name,
      })
      .from(collaborationRequests)
      .innerJoin(briefs, eq(collaborationRequests.briefId, briefs.id))
      .innerJoin(
        creatorProfiles,
        eq(collaborationRequests.creatorId, creatorProfiles.id)
      )
      .where(eq(collaborationRequests.brandId, userId))
      .orderBy(desc(collaborationRequests.createdAt));
  }
  if (accountType === "creator") {
    return db
      .select({
        request: collaborationRequests,
        briefTitle: briefs.title,
        creatorName: creatorProfiles.name,
        brandName: users.name,
      })
      .from(collaborationRequests)
      .innerJoin(briefs, eq(collaborationRequests.briefId, briefs.id))
      .innerJoin(
        creatorProfiles,
        eq(collaborationRequests.creatorId, creatorProfiles.id)
      )
      .innerJoin(users, eq(collaborationRequests.brandId, users.id))
      .where(eq(creatorProfiles.userId, userId))
      .orderBy(desc(collaborationRequests.createdAt));
  }
  return [];
}

export async function updateCollaborationStatus(
  userId: number,
  requestId: number,
  status: "accepted" | "declined"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [current] = await db
    .select({
      id: collaborationRequests.id,
      status: collaborationRequests.status,
    })
    .from(collaborationRequests)
    .innerJoin(
      creatorProfiles,
      eq(collaborationRequests.creatorId, creatorProfiles.id)
    )
    .where(
      and(
        eq(collaborationRequests.id, requestId),
        eq(creatorProfiles.userId, userId)
      )
    )
    .limit(1);
  if (!current) return { kind: "not-found" as const };
  if (current.status !== "sent") return { kind: "invalid-transition" as const };
  const result = await db
    .update(collaborationRequests)
    .set({ status })
    .where(
      and(
        eq(collaborationRequests.id, requestId),
        eq(collaborationRequests.status, "sent")
      )
    );
  if (!result[0].affectedRows) return { kind: "invalid-transition" as const };
  return { kind: "updated" as const };
}

export async function canCreateCollaboration(
  briefId: number,
  brandId: number,
  creatorId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [brief] = await db
    .select({ id: briefs.id })
    .from(briefs)
    .where(
      and(
        eq(briefs.id, briefId),
        eq(briefs.brandId, brandId),
        eq(briefs.status, "published")
      )
    )
    .limit(1);
  if (!brief) return false;
  const [creator] = await db
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(
      and(eq(creatorProfiles.id, creatorId), eq(creatorProfiles.published, 1))
    )
    .limit(1);
  return Boolean(creator);
}

export async function createCollaboration(
  input: typeof collaborationRequests.$inferInsert
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(collaborationRequests).values(input);
  return { id: Number(result[0].insertId), ...input };
}
