/**
 * tRPC Routers for AI-powered post generation with validation
 * Integrates Filtry Tonoyana for quality assurance
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { FiltrTonoyana, Decision } from "./validation/filtry-tonoyana";
import { getFacebookPageById } from "./db";

const filtry = new FiltrTonoyana();

export const aiGenerationRouter = router({
  /**
   * Generate a post for a specific group and location
   * Uses AI + Tone Configuration
   */
  generatePost: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        location: z.string(),
        topic: z.string().optional(),
        tone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Build system prompt
      const systemPrompt = `You are a Facebook Page manager creating engaging posts for customer acquisition.

Location: ${input.location}
Tone: ${input.tone || "professional"}
Topic: ${input.topic || "general"}

Guidelines:
- Keep posts concise and engaging (100-200 characters)
- Use clear call-to-action
- Avoid absolute statements without evidence
- Include relevant hashtags
- Consider local context
- Be authentic and genuine`;

      // Generate post with LLM
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Create an engaging Facebook post for ${input.location} about ${input.topic || "our services"}. Make it compelling for customer acquisition.`,
          },
        ],
      });

      let generatedContent = "Failed to generate post";
      const content = response.choices[0]?.message?.content;
      if (typeof content === "string") {
        generatedContent = content;
      } else if (Array.isArray(content)) {
        generatedContent = content
          .map((c: any) => (c.type === "text" ? c.text : ""))
          .join("");
      }

      // Validate with Filtry Tonoyana
      const validation = filtry.analyze(generatedContent);

      return {
        content: generatedContent,
        validation: {
          passed: validation.passed,
          decision: validation.decision,
          overallScore: validation.overallScore,
          issues: validation.issues,
          suggestions: validation.suggestions,
          blockedBy: validation.blockedBy,
          summary: validation.summary(),
        },
        canPublish: validation.decision === Decision.PASS,
        requiresReview: validation.decision === Decision.WARN,
      };
    }),

  /**
   * Validate post content against Filtry Tonoyana
   */
  validateContent: protectedProcedure
    .input(
      z.object({
        pageId: z.number(),
        content: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const page = await getFacebookPageById(input.pageId);
      if (!page || page.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      const validation = filtry.analyze(input.content);

      return {
        passed: validation.passed,
        decision: validation.decision,
        overallScore: validation.overallScore,
        issues: validation.issues,
        suggestions: validation.suggestions,
        blockedBy: validation.blockedBy,
        results: validation.results.map((r) => ({
          filterName: r.filterName,
          passed: r.passed,
          score: r.score,
          issues: r.issues,
          suggestions: r.suggestions,
          severity: r.severity,
        })),
        summary: validation.summary(),
      };
    }),
});
