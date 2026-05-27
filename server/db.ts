import { and, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  facebookPages,
  FacebookPage,
  InsertFacebookPage,
  facebookGroups,
  FacebookGroup,
  InsertFacebookGroup,
  toneConfigurations,
  ToneConfiguration,
  InsertToneConfiguration,
  scheduledPosts,
  ScheduledPost,
  InsertScheduledPost,
  incomingMessages,
  IncomingMessage,
  InsertIncomingMessage,
  aiReplies,
  AIReply,
  InsertAIReply,
  mediaFiles,
  MediaFile,
  InsertMediaFile,
  notificationPreferences,
  NotificationPreference,
  InsertNotificationPreference,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Facebook Page queries
export async function createFacebookPage(data: InsertFacebookPage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(facebookPages).values(data);
  // Return the inserted page by querying it back
  const inserted = await db.select().from(facebookPages).where(eq(facebookPages.pageId, data.pageId)).limit(1);
  return inserted[0];
}

export async function getFacebookPagesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(facebookPages).where(eq(facebookPages.userId, userId));
}

export async function getFacebookPageById(pageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(facebookPages).where(eq(facebookPages.id, pageId)).limit(1);
  return result[0];
}

// Group queries
export async function createFacebookGroup(data: InsertFacebookGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(facebookGroups).values(data);
}

export async function getGroupsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(facebookGroups).where(eq(facebookGroups.pageId, pageId));
}

export async function updateFacebookGroup(groupId: number, data: Partial<InsertFacebookGroup>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(facebookGroups).set(data).where(eq(facebookGroups.id, groupId));
}

export async function deleteFacebookGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(facebookGroups).where(eq(facebookGroups.id, groupId));
}

// Tone configuration queries
export async function createToneConfiguration(data: InsertToneConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(toneConfigurations).values(data);
}

export async function getToneConfigsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(toneConfigurations).where(eq(toneConfigurations.pageId, pageId));
}

export async function getDefaultToneConfig(pageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(toneConfigurations).where(
    and(eq(toneConfigurations.pageId, pageId), eq(toneConfigurations.isDefault, 1))
  ).limit(1);
  return result[0];
}

// Scheduled posts queries
export async function createScheduledPost(data: InsertScheduledPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(scheduledPosts).values(data);
}

export async function getScheduledPostsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scheduledPosts).where(eq(scheduledPosts.pageId, pageId));
}

export async function getPostsReadyToPublish() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scheduledPosts).where(
    and(eq(scheduledPosts.status, "scheduled"), lte(scheduledPosts.scheduledFor, new Date()))
  );
}

// Message queries
export async function createIncomingMessage(data: InsertIncomingMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(incomingMessages).values(data);
}

export async function getMessagesByPage(pageId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(incomingMessages)
    .where(eq(incomingMessages.pageId, pageId))
    .orderBy(desc(incomingMessages.receivedAt))
    .limit(limit);
}

// AI Reply queries
export async function createAIReply(data: InsertAIReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(aiReplies).values(data);
}

export async function getAIRepliesByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiReplies).where(eq(aiReplies.pageId, pageId));
}

// Media queries
export async function createMediaFile(data: InsertMediaFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(mediaFiles).values(data);
}

export async function getMediaByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mediaFiles).where(eq(mediaFiles.pageId, pageId));
}

// Notification preferences queries
export async function getNotificationPreferences(pageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.pageId, pageId)).limit(1);
  return result[0];
}

export async function createNotificationPreferences(data: InsertNotificationPreference) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notificationPreferences).values(data);
}

export async function updateNotificationPreferences(pageId: number, data: Partial<InsertNotificationPreference>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notificationPreferences).set(data).where(eq(notificationPreferences.pageId, pageId));
}
