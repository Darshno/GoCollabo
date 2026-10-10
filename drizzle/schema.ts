import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountType: mysqlEnum("accountType", ["creator", "brand", "admin"])
    .default("creator")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const creatorProfiles = mysqlTable("creator_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  headline: varchar("headline", { length: 220 }).notNull(),
  bio: text("bio").notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  workMode: mysqlEnum("workMode", ["remote", "hybrid", "on-site"]).notNull(),
  skills: text("skills").notNull(),
  tools: text("tools").notNull(),
  contentTypes: text("contentTypes").notNull(),
  styles: text("styles").notNull(),
  experience: varchar("experience", { length: 80 }).notNull(),
  rates: varchar("rates", { length: 120 }),
  formats: text("formats").notNull(),
  workflow: text("workflow").notNull(),
  verificationStatus: mysqlEnum("verificationStatus", [
    "self-reported",
    "not-verified",
  ])
    .default("self-reported")
    .notNull(),
  availability: mysqlEnum("availability", [
    "available",
    "selective",
    "unavailable",
  ])
    .default("available")
    .notNull(),
  published: int("published").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const portfolioProjects = mysqlTable("portfolio_projects", {
  id: int("id").autoincrement().primaryKey(),
  creatorId: int("creatorId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  imageUrl: text("imageUrl").notNull(),
  contentType: varchar("contentType", { length: 80 }).notNull(),
  isConcept: int("isConcept").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const brandProfiles = mysqlTable("brand_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  website: varchar("website", { length: 220 }),
  industry: varchar("industry", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const briefs = mysqlTable("briefs", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  objective: text("objective").notNull(),
  contentType: varchar("contentType", { length: 100 }).notNull(),
  style: varchar("style", { length: 160 }).notNull(),
  audience: text("audience").notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  duration: varchar("duration", { length: 80 }).notNull(),
  aspectRatio: varchar("aspectRatio", { length: 40 }).notNull(),
  deliverables: int("deliverables").notNull(),
  budget: varchar("budget", { length: 100 }).notNull(),
  deadline: varchar("deadline", { length: 80 }).notNull(),
  location: varchar("location", { length: 160 }).notNull(),
  workMode: mysqlEnum("workMode", ["remote", "hybrid", "on-site"]).notNull(),
  licensing: text("licensing").notNull(),
  status: mysqlEnum("status", ["draft", "published", "closed"])
    .default("draft")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedCreators = mysqlTable("saved_creators", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  creatorId: int("creatorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const collaborationRequests = mysqlTable("collaboration_requests", {
  id: int("id").autoincrement().primaryKey(),
  briefId: int("briefId").notNull(),
  brandId: int("brandId").notNull(),
  creatorId: int("creatorId").notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["sent", "accepted", "declined"])
    .default("sent")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type Brief = typeof briefs.$inferSelect;
