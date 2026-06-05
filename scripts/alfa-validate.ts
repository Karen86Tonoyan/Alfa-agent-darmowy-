#!/usr/bin/env tsx
/**
 * Legacy thin wrapper — use `pnpm alfa check "text"` or `pnpm alfa pipeline ...` for the full kozacki experience.
 * Kept for backward compatibility.
 */
import { alfa } from "../server/validation/alfa-pipeline";

/**
 * Legacy thin wrapper now powered by the full kozacki AlfaPipeline.
 * Kept for backward compatibility with existing calls.
 */
async function main() {
  const text = process.argv.slice(2).join(" ").trim();

  if (!text) {
    console.error("Usage: pnpm alfa:check -- \"text\"   (recommended: pnpm alfa pipeline --depth full ...)");
    process.exit(1);
  }

  const report = await alfa.analyze(text, { depth: "MEDIUM" });

  console.log("\n=== ALFA (kozacki) ===\n");
  console.log(`Decision: ${report.finalDecision} | score ${report.overallScore}/100`);
  console.log(report.baseAnalysis.summary());

  console.log("\n(For the full experience with detectors, trajectory & HTML: pnpm alfa pipeline --html report.html \"text\")");

  process.exit(report.finalDecision === "BLOCK" ? 2 : report.finalDecision === "WARN" ? 1 : 0);
}

main();
