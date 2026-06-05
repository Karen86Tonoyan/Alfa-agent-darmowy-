/**
 * ALFA Pipeline v1.0 — the kozacki heart of deterministic anti-hallucination.
 *
 * This is the real deal: multi-stage (LIGHT/MEDIUM/HEAVY/FULL), detectors,
 * dynamic depth selection, response simulation, full ExecutionReport +
 * Mermaid trajectory + HTML audit export.
 *
 * Philosophy: LLM is great at generation. ALFA is the ruthless, explainable,
 * falsification-obsessed gatekeeper that decides if the output is allowed
 * to touch real humans (especially on Facebook where bullshit spreads fast).
 *
 * No LLM calls inside the validation layers themselves (except in FULL simulator
 * where we deliberately re-generate variants under controlled conditions).
 */

import { FiltrTonoyana, Decision, AnalysisReport, FilterResult, Severity, HallucinationType } from "./filtry-tonoyana";
import { invokeLLM } from "../_core/llm"; // optional, only used in FULL mode when available

export interface Claim {
  text: string;
  type: "FACTUAL" | "EXECUTION" | "SECURITY" | "REPAIR" | "OPINION";
  confidence: number; // from model or heuristic
}

export interface Evidence {
  claimIndex: number;
  type: "PRIMARY_SOURCE" | "STUDY" | "DATA" | "MECHANISM" | "NONE";
  snippet: string;
  strength: number; // 0-1
}

export interface RiskAssessment {
  score: number; // 0-100
  reasons: string[];
  level: "LOW" | "MEDIUM" | "HIGH";
}

export interface PressureAssessment {
  score: number;
  reasons: string[];
  level: "LOW" | "MEDIUM" | "HIGH"; // urgency, scarcity, FOMO language
}

export interface DriftAssessment {
  score: number;
  reasons: string[];
  level: "LOW" | "MEDIUM" | "HIGH";
}

export interface ExecutionReport {
  id: string;
  timestamp: string;
  inputText: string;
  depth: "LIGHT" | "MEDIUM" | "HEAVY" | "FULL";
  risk: RiskAssessment;
  pressure: PressureAssessment;
  drift: DriftAssessment;
  baseAnalysis: AnalysisReport; // from the 8 filters
  claims: Claim[];
  evidence: Evidence[];
  simulatorVariants?: Array<{
    variant: string;
    analysis: AnalysisReport;
  }>;
  finalDecision: Decision;
  overallScore: number;
  blockedBy: string[];
  proofChain: string[]; // human-readable "because X and Y we decided Z"
  trajectoryMermaid: string;
  suggestions: string[];
  htmlReport?: string; // populated by generateHtmlReport
}

export interface PipelineOptions {
  depth?: "LIGHT" | "MEDIUM" | "HEAVY" | "FULL" | "AUTO";
  context?: string; // original prompt / topic / previous messages for drift detection
  pageId?: number;
  simulateVariants?: number; // for FULL
}

const filtry = new FiltrTonoyana();

function generateId(): string {
  return "alfa_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function detectRisk(text: string): RiskAssessment {
  const reasons: string[] = [];
  let score = 20;

  const highRisk = [
    /\b(guaranteed|100%|never fails|will definitely|life changing|make you rich|double your money)\b/i,
    /\b(medical|health|disease|cure|treatment|doctor recommended)\b/i,
    /\b(invest|trading|crypto|profit|returns)\b/i,
  ];
  highRisk.forEach((re) => {
    if (re.test(text)) {
      score += 25;
      reasons.push("High-stakes or financial/medical claim language");
    }
  });

  const level = score > 70 ? "HIGH" : score > 45 ? "MEDIUM" : "LOW";
  return { score: Math.min(100, score), reasons: reasons.slice(0, 3), level };
}

