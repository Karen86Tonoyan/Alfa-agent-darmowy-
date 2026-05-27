/**
 * tRPC Routers for Groups, Posts, and Messages
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createGroup,
  getGroupsByPage,
  getGroupById,
  updateGroup,
  deleteGroup,
  createScheduledPost,
  getPostsByPage,
  getPostById,
  updateScheduledPost,
  deleteScheduledPost,
  createIncomingMessage,
  getMessagesByPage,
  getMessageById,
  updateIncomingMessage,
  getUnansweredMessages,
  createAIReply,
  getRepliesByMessage,
  getRepliesByPage,
} from "./db-groups-posts";
import { getFacebookPageById } from "./db";

// ============ GROUPS ROUTER ============

export const groupsRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getGroupsByPage(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        groupId: z.string().min(1),
        groupName: z.string().min(1),
        groupUrl: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await createGroup({
        pageId: input.pageId,
        groupId: input.groupId,
        groupName: input.groupName,
        groupUrl: input.groupUrl,
        location: input.location,
        description: input.description,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        groupId: z.number(),
        pageId: z.number(),
        groupName: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const group = await getGroupById(input.groupId);
      if (!group || group.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }
      return await updateGroup(input.groupId, {
        groupName: input.groupName,
        location: input.location,
        description: input.description,
        isActive: input.isActive,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ groupId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const group = await getGroupById(input.groupId);
      if (!group || group.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }
      return await deleteGroup(input.groupId);
    }),
});

// ============ SCHEDULED POSTS ROUTER ============

export const scheduledPostsRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getPostsByPage(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        content: z.string().min(1),
        mediaUrls: z.string().optional(),
        groupIds: z.string().optional(),
        skillIds: z.string().optional(),
        scheduledFor: z.date(),
        dayOfWeek: z.string().optional(),
        isRecurring: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await createScheduledPost({
        pageId: input.pageId,
        content: input.content,
        mediaUrls: input.mediaUrls,
        groupIds: input.groupIds,
        scheduledFor: input.scheduledFor,
        dayOfWeek: input.dayOfWeek,
        isRecurring: input.isRecurring || 0,
        status: "scheduled",
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        pageId: z.number(),
        content: z.string().optional(),
        status: z.enum(["draft", "scheduled", "published", "failed", "cancelled"]).optional(),
        publishedAt: z.date().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const post = await getPostById(input.postId);
      if (!post || post.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      return await updateScheduledPost(input.postId, {
        content: input.content,
        status: input.status,
        publishedAt: input.publishedAt,
        errorMessage: input.errorMessage,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ postId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const post = await getPostById(input.postId);
      if (!post || post.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      return await deleteScheduledPost(input.postId);
    }),
});

// ============ MESSAGES ROUTER ============

export const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getMessagesByPage(input.pageId);
    }),

  getReplies: protectedProcedure
    .input(z.object({ pageId: z.number(), messageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getRepliesByMessage(input.messageId);
    }),

  getUnanswered: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getUnansweredMessages(input.pageId);
    }),

  createReply: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        messageId: z.number(),
        replyText: z.string().min(1),
        usedSkills: z.string().optional(),
        usedKnowledge: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const message = await getMessageById(input.messageId);
      if (!message || message.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }
      return await createAIReply({
        pageId: input.pageId,
        incomingMessageId: input.messageId,
        replyContent: input.replyText,
      });
    }),
});
