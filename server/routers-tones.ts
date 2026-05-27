/**
 * tRPC Routers for Tone Configurations
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createToneConfiguration,
  getTonesByPage,
  getToneById,
  updateToneConfiguration,
  deleteToneConfiguration,
  setDefaultTone,
} from "./db-tones";
import { getFacebookPageById } from "./db";

export const tonesRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getTonesByPage(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        toneName: z.string().min(1),
        toneType: z.enum(["formal", "informal", "friendly", "professional", "casual"]),
        language: z.string().default("en"),
        keywordsToUse: z.string().optional(),
        keywordsToAvoid: z.string().optional(),
        systemPrompt: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      const tone = await createToneConfiguration({
        pageId: input.pageId,
        toneName: input.toneName,
        toneType: input.toneType as any,
        language: input.language,
        keywordsToUse: input.keywordsToUse,
        keywordsToAvoid: input.keywordsToAvoid,
        systemPrompt: input.systemPrompt,
        isDefault: input.isDefault ? 1 : 0,
      });

      // If this is set as default, update others
      if (input.isDefault && tone) {
        await setDefaultTone(input.pageId, tone.id);
      }

      return tone;
    }),

  update: protectedProcedure
    .input(
      z.object({
        toneId: z.number(),
        pageId: z.number(),
        toneName: z.string().optional(),
        toneType: z.enum(["formal", "informal", "friendly", "professional", "casual"]).optional(),
        language: z.string().optional(),
        keywordsToUse: z.string().optional(),
        keywordsToAvoid: z.string().optional(),
        systemPrompt: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      const tone = await getToneById(input.toneId);
      if (!tone || tone.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tone not found" });
      }

      const updateData: any = {};
      if (input.toneName !== undefined) updateData.toneName = input.toneName;
      if (input.toneType !== undefined) updateData.toneType = input.toneType as any;
      if (input.language !== undefined) updateData.language = input.language;
      if (input.keywordsToUse !== undefined) updateData.keywordsToUse = input.keywordsToUse;
      if (input.keywordsToAvoid !== undefined) updateData.keywordsToAvoid = input.keywordsToAvoid;
      if (input.systemPrompt !== undefined) updateData.systemPrompt = input.systemPrompt;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault ? 1 : 0;

      await updateToneConfiguration(input.toneId, updateData);

      // If this is set as default, update others
      if (input.isDefault) {
        await setDefaultTone(input.pageId, input.toneId);
      }

      return await getToneById(input.toneId);
    }),

  delete: protectedProcedure
    .input(z.object({ toneId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      const tone = await getToneById(input.toneId);
      if (!tone || tone.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tone not found" });
      }

      return await deleteToneConfiguration(input.toneId);
    }),

  setDefault: protectedProcedure
    .input(z.object({ toneId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      const tone = await getToneById(input.toneId);
      if (!tone || tone.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tone not found" });
      }

      return await setDefaultTone(input.pageId, input.toneId);
    }),
});
