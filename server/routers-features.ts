/**
 * tRPC Routers for Skills, Knowledge Base, and Filters
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createSkill,
  getSkillsByPage,
  getSkillById,
  updateSkill,
  deleteSkill,
  createKnowledgeArticle,
  getKnowledgeByPage,
  getKnowledgeById,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  searchKnowledge,
  createFilter,
  getFiltersByPage,
  getFilterById,
  updateFilter,
  deleteFilter,
  getSavedFilters,
  createFilterCondition,
  getFilterConditions,
  deleteFilterCondition,
  deleteFilterConditionsByFilter,
} from "./db-features";
import { getFacebookPageById } from "./db";

// ============ SKILLS ROUTER ============

export const skillsRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getSkillsByPage(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        skillName: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        template: z.string().optional(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await createSkill({
        pageId: input.pageId,
        skillName: input.skillName,
        description: input.description,
        category: input.category,
        template: input.template,
        systemPrompt: input.systemPrompt,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        skillId: z.number(),
        pageId: z.number(),
        skillName: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        template: z.string().optional(),
        systemPrompt: z.string().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const skill = await getSkillById(input.skillId);
      if (!skill || skill.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }
      return await updateSkill(input.skillId, {
        skillName: input.skillName,
        description: input.description,
        category: input.category,
        template: input.template,
        systemPrompt: input.systemPrompt,
        isActive: input.isActive,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ skillId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const skill = await getSkillById(input.skillId);
      if (!skill || skill.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found" });
      }
      return await deleteSkill(input.skillId);
    }),
});

// ============ KNOWLEDGE BASE ROUTER ============

export const knowledgeRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getKnowledgeByPage(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        title: z.string().min(1),
        content: z.string().min(1),
        category: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await createKnowledgeArticle({
        pageId: input.pageId,
        title: input.title,
        content: input.content,
        category: input.category,
        tags: input.tags,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        articleId: z.number(),
        pageId: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        isPublished: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const article = await getKnowledgeById(input.articleId);
      if (!article || article.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      }
      return await updateKnowledgeArticle(input.articleId, {
        title: input.title,
        content: input.content,
        category: input.category,
        tags: input.tags,
        isPublished: input.isPublished,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ articleId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const article = await getKnowledgeById(input.articleId);
      if (!article || article.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
      }
      return await deleteKnowledgeArticle(input.articleId);
    }),
});

// ============ FILTERS ROUTER ============

export const filtersRouter = router({
  list: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getFiltersByPage(input.pageId);
    }),

  listSaved: protectedProcedure
    .input(z.object({ pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await getSavedFilters(input.pageId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        filterName: z.string().min(1),
        description: z.string().optional(),
        filterType: z.enum(["location", "size", "category", "engagement", "custom", "combined"]),
        isSaved: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await createFilter({
        pageId: input.pageId,
        filterName: input.filterName,
        description: input.description,
        filterType: input.filterType,
        isSaved: input.isSaved || 0,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        filterId: z.number(),
        pageId: z.number(),
        filterName: z.string().optional(),
        description: z.string().optional(),
        filterConfig: z.string().optional(),
        isActive: z.number().optional(),
        isSaved: z.number().optional(),
        matchedGroupCount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const filter = await getFilterById(input.filterId);
      if (!filter || filter.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Filter not found" });
      }
      return await updateFilter(input.filterId, {
        filterName: input.filterName,
        description: input.description,
        filterConfig: input.filterConfig,
        isActive: input.isActive,
        isSaved: input.isSaved,
        matchedGroupCount: input.matchedGroupCount,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ filterId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const filter = await getFilterById(input.filterId);
      if (!filter || filter.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Filter not found" });
      }
      // Delete all conditions first
      await deleteFilterConditionsByFilter(input.filterId);
      return await deleteFilter(input.filterId);
    }),

  getConditions: protectedProcedure
    .input(z.object({ filterId: z.number(), pageId: z.number() }))
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const filter = await getFilterById(input.filterId);
      if (!filter || filter.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Filter not found" });
      }
      return await getFilterConditions(input.filterId);
    }),

  addCondition: protectedProcedure
    .input(
      z.object({
        filterId: z.number(),
        pageId: z.number(),
        conditionType: z.string().min(1),
        operator: z.string().min(1),
        value: z.string().optional(),
        logicalOperator: z.enum(["AND", "OR"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      const filter = await getFilterById(input.filterId);
      if (!filter || filter.pageId !== input.pageId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Filter not found" });
      }
      return await createFilterCondition({
        filterId: input.filterId,
        conditionType: input.conditionType,
        operator: input.operator,
        value: input.value,
        logicalOperator: input.logicalOperator,
      });
    }),

  removeCondition: protectedProcedure
    .input(z.object({ conditionId: z.number(), pageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return await deleteFilterCondition(input.conditionId);
    }),
});
