import { describe, it, expect } from "vitest";
import { FiltrTonoyana, Decision } from "./filtry-tonoyana";

describe("Filtry Tonoyana", () => {
  const filtry = new FiltrTonoyana();

  describe("Quick check", () => {
    it("should pass simple, well-sourced statement", () => {
      const text =
        "According to research published in Nature (2023), coffee consumption increases alertness. This effect is well-documented.";
      expect(filtry.quickCheck(text)).toBe(true);
    });

    it("should fail absolute statement without sources", () => {
      const text = "Everyone knows that coffee always makes you smarter. 100% guaranteed.";
      expect(filtry.quickCheck(text)).toBe(false);
    });

    it("should warn on overconfident claims", () => {
      const text = "This will definitely work without any issues whatsoever.";
      const report = filtry.analyze(text);
      expect(report.decision).not.toBe(Decision.PASS);
    });
  });

  describe("Kontrargument Filter (F1)", () => {
    it("should detect absolute statements", () => {
      const text = "Everyone always needs to do this. Never skip it.";
      const report = filtry.analyze(text);
      expect(report.blockedBy).toContain("Kontrargument");
    });

    it("should accept qualified statements", () => {
      const text = "Most people find this helpful, though some may prefer alternatives.";
      const report = filtry.analyze(text);
      expect(report.issues.length).toBeLessThan(
        filtry.analyze("Everyone always needs this").issues.length
      );
    });
  });

  describe("Weryfikacja Filter (F2)", () => {
    it("should require sources for claims", () => {
      const text = "Studies show that this is true. Experts agree.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Weryfikacja")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept sourced claims", () => {
      const text = "According to https://example.com/study, this is effective.";
      const report = filtry.analyze(text);
      const weryfikacja = report.results.find((r) => r.filterName === "Weryfikacja");
      expect(weryfikacja?.score).toBeGreaterThan(70);
    });
  });

  describe("Kontekst Filter (F3)", () => {
    it("should detect oversimplification", () => {
      const text = "Just do it. It's simple. Everyone knows how.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Kontekst")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept context-aware statements", () => {
      const text =
        "In the context of web development, this approach is effective when combined with proper error handling.";
      const report = filtry.analyze(text);
      const kontekst = report.results.find((r) => r.filterName === "Kontekst");
      expect(kontekst?.score).toBeGreaterThan(60);
    });
  });

  describe("Anti-magic Filter (F4)", () => {
    it("should detect magical thinking", () => {
      const text = "The system magically works without any configuration.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Anti-magic")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept concrete mechanisms", () => {
      const text =
        "The system works by: 1) reading config, 2) initializing modules, 3) starting server on port 3000.";
      const report = filtry.analyze(text);
      const antimagic = report.results.find((r) => r.filterName === "Anti-magic");
      expect(antimagic?.score).toBeGreaterThan(70);
    });
  });

  describe("Dwuperspektywa Filter (F5)", () => {
    it("should detect polarization", () => {
      const text = "All idiots do this. Smart people never do it.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Dwuperspektywa")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept balanced perspectives", () => {
      const text =
        "Some teams prefer this approach for its simplicity, while others favor alternatives for their flexibility.";
      const report = filtry.analyze(text);
      const dwu = report.results.find((r) => r.filterName === "Dwuperspektywa");
      expect(dwu?.score).toBeGreaterThan(70);
    });
  });

  describe("Backtrack Filter (F6)", () => {
    it("should detect logical jumps", () => {
      const text = "Thus obviously, everyone knows that this must be true.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Backtrack")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept step-by-step reasoning", () => {
      const text =
        "First, we initialize the system. Then, we load configuration. Finally, we start the server. This works because each step depends on the previous one.";
      const report = filtry.analyze(text);
      const backtrack = report.results.find((r) => r.filterName === "Backtrack");
      expect(backtrack?.issues.length).toBeLessThan(2);
    });
  });

  describe("Hype Filter (F8 - new extension for marketing posts)", () => {
    it("should flag unsupported superlatives without evidence", () => {
      const text = "This is the best revolutionary solution ever. 100% guaranteed results. Game changer!";
      const report = filtry.analyze(text);
      const hype = report.results.find((r) => r.filterName === "Hype");
      expect(hype?.issues.length).toBeGreaterThan(0);
      expect(hype?.score).toBeLessThan(70);
    });

    it("should accept hype when backed by evidence", () => {
      const text = "This is the best solution according to our 2025 case study with 500 users reporting 40% faster results.";
      const report = filtry.analyze(text);
      const hype = report.results.find((r) => r.filterName === "Hype");
      expect(hype?.score).toBeGreaterThan(65);
    });
  });

  describe("Atrybucja Filter (F7)", () => {
    it("should detect attribution errors", () => {
      const text = "He failed because he's lazy. She succeeded because she's smart.";
      const report = filtry.analyze(text);
      expect(report.results.find((r) => r.filterName === "Atrybucja")?.issues.length).toBeGreaterThan(0);
    });

    it("should accept situational attribution", () => {
      const text =
        "Given the tight deadline and limited resources, the team did their best. The outcome reflects the constraints they faced.";
      const report = filtry.analyze(text);
      const atrybucja = report.results.find((r) => r.filterName === "Atrybucja");
      expect(atrybucja?.score).toBeGreaterThan(60);
    });
  });

  describe("Overall scoring", () => {
    it("should calculate average score correctly", () => {
      const goodText =
        "Based on research (https://example.com), this approach works well. However, it has limitations in certain contexts.";
      const report = filtry.analyze(goodText);
      expect(report.overallScore).toBeGreaterThan(50);
    });

    it("should block on multiple violations", () => {
      const badText =
        "Everyone always knows this works 100%. Obviously. It's magic. Idiots who disagree are wrong.";
      const report = filtry.analyze(badText);
      expect(report.decision).toBe(Decision.BLOCK);
    });

    it("should provide helpful suggestions", () => {
      const text = "This is bad. Everyone knows it. Obviously.";
      const report = filtry.analyze(text);
      expect(report.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("Summary generation", () => {
    it("should generate readable summary", () => {
      const text = "All people always need this. It's obvious.";
      const report = filtry.analyze(text);
      const summary = report.summary();
      expect(summary).toMatch(/PASS|WARN|BLOCK/);
      expect(summary).toContain("score");
    });
  });
});