function detectPressure(text: string): PressureAssessment {
  const reasons: string[] = [];
  let score = 10;

  const urgency = [
    /\b(now|today|limited time|only \d+ (left|spots)|act fast|before it's too late|last chance)\b/i,
    /\b(scarcity|exclusive|secret|insider)\b/i,
  ];
  urgency.forEach((re) => {
    if (re.test(text)) {
      score += 22;
      reasons.push("Urgency / scarcity / FOMO language detected");
    }
  });

  const level = score > 60 ? "HIGH" : score > 35 ? "MEDIUM" : "LOW";
  return { score: Math.min(100, score), reasons: reasons.slice(0, 3), level };
}

function detectDrift(text: string, context?: string): DriftAssessment {
  if (!context) return { score: 15, reasons: ["No context provided for drift check"], level: "LOW" };

  const reasons: string[] = [];
  let score = 15;

  // Very naive but effective for now: if the output introduces completely new entities not in context
  const contextWords = new Set(context.toLowerCase().split(/\W+/).filter(w => w.length > 4));
  const textWords = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);

  const newEntities = textWords.filter(w => !contextWords.has(w) && !["this","that","with","from","your","their"].includes(w));
  if (newEntities.length > 3) {
    score += 30;
    reasons.push(`Potential topic drift: introduced new concepts (${newEntities.slice(0,3).join(", ")})`);
  }

  const level = score > 55 ? "HIGH" : score > 30 ? "MEDIUM" : "LOW";
  return { score: Math.min(100, score), reasons: reasons.slice(0, 3), level };
}

function extractClaims(text: string): Claim[] {
  // Simple but surprisingly effective claim extraction for social content
  const claims: Claim[] = [];
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  sentences.forEach((sent, idx) => {
    if (sent.length < 12) return;

    let type: Claim["type"] = "OPINION";
    if (/\b(study|research|data|according to|source|report|showed|proved)\b/i.test(sent)) type = "FACTUAL";
    else if (/\b(how to|step|process|by doing|mechanism|works because)\b/i.test(sent)) type = "EXECUTION";
    else if (/\b(risk|danger|warning|never|always avoid)\b/i.test(sent)) type = "SECURITY";
    else if (/\b(fix|repair|solve|problem|issue)\b/i.test(sent)) type = "REPAIR";

    const confidence = type === "FACTUAL" ? 0.7 : 0.5;

    claims.push({ text: sent, type, confidence });
  });

  return claims.slice(0, 6); // cap it
}

function simpleEvidenceCheck(claims: Claim[], text: string): Evidence[] {
  return claims.map((claim, i) => {
    const hasLink = /https?:\/\/\S+/.test(text);
    const hasNumber = /\d+(%|x|times|people|users|study)/i.test(claim.text);
    const hasMechanism = /\b(because|by|through|using|via|when you)\b/i.test(claim.text);

    let etype: Evidence["type"] = "NONE";
    let strength = 0.1;

    if (hasLink) { etype = "PRIMARY_SOURCE"; strength = 0.85; }
    else if (hasNumber && hasMechanism) { etype = "DATA"; strength = 0.65; }
    else if (hasMechanism) { etype = "MECHANISM"; strength = 0.5; }

    return {
      claimIndex: i,
      type: etype,
      snippet: claim.text.substring(0, 80),
      strength,
    };
  });
}

function buildMermaid(report: ExecutionReport): string {
  const lines: string[] = [
    "flowchart TD",
    `    Input["Input text<br/>${report.inputText.substring(0,60)}..."] --> Risk[Risk: ${report.risk.level} ${report.risk.score}]`,
    `    Risk --> Pressure[Pressure: ${report.pressure.level}]`,
    `    Pressure --> Drift[Drift: ${report.drift.level}]`,
    `    Drift --> Filters["8 Filters<br/>Score: ${report.baseAnalysis.overallScore}"]`,
  ];

  report.baseAnalysis.results.forEach((r, idx) => {
    const icon = r.passed ? "✓" : "✗";
    lines.push(`    Filters --> F${idx}["${icon} ${r.filterName} ${r.score}"]`);
  });

  if (report.simulatorVariants && report.simulatorVariants.length > 0) {
    lines.push(`    Filters --> Simulator[Response Simulator<br/>${report.simulatorVariants.length} variants]`);
    report.simulatorVariants.forEach((v, i) => {
      lines.push(`    Simulator --> V${i}["Variant ${i+1}<br/>${v.analysis.decision} ${v.analysis.overallScore}"]`);
    });
  }

  lines.push(`    Filters --> Gate["Release Gate<br/>${report.finalDecision}"]`);
  lines.push(`    Gate --> Decision["${report.finalDecision}<br/>Score ${report.overallScore}"]`);

  return lines.join("\n");
}

