import { and, desc, eq } from "drizzle-orm";
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

export async function listCreators() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.published, 1))
    .orderBy(desc(creatorProfiles.updatedAt));
}

export async function getCreatorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [profile] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.id, id))
    .limit(1);
  const projects = await db
    .select()
    .from(portfolioProjects)
    .where(eq(portfolioProjects.creatorId, id))
    .orderBy(desc(portfolioProjects.createdAt));
  return profile ? { profile, projects } : undefined;
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
  if (!db) return [];
  return db
    .select()
    .from(briefs)
    .where(eq(briefs.brandId, brandId))
    .orderBy(desc(briefs.updatedAt));
}

export async function saveCreator(brandId: number, creatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
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
  const result = await db.insert(savedCreators).values({ brandId, creatorId });
  return { id: Number(result[0].insertId), brandId, creatorId };
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
      and(
        eq(creatorProfiles.id, creatorId),
        eq(creatorProfiles.published, 1)
      )
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
