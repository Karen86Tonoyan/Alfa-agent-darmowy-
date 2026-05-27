import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Facebook Page connected to this account.
 * Stores Page Access Token and connection metadata.
 */
export const facebookPages = mysqlTable("facebook_pages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageId: varchar("pageId", { length: 64 }).notNull().unique(),
  pageName: text("pageName").notNull(),
  pageAccessToken: text("pageAccessToken").notNull(),
  pageProfilePicture: text("pageProfilePicture"),
  isActive: int("isActive").default(1).notNull(),
  connectedAt: timestamp("connectedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacebookPage = typeof facebookPages.$inferSelect;
export type InsertFacebookPage = typeof facebookPages.$inferInsert;

/**
 * Facebook Groups where the Page will post.
 * Stores group metadata and location information.
 */
export const facebookGroups = mysqlTable("facebook_groups", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  groupId: varchar("groupId", { length: 64 }).notNull(),
  groupName: text("groupName").notNull(),
  groupUrl: text("groupUrl"),
  location: text("location"),
  description: text("description"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacebookGroup = typeof facebookGroups.$inferSelect;
export type InsertFacebookGroup = typeof facebookGroups.$inferInsert;

/**
 * AI Communication tone and style configuration.
 * Stores preferences for message generation.
 */
export const toneConfigurations = mysqlTable("tone_configurations", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  toneName: varchar("toneName", { length: 64 }).notNull(),
  toneType: mysqlEnum("toneType", ["formal", "informal", "friendly", "professional", "casual"]).default("professional").notNull(),
  language: varchar("language", { length: 10 }).default("en").notNull(),
  keywordsToUse: text("keywordsToUse"),
  keywordsToAvoid: text("keywordsToAvoid"),
  systemPrompt: text("systemPrompt"),
  isDefault: int("isDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ToneConfiguration = typeof toneConfigurations.$inferSelect;
export type InsertToneConfiguration = typeof toneConfigurations.$inferInsert;

/**
 * Scheduled posts for publication to Page feed and groups.
 * Tracks scheduling, content, and publication status.
 */
export const scheduledPosts = mysqlTable("scheduled_posts", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  mediaUrls: text("mediaUrls"),
  groupIds: text("groupIds"),
  scheduledFor: timestamp("scheduledFor").notNull(),
  dayOfWeek: varchar("dayOfWeek", { length: 10 }),
  isRecurring: int("isRecurring").default(0).notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed", "cancelled"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  errorMessage: text("errorMessage"),
  facebookPostId: varchar("facebookPostId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;

/**
 * Incoming messages from Facebook Page.
 * Stores message content and metadata for history and AI processing.
 */
export const incomingMessages = mysqlTable("incoming_messages", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  senderId: varchar("senderId", { length: 64 }).notNull(),
  senderName: text("senderName"),
  messageContent: text("messageContent").notNull(),
  messageId: varchar("messageId", { length: 128 }).notNull().unique(),
  conversationId: varchar("conversationId", { length: 128 }),
  receivedAt: timestamp("receivedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IncomingMessage = typeof incomingMessages.$inferSelect;
export type InsertIncomingMessage = typeof incomingMessages.$inferInsert;

/**
 * AI-generated replies to incoming messages.
 * Stores reply content, status, and approval workflow.
 */
export const aiReplies = mysqlTable("ai_replies", {
  id: int("id").autoincrement().primaryKey(),
  incomingMessageId: int("incomingMessageId").notNull().references(() => incomingMessages.id, { onDelete: "cascade" }),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  replyContent: text("replyContent").notNull(),
  toneConfigId: int("toneConfigId").references(() => toneConfigurations.id),
  status: mysqlEnum("status", ["generated", "approved", "sent", "failed", "rejected"]).default("generated").notNull(),
  facebookMessageId: varchar("facebookMessageId", { length: 128 }),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AIReply = typeof aiReplies.$inferSelect;
export type InsertAIReply = typeof aiReplies.$inferInsert;

/**
 * Media files uploaded for use in posts.
 * Stores file metadata and S3 references.
 */
export const mediaFiles = mysqlTable("media_files", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 64 }),
  fileSize: int("fileSize"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertMediaFile = typeof mediaFiles.$inferInsert;

/**
 * Notification preferences and delivery tracking.
 * Stores which events trigger notifications and delivery status.
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  notifyOnNewMessage: int("notifyOnNewMessage").default(1).notNull(),
  notifyOnPostPublished: int("notifyOnPostPublished").default(1).notNull(),
  notifyOnPostFailed: int("notifyOnPostFailed").default(1).notNull(),
  notifyOnAIReply: int("notifyOnAIReply").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;


/**
 * Skills - Reusable templates and knowledge modules for post generation and messaging.
 */
export const skills = mysqlTable("skills", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  skillName: varchar("skillName", { length: 128 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  template: text("template"),
  systemPrompt: text("systemPrompt"),
  isActive: int("isActive").default(1).notNull(),
  version: int("version").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Skill = typeof skills.$inferSelect;
export type InsertSkill = typeof skills.$inferInsert;

/**
 * Knowledge Base - Articles and information about products/services.
 */
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 64 }),
  tags: text("tags"),
  isPublished: int("isPublished").default(1).notNull(),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseArticle = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseArticle = typeof knowledgeBase.$inferInsert;

/**
 * Filters - Advanced targeting filters for group selection.
 */
export const filters = mysqlTable("filters", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull().references(() => facebookPages.id, { onDelete: "cascade" }),
  filterName: varchar("filterName", { length: 128 }).notNull(),
  description: text("description"),
  filterConfig: text("filterConfig"),
  filterType: mysqlEnum("filterType", ["location", "size", "category", "engagement", "custom", "combined"]).default("custom").notNull(),
  isActive: int("isActive").default(1).notNull(),
  isSaved: int("isSaved").default(0).notNull(),
  matchedGroupCount: int("matchedGroupCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Filter = typeof filters.$inferSelect;
export type InsertFilter = typeof filters.$inferInsert;

/**
 * Filter Conditions - Individual conditions that make up a filter.
 */
export const filterConditions = mysqlTable("filter_conditions", {
  id: int("id").autoincrement().primaryKey(),
  filterId: int("filterId").notNull().references(() => filters.id, { onDelete: "cascade" }),
  conditionType: varchar("conditionType", { length: 64 }).notNull(),
  operator: varchar("operator", { length: 32 }).notNull(),
  value: text("value"),
  logicalOperator: mysqlEnum("logicalOperator", ["AND", "OR"]).default("AND").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FilterCondition = typeof filterConditions.$inferSelect;
export type InsertFilterCondition = typeof filterConditions.$inferInsert;