function buildProofChain(report: ExecutionReport): string[] {
  const chain: string[] = [];

  if (report.risk.level === "HIGH") chain.push(`High risk detected (${report.risk.reasons[0] || ""})`);
  if (report.pressure.level === "HIGH") chain.push("High pressure/scarcity language present");
  if (report.drift.level === "HIGH") chain.push("Significant drift from provided context");

  const blocked = report.baseAnalysis.blockedBy;
  if (blocked.length) chain.push(`Blocked by filters: ${blocked.join(", ")}`);

  const weakEvidence = report.evidence.filter(e => e.strength < 0.4).length;
  if (weakEvidence > 1) chain.push(`${weakEvidence} claims have weak or missing evidence`);

  if (report.finalDecision === "BLOCK") {
    chain.push("Decision: BLOCK — output contains unacceptably high hallucination risk");
  } else if (report.finalDecision === "WARN") {
    chain.push("Decision: WARN — human review strongly recommended before publishing");
  } else {
    chain.push("Decision: PASS — meets ALFA standards for this depth");
  }

  return chain;
}

export class AlfaPipeline {
  private snapshotPath = "storage/alfa-snapshots.jsonl"; // simple append log

  async analyze(text: string, opts: PipelineOptions = {}): Promise<ExecutionReport> {
    const depth = opts.depth === "AUTO" || !opts.depth ? this.chooseDepth(text, opts.context) : opts.depth;
    const base = filtry.analyze(text);

    const risk = detectRisk(text);
    const pressure = detectPressure(text);
    const drift = detectDrift(text, opts.context);

    const claims = extractClaims(text);
    const evidence = simpleEvidenceCheck(claims, text);

    let simulatorVariants: ExecutionReport["simulatorVariants"];

    if (depth === "FULL" && claims.length > 0) {
      // Response simulator: try to get cleaner variants (best effort)
      try {
        // We only do this if invokeLLM is available in this environment
        const simPrompt = `Rewrite the following text to be more precise, sourced where possible, and free of absolute claims or hype. Keep the core meaning and marketing intent but add caution and evidence language.\n\nOriginal: ${text}`;
        const res = await invokeLLM({ messages: [{ role: "user", content: simPrompt }] });
        const variantText = String(res.choices?.[0]?.message?.content || "").trim();

        if (variantText && variantText.length > 20) {
          const vAnalysis = filtry.analyze(variantText);
          simulatorVariants = [{ variant: variantText, analysis: vAnalysis }];
        }
      } catch (e) {
        // LLM not available in this context (pure CLI) — that's fine, we still have strong filter results
      }
    }

    // Final gate
    let finalDecision = base.decision;
    const highFlags = [risk, pressure, drift].filter(d => d.level === "HIGH").length +
                      base.results.filter(r => r.severity === Severity.HIGH).length;

    if (highFlags >= 2 && finalDecision !== Decision.BLOCK) {
      finalDecision = Decision.WARN;
    }
    if (base.blockedBy.length >= 2) finalDecision = Decision.BLOCK;

    const overall = Math.floor((base.overallScore + (100 - risk.score) + (100 - pressure.score)) / 3);

    const report: ExecutionReport = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      inputText: text,
      depth,
      risk,
      pressure,
      drift,
      baseAnalysis: base,
      claims,
      evidence,
      simulatorVariants,
      finalDecision,
      overallScore: overall,
      blockedBy: base.blockedBy,
      proofChain: [],
      trajectoryMermaid: "",
      suggestions: base.suggestions,
    };

    report.proofChain = buildProofChain(report);
    report.trajectoryMermaid = buildMermaid(report);

    // Persist snapshot (local + attempt graph)
    this.logSnapshot(report);

