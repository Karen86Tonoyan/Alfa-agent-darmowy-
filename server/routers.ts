import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { skillsRouter, knowledgeRouter, filtersRouter } from "./routers-features";
import { groupsRouter, scheduledPostsRouter, messagesRouter } from "./routers-groups-posts";
import { tonesRouter } from "./routers-tones";
import { aiGenerationRouter } from "./routers-ai-generation";
import { z } from "zod";
import {
  createFacebookPage,
  getFacebookPagesByUser,
  getFacebookPageById,
  createToneConfiguration,
  getToneConfigsByPage,
  createNotificationPreferences,
  getNotificationPreferences,
} from "./db";
import {
  getPageInfo,
  validatePageToken,
  publishPagePost,
  getPageMessages,
  sendPageMessage,
} from "./facebook";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Skills, Knowledge Base, and Filters
  skills: skillsRouter,
  knowledge: knowledgeRouter,
  filters: filtersRouter,

  // Groups, Posts, and Messages
  groups: groupsRouter,
  scheduledPosts: scheduledPostsRouter,
  messages: messagesRouter,
  tones: tonesRouter,
  aiGeneration: aiGenerationRouter,

  // Facebook Pages management
  pages: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const pages = await getFacebookPagesByUser(ctx.user.id);
      return pages;
    }),

    connect: protectedProcedure
      .input(
        z.object({
          pageAccessToken: z.string().min(1, "Page Access Token is required"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Validate token with Facebook
          const isValid = await validatePageToken(input.pageAccessToken);
          if (!isValid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid Facebook Page Access Token",
            });
          }

          // Get page info
          const pageInfo = await getPageInfo(input.pageAccessToken);

          // Save to database
          const pageRecord = await createFacebookPage({
            userId: ctx.user.id,
            pageId: pageInfo.id,
            pageName: pageInfo.name,
            pageAccessToken: input.pageAccessToken,
            pageProfilePicture: pageInfo.picture?.data?.url,
          });

          // Create default tone configuration
          if (pageRecord) {
            await createToneConfiguration({
              pageId: pageRecord.id,
              toneName: "Default",
              toneType: "professional",
              language: "en",
              isDefault: 1,
            });

            // Create notification preferences
            await createNotificationPreferences({
              pageId: pageRecord.id,
            });
          }

          return {
            success: true,
            pageId: pageInfo.id,
            pageName: pageInfo.name,
          };
        } catch (error) {
          console.error("Error connecting page:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to connect Facebook Page",
          });
        }
      }),

    getById: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .query(async ({ ctx, input }) => {
        const page = await getFacebookPageById(input.pageId);
        if (!page || page.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }
        return page;
      }),

    getMessages: protectedProcedure
      .input(z.object({ pageId: z.number() }))
      .query(async ({ ctx, input }) => {
        const page = await getFacebookPageById(input.pageId);
        if (!page || page.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }

        try {
          const messages = await getPageMessages(page.pageAccessToken);
          return messages;
        } catch (error) {
          console.error("Error fetching messages:", error);
          return [];
        }
      }),

    sendMessage: protectedProcedure
      .input(
        z.object({
          pageId: z.number(),
          recipientId: z.string(),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const page = await getFacebookPageById(input.pageId);
        if (!page || page.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }

        try {
          const result = await sendPageMessage(
            page.pageAccessToken,
            input.recipientId,
            input.message
          );
          return result;
        } catch (error) {
          console.error("Error sending message:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to send message",
          });
        }
      }),

    publishPost: protectedProcedure
      .input(
        z.object({
          pageId: z.number(),
          message: z.string().min(1),
          imageUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const page = await getFacebookPageById(input.pageId);
        if (!page || page.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Page not found",
          });
        }

        try {
          const result = await publishPagePost(
            page.pageAccessToken,
            input.message,
            input.imageUrl
          );
          return result;
        } catch (error) {
          console.error("Error publishing post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to publish post",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
