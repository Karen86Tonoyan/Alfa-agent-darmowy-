#!/usr/bin/env tsx
/**
 * Standalone ALFA / Filtry Tonoyana validator
 * Usage:
 *   npx tsx scripts/alfa-validate.ts "your text here"
 *   pnpm alfa:check -- "post content to validate before publishing"
 *
 * Exit codes:
 *   0 = PASS (safe to publish)
 *   1 = WARN (review recommended)
 *   2 = BLOCK (do not publish, fix issues)
 *
 * This makes the core ALFA logic usable outside the full Facebook agent ("darmowy" / reusable).
 */

import { FiltrTonoyana, Decision } from "../server/validation/filtry-tonoyana.ts";

const filtry = new FiltrTonoyana();

function main() {
  const text = process.argv.slice(2).join(" ").trim();

  if (!text) {
    console.error("Usage: pnpm alfa:check -- \"the text to validate with Filtry Tonoyana / ALFA\"");
    console.error("Example: pnpm alfa:check -- \"According to our 2024 study, this works for 87% of users in similar conditions.\"");
    process.exit(1);
  }

  const report = filtry.analyze(text);

  console.log("\n=== ALFA / Filtry Tonoyana Validation ===\n");
  console.log(report.summary());
  console.log("\n--- Details ---");

  for (const r of report.results) {
    const icon = r.passed ? "✓" : "✗";
    console.log(`${icon} ${r.filterName.padEnd(16)} score=${String(r.score).padStart(3)}  ${r.severity.padEnd(6)}  issues=${r.issues.length}`);
    if (r.issues.length) {
      r.issues.forEach(i => console.log(`    - ${i}`));
    }
    if (r.suggestions.length) {
      console.log(`    suggestions: ${r.suggestions.join("; ")}`);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Overall: ${report.decision} (score ${report.overallScore}/100)`);
  if (report.issues.length) {
    console.log("Issues:", report.issues.join(" | "));
  }
  if (report.suggestions.length) {
    console.log("Suggestions:", report.suggestions.slice(0, 3).join(" | "));
  }

  console.log("\n(Seeded knowledge graph examples available via alfa-knowledge MCP for cross-agent learning.)\n");

  // Exit codes for CI / scripting
  if (report.decision === Decision.BLOCK) {
    process.exit(2);
  } else if (report.decision === Decision.WARN) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