    return report;
  }

  private chooseDepth(text: string, context?: string): "LIGHT" | "MEDIUM" | "HEAVY" | "FULL" {
    const risk = detectRisk(text);
    const pressure = detectPressure(text);
    if (risk.level === "HIGH" || pressure.level === "HIGH") return "FULL";
    if (risk.level === "MEDIUM" || pressure.level === "MEDIUM" || (context && context.length > 40)) return "HEAVY";
    return "MEDIUM";
  }

  private logSnapshot(report: ExecutionReport) {
    // Local JSONL snapshot (works everywhere)
    try {
      const fs = require("fs");
      const line = JSON.stringify({
        id: report.id,
        ts: report.timestamp,
        decision: report.finalDecision,
        score: report.overallScore,
        blocked: report.blockedBy,
        textPreview: report.inputText.substring(0, 120),
      }) + "\n";
      fs.appendFileSync(this.snapshotPath, line);
    } catch {}

    // Note: real graph logging happens via external scripts using alfa-knowledge MCP
    // (see scripts/alfa-knowledge-bridge.ts)
  }

  generateHtmlReport(report: ExecutionReport): string {
    // Self-contained, beautiful, no external deps except CDNs for Mermaid + Tailwind
    const statusColor = report.finalDecision === "PASS" ? "#22c55e" : report.finalDecision === "WARN" ? "#eab308" : "#ef4444";

    const filterRows = report.baseAnalysis.results.map(r => {
      const icon = r.passed ? "✅" : "❌";
      return `<tr>
        <td>${icon} <strong>${r.filterName}</strong></td>
        <td>${r.score}</td>
        <td><span style="color:${r.severity === "HIGH" ? "#ef4444" : "#eab308"}">${r.severity}</span></td>
        <td>${r.issues.join("<br>") || "—"}</td>
        <td>${r.suggestions.join("<br>") || "—"}</td>
      </tr>`;
    }).join("");

    const mermaidScript = `
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <script>mermaid.initialize({startOnLoad:true});</script>
    `;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ALFA Report • ${report.finalDecision}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{font-family: ui-sans-serif, system-ui;}</style>
</head>
<body class="bg-zinc-950 text-zinc-200 p-8">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-8">
      <div>
        <div class="text-4xl font-bold tracking-tighter">ALFA</div>
        <div class="text-zinc-500">Anti-Hallucination Logic Framework • v1.1</div>
      </div>
      <div style="background:${statusColor}" class="px-6 py-2 rounded-2xl text-black font-mono text-xl font-bold">
        ${report.finalDecision} • ${report.overallScore}/100
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-8">
      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div class="text-xs uppercase tracking-widest text-zinc-500">Risk</div>
        <div class="text-3xl font-semibold mt-1">${report.risk.level} <span class="text-sm text-zinc-400">(${report.risk.score})</span></div>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div class="text-xs uppercase tracking-widest text-zinc-500">Pressure</div>
        <div class="text-3xl font-semibold mt-1">${report.pressure.level}</div>
      </div>
      <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
        <div class="text-xs uppercase tracking-widest text-zinc-500">Drift</div>
        <div class="text-3xl font-semibold mt-1">${report.drift.level}</div>
      </div>
    </div>

    <div class="mb-8">
      <div class="font-mono text-xs text-zinc-500 mb-2">TRAJECTORY</div>
      <pre class="mermaid bg-black p-6 rounded-3xl text-sm overflow-auto">${report.trajectoryMermaid}</pre>
    </div>

    <div class="mb-8">
      <div class="font-mono text-xs text-zinc-500 mb-2">FILTER RESULTS</div>
      <table class="w-full text-sm">
        <thead class="text-left border-b border-zinc-800 text-zinc-400">
          <tr><th class="py-2">Filter</th><th>Score</th><th>Severity</th><th>Issues</th><th>Suggestions</th></tr>
        </thead>
        <tbody class="divide-y divide-zinc-800">
          ${filterRows}
        </tbody>
      </table>
    </div>

    <div class="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-sm">
      <div class="font-mono text-xs text-zinc-500 mb-3">PROOF CHAIN</div>
      <ul class="space-y-1.5">
        ${report.proofChain.map(p => `<li class="flex gap-2"><span class="text-emerald-400">→</span> ${p}</li>`).join("")}
      </ul>
    </div>

    <div class="mt-8 text-[10px] text-zinc-500 font-mono">
      Generated ${report.timestamp} • Depth: ${report.depth} • ID: ${report.id}<br>
      This report was produced by deterministic filters only. No LLM was used in the validation itself.
    </div>
  </div>
  ${mermaidScript}
</body>
</html>`;

    return html;
  }
}

export const alfa = new AlfaPipeline();
export type { ExecutionReport };
