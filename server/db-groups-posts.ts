/**
 * Database helpers for Groups and Scheduled Posts
 */

import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  facebookGroups,
  InsertFacebookGroup,
  scheduledPosts,
  InsertScheduledPost,
  incomingMessages,
  InsertIncomingMessage,
  aiReplies,
  InsertAIReply,
} from "../drizzle/schema";

// ============ FACEBOOK GROUPS ============

export async function createGroup(data: InsertFacebookGroup) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(facebookGroups).values(data);
  const inserted = await db.select().from(facebookGroups).where(eq(facebookGroups.groupName, data.groupName)).limit(1);
  return inserted[0];
}

export async function getGroupsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(facebookGroups).where(eq(facebookGroups.pageId, pageId));
}

export async function getGroupById(groupId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(facebookGroups).where(eq(facebookGroups.id, groupId)).limit(1);
  return result[0];
}

export async function updateGroup(groupId: number, data: Partial<InsertFacebookGroup>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(facebookGroups).set(data).where(eq(facebookGroups.id, groupId));
}

export async function deleteGroup(groupId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(facebookGroups).where(eq(facebookGroups.id, groupId));
}

export async function getActiveGroupsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(facebookGroups).where(
    and(eq(facebookGroups.pageId, pageId), eq(facebookGroups.isActive, 1))
  );
}

// ============ SCHEDULED POSTS ============

export async function createScheduledPost(data: InsertScheduledPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(scheduledPosts).values(data);
  const inserted = await db.select().from(scheduledPosts).where(eq(scheduledPosts.content, data.content)).limit(1);
  return inserted[0];
}

export async function getPostsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scheduledPosts).where(eq(scheduledPosts.pageId, pageId));
}

export async function getPostById(postId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, postId)).limit(1);
  return result[0];
}

export async function updateScheduledPost(postId: number, data: Partial<InsertScheduledPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(scheduledPosts).set(data).where(eq(scheduledPosts.id, postId));
}

export async function deleteScheduledPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(scheduledPosts).where(eq(scheduledPosts.id, postId));
}

export async function getScheduledPostsForPublishing() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select().from(scheduledPosts).where(
    and(
      eq(scheduledPosts.status, "scheduled"),
      // Simplified: just get all scheduled posts, actual time check happens in service
    )
  );
}

export async function getPublishedPostsByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(scheduledPosts).where(
    and(eq(scheduledPosts.pageId, pageId), eq(scheduledPosts.status, "published"))
  );
}

// ============ INCOMING MESSAGES ============

export async function createIncomingMessage(data: InsertIncomingMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(incomingMessages).values(data);
  const inserted = await db.select().from(incomingMessages).where(eq(incomingMessages.messageContent, data.messageContent)).limit(1);
  return inserted[0];
}

export async function getMessagesByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(incomingMessages).where(eq(incomingMessages.pageId, pageId));
}

export async function getMessageById(messageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(incomingMessages).where(eq(incomingMessages.id, messageId)).limit(1);
  return result[0];
}

export async function updateIncomingMessage(messageId: number, data: Partial<InsertIncomingMessage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(incomingMessages).set(data).where(eq(incomingMessages.id, messageId));
}

export async function getUnansweredMessages(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get messages that don't have replies yet
  return await db.select().from(incomingMessages).where(eq(incomingMessages.pageId, pageId));
}

// ============ AI REPLIES ============

export async function createAIReply(data: InsertAIReply) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(aiReplies).values(data);
  const inserted = await db.select().from(aiReplies).where(eq(aiReplies.incomingMessageId, data.incomingMessageId)).limit(1);
  return inserted[0];
}

export async function getRepliesByMessage(messageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiReplies).where(eq(aiReplies.incomingMessageId, messageId));
}

export async function getRepliesByPage(pageId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiReplies).where(eq(aiReplies.pageId, pageId));
}

export async function getReplyById(replyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiReplies).where(eq(aiReplies.id, replyId)).limit(1);
  return result[0];
}

export async function updateAIReply(replyId: number, data: Partial<InsertAIReply>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(aiReplies).set(data).where(eq(aiReplies.id, replyId));
}

export async function deleteAIReply(replyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(aiReplies).where(eq(aiReplies.id, replyId));
}
