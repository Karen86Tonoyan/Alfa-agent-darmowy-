/**
 * tRPC Routers for AI-powered post generation with validation
 * Integrates Filtry Tonoyana for quality assurance
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { alfa } from "./validation/alfa-pipeline"; // KOZACKI full pipeline (was simple FiltrTonoyana)
import { getFacebookPageById } from "./db";

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

      // KOZACKI ALFA Pipeline — full detectors + dynamic depth + beautiful report
      const pipelineReport = await alfa.analyze(generatedContent, {
        depth: "HEAVY",
        context: `Location: ${input.location}. Topic: ${input.topic || "general"}. Tone: ${input.tone || "professional"}`,
      });

      return {
        content: generatedContent,
        validation: {
          passed: pipelineReport.finalDecision === "PASS",
          decision: pipelineReport.finalDecision,
          overallScore: pipelineReport.overallScore,
          issues: pipelineReport.baseAnalysis.issues,
          suggestions: pipelineReport.baseAnalysis.suggestions,
          blockedBy: pipelineReport.blockedBy,
          depth: pipelineReport.depth,
          risk: pipelineReport.risk,
          pressure: pipelineReport.pressure,
          summary: pipelineReport.baseAnalysis.summary(),
        },
        canPublish: pipelineReport.finalDecision === "PASS",
        requiresReview: pipelineReport.finalDecision === "WARN",
        fullAlfaReport: {
          proofChain: pipelineReport.proofChain,
          trajectory: pipelineReport.trajectoryMermaid,
        },
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

      // Use the full kozacki pipeline for rich feedback in the UI
      const report = await alfa.analyze(input.content, { depth: "HEAVY" });

      return {
        passed: report.finalDecision === "PASS",
        decision: report.finalDecision,
        overallScore: report.overallScore,
        issues: report.baseAnalysis.issues,
        suggestions: report.baseAnalysis.suggestions,
        blockedBy: report.blockedBy,
        depth: report.depth,
        risk: report.risk,
        pressure: report.pressure,
        results: report.baseAnalysis.results.map((r) => ({
          filterName: r.filterName,
          passed: r.passed,
          score: r.score,
          issues: r.issues,
          suggestions: r.suggestions,
          severity: r.severity,
        })),
        summary: report.baseAnalysis.summary(),
        proofChain: report.proofChain,
      };
    }),
});
