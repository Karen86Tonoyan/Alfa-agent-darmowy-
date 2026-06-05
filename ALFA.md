# ALFA — Anti-Hallucination Logic Framework

**Deterministic. Explainable. Ruthless. Free.**

ALFA is not another "AI safety" wrapper that adds more LLM calls on top of LLM calls.

It is a **deterministic guardrail layer** that decides whether generated text is allowed to reach real humans — especially on platforms like Facebook where bullshit travels at the speed of light.

## Core Philosophy

- **Zero LLM in the decision path.** The filters, risk/pressure/drift detectors, evidence scoring, and final gate are pure, auditable logic.
- **Falsification first** (Popper). Strong claims must be able to be wrong.
- **Multiple perspectives by force** (Kahneman). Every absolute gets challenged.
- **Attribution honesty** (Heider/Kelley). Outcomes are rarely just "because the person is X".
- **Evidence has levels.** "Studies show" without citation is noise.
- **Hype without proof is violence** against the reader's time and trust.

If the system cannot explain *why* it blocked or warned something in human-readable terms (proof chain + trajectory), it has failed its job.

## The 8 Filters (Filtry Tonoyana)

1. **Kontrargument** — Absolute statements without counter-balance ("always", "everyone", "100%", "never").
2. **Weryfikacja** — Claims that sound sourced but have zero sources.
3. **Kontekst** — Oversimplification and context-free assertions.
4. **Anti-magic** — "It just works", "magically", no mechanism described.
5. **Dwuperspektywa** — Polarization, demonization, "smart people do X, idiots do Y".
6. **Backtrack** — Logical jumps ("obviously", "thus everyone knows").
7. **Atrybucja** — Fundamental attribution error (character vs situation).
8. **Hype** (new in v1.1) — Marketing superlatives ("revolutionary", "guaranteed", "best ever", "game changer") without evidence.

Each filter returns: score (0-100), severity, issues, suggestions, hallucination type.

## The Pipeline (the real power)

```
Input
  ↓
Risk Detector (medical/financial/high-stakes claims?)
  ↓
Pressure Detector (urgency, scarcity, FOMO?)
  ↓
Drift Detector (does this stay on topic vs provided context?)
  ↓
Filtry Tonoyana (the 8 filters)
  ↓
Claim Extraction + Evidence Strength
  ↓
[HEAVY+] Query alfa-knowledge graph for similar past failures
  ↓
[FULL] Response Simulator → generate cleaner variants → re-ALFA them
  ↓
Release Gate (HIGH flags, multiple blocks, weak evidence → WARN/BLOCK)
  ↓
ExecutionReport + Mermaid Trajectory + Self-contained HTML
```

**Depths:**
- `LIGHT` — quickCheck only (volume)
- `MEDIUM` — full 8 filters
- `HEAVY` — + detectors + evidence + graph lookup
- `FULL` — + simulator + full proof system (use for high-stakes or live customer replies)

## Standalone CLI (darmowy & reusable)

```bash
# Quick check
pnpm alfa check "text here"

# Full kozacki experience
pnpm alfa pipeline --depth full --context "promote our bakery" --html report.html "text"

# Just the pretty audit
pnpm alfa report --html audit.html "text"
```

The HTML reports are completely self-contained (Tailwind + Mermaid via CDN). Perfect for audits, client handoff, or internal review logs.

## Integration with the Facebook Agent

The agent now uses the full pipeline:

- Post generation → HEAVY (context = location + topic + tone)
- Live message replies → FULL (highest pressure, real humans on the other side)
- Every BLOCK automatically notifies the owner with the proof chain.

You get rich `validation` objects back in tRPC responses containing risk/pressure, proofChain, trajectory, etc.

## The Knowledge Graph (alfa-knowledge MCP)

Every serious BLOCK or WARN should live forever.

This repo seeds and can feed the shared ALFA memory graph:
- Philosophical foundations
- Real Facebook hallucination patterns
- Decision logic & thresholds
- Good vs bad examples with explanations

When running in an environment with the `alfa-knowledge` MCP available (e.g. this Grok session), you can run bridge scripts to:
- Log new failures
- Query "have we seen similar overconfident medical claims before?"
- Evolve the filter patterns over time

## Why This Exists

Most "AI content tools" optimize for volume and virality.

This one optimizes for **not being ashamed** of what the AI puts your name on.

If a claim cannot survive deterministic, multi-perspective, evidence-aware scrutiny, it does not get published — even if it would have performed well.

## Future / Kozacki Roadmap (ideas)

- More sophisticated claim parsing (not just sentence split)
- ModelStateProfiler (detect when the generator is in "confident bullshit" mode)
- Automatic pattern mining from the snapshot DB + graph
- Browser automation bridge for group posting (the one big missing piece due to FB deprecation)
- Public standalone package so other people can `import { alfa } from "alfa-guardrails"`

---

**ALFA is not here to make AI "safer" in the corporate sense.**

It is here to make AI **less full of shit** — one falsifiable, attributable, evidence-backed sentence at a time.

Built by Karen Tonoyan. Free. Deterministic. With teeth.

---

*Generated reports live in `/demos/`. Run the CLI yourself. Feed the graph. Make it stronger.*