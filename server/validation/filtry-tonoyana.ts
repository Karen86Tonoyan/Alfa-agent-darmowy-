/**
 * Filtry Tonoyana v1.1 — 8 deterministycznych filtrów anty-halucynacyjnych (ALFA core)
 * Ported + extended for Facebook Page Agent + standalone "darmowy" use.
 *
 * Now includes F8 Hype (marketing overclaim detector) for customer-acquisition posts.
 *
 * Podstawy teoretyczne:
 *  F1 Kontrargument  — Popper, zasada falsyfikacji
 *  F2 Weryfikacja    — cross-reference źródeł
 *  F3 Kontekst       — analiza granic kontekstu
 *  F4 Anti-magic     — eliminacja wishful thinking
 *  F5 Dwuperspektywa — teoria perspektywy (Kahneman)
 *  F6 Backtrack      — śledzenie logiki rozumowania
 *  F7 Atrybucja      — teoria atrybucji (Heider, Kelley)
 *  F8 Hype           — niepoparte superlatywy/gwarancje (rozszerzenie 2026)
 *
 * Standalone: pnpm alfa:check -- "your text"
 * Knowledge graph seeding via alfa-knowledge MCP (persistent ALFA memories across agents).
 */

export enum Severity {
  INFO = "INFO",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum HallucinationType {
  OVERCONFIDENT = "OVERCONFIDENT",
  UNSOURCED_CLAIM = "UNSOURCED_CLAIM",
  CONTEXT_DRIFT = "CONTEXT_DRIFT",
  WISHFUL_THINKING = "WISHFUL_THINKING",
  POLARIZATION = "POLARIZATION",
  LOGICAL_JUMP = "LOGICAL_JUMP",
  ATTRIBUTION_ERROR = "ATTRIBUTION_ERROR",
}

export enum Decision {
  PASS = "PASS",
  WARN = "WARN",
  BLOCK = "BLOCK",
}

export interface FilterResult {
  filterName: string;
  passed: boolean;
  score: number; // 0–100
  confidence: number; // 0.0–1.0
  issues: string[];
  suggestions: string[];
  hallucinationTypes: HallucinationType[];
  severity: Severity;
  metadata: Record<string, any>;
}

export interface AnalysisReport {
  text: string;
  passed: boolean;
  overallScore: number;
  decision: Decision;
  results: FilterResult[];
  issues: string[];
  suggestions: string[];
  blockedBy: string[];
  summary(): string;
}

class BaseFilter {
  name = "BaseFilter";
  description = "";
  blockThreshold = 40;

  protected createResult(
    passed: boolean,
    score: number,
    confidence: number,
    issues: string[],
    suggestions: string[],
    hallucinationTypes: HallucinationType[] = [],
    severity: Severity = Severity.LOW,
    metadata: Record<string, any> = {}
  ): FilterResult {
    return {
      filterName: this.name,
      passed,
      score: Math.max(0, Math.min(100, score)),
      confidence,
      issues,
      suggestions,
      hallucinationTypes,
      severity,
      metadata,
    };
  }
}

// F1: KONTRARGUMENT — Popper, szukaj falsyfikacji zanim zaakceptujesz twierdzenie
class KontrargumentFilter extends BaseFilter {
  name = "Kontrargument";
  description = "Szuka absolutnych stwierdzeń bez kontrprzykładów";

  private absolutePatterns = [
    /\bwszystk[iey]\b/i,
    /\bzawsze\b/i,
    /\bnigdy\b/i,
    /\bżaden\b/i,
    /\bkażdy\b/i,
    /\bnikt\b/i,
    /\bna pewno\b/i,
    /\bbez wątpienia\b/i,
    /\babsolutnie\b/i,
    /\b100%\b/i,
    /\bniemożliwe\b/i,
    /\balways\b/i,
    /\bnever\b/i,
    /\beveryone\b/i,
    /\bno one\b/i,
    /\bdefinitely\b/i,
    /\babsolutely\b/i,
    /\bimpossible\b/i,
  ];

  private alternativePatterns = [
    /\bjednak\b/i,
    /\bale\b/i,
    /\bz drugiej strony\b/i,
    /\balternatywnie\b/i,
    /\bmoże też\b/i,
    /\bwarto rozważyć\b/i,
    /\bhowever\b/i,
    /\bon the other hand\b/i,
    /\balternatively\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const absoluteCount = this.absolutePatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const altCount = this.alternativePatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );

    if (absoluteCount > 0) {
      issues.push(`Absolutnych stwierdzeń: ${absoluteCount}`);
      htypes.push(HallucinationType.OVERCONFIDENT);
    }
    if (absoluteCount > 0 && altCount === 0) {
      suggestions.push("Dodaj alternatywne perspektywy lub złagodź sformułowania");
    }

    const score = Math.max(10, 90 - absoluteCount * 15 + altCount * 8);
    const confidence = Math.max(0.2, 0.9 - absoluteCount * 0.15 + altCount * 0.05);
    // Stricter: multiple absolutes without balancing language should not pass the filter
    const passed = (score >= this.blockThreshold && absoluteCount < 2) || (absoluteCount >= 2 && altCount >= 2);
    const severity =
      absoluteCount >= 3 ? Severity.HIGH :
      absoluteCount >= 2 ? Severity.HIGH :
      (absoluteCount >= 1 && /definitely|absolutely|100%|never|always|wszystko/i.test(text)) ? Severity.HIGH :
      absoluteCount >= 1 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, confidence, issues, suggestions, htypes, severity, {
      absolute: absoluteCount,
      alternatives: altCount,
    });
  }
}

// F2: WERYFIKACJA — Twierdzenia bez źródeł = czerwona flaga
class WeryfikacjaFilter extends BaseFilter {
  name = "Weryfikacja";
  description = "Sprawdza czy twierdzenia mają źródła";

  private claimPatterns = [
    /\bbadania pokazują\b/i,
    /\bnauka udowodniła\b/i,
    /\beksperci twierdzą\b/i,
    /\bwg statystyk\b/i,
    /\bdane wskazują\b/i,
    /\braport mówi\b/i,
    /\bstudies show\b/i,
    /\bresearch proves\b/i,
    /\bexperts say\b/i,
    /\baccording to data\b/i,
  ];

  private sourcePatterns = [
    /\bwg\b/i,
    /\bwedług\b/i,
    /\bźródło:\b/i,
    /\bcytując\b/i,
    /https?:\/\/\S+/,
    /\bdoi:\S+/,
    /\baccording to\b/i,
    /\bciting\b/i,
    /\bsource:\b/i,
    /\bref\.\b/i,
    /\(20[12]\d\)/,
    /\[\d+\]/,
    /\bdokumentacja\b/i,
    /\boświadczenie\b/i,
    /\bprivacy statement\b/i,
    /\braport techniczny\b/i,
    /\bspecyfikacja\b/i,
    /\bwhitepaper\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const claims = this.claimPatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);
    const sources = this.sourcePatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);

    const ratio = claims > 0 ? sources / claims : 1.0;

    if (claims > 0 && sources === 0) {
      issues.push(`Twierdzenia bez źródeł: ${claims}`);
      htypes.push(HallucinationType.UNSOURCED_CLAIM);
      suggestions.push("Podaj źródła lub zmień sformułowanie na ostrożniejsze");
    }

    const score = claims === 0 ? 90 : Math.max(20, Math.floor(ratio * 80));
    const passed = score >= this.blockThreshold;
    const severity =
      claims >= 2 && sources === 0
        ? Severity.HIGH
        : claims >= 1 && sources === 0
          ? Severity.MEDIUM
          : Severity.LOW;

    return this.createResult(passed, score, 0.85, issues, suggestions, htypes, severity, {
      claims,
      sources,
    });
  }
}

// F3: KONTEKST — Wykrywa context drift
class KontekstFilter extends BaseFilter {
  name = "Kontekst";
  description = "Weryfikuje spójność odpowiedzi z kontekstem";

  private oversimplificationPatterns = [
    /\bpo prostu\b/i,
    /\bto oczywiste\b/i,
    /\bkażdy wie\b/i,
    /\bto proste\b/i,
    /\bwystarczy\b/i,
    /\bjust\b/i,
    /\bobviously\b/i,
    /\beveryone knows\b/i,
    /\bsimply\b/i,
    /\ball you need\b/i,
  ];

  private missingContextPatterns = [
    /\bbez kontekstu\b/i,
    /\bnie wiem co masz na myśli\b/i,
    /\bnieokreślony\b/i,
    /\bniejasne\b/i,
    /\bwithout context\b/i,
    /\bunclear\b/i,
    /\bambiguous\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const simpCount = this.oversimplificationPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const missingCount = this.missingContextPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );

    if (simpCount > 0) {
      issues.push(`Potencjalne uproszczenia: ${simpCount}`);
      htypes.push(HallucinationType.CONTEXT_DRIFT);
      suggestions.push("Uwzględnij pełen kontekst problemu");
    }

    if (missingCount > 0) {
      issues.push("Brak niezbędnego kontekstu");
      suggestions.push("Zdefiniuj kontekst przed stwierdzeniem");
    }

    const score = Math.max(15, 90 - simpCount * 10 - missingCount * 20);
    const passed = score >= this.blockThreshold;
    const severity =
      missingCount > 0 ? Severity.HIGH : simpCount >= 2 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, 0.8, issues, suggestions, htypes, severity, {
      simplifications: simpCount,
      missing_context: missingCount,
    });
  }
}

// F4: ANTI-MAGIC — Wishful thinking i magiczne myślenie
class AntiMagicFilter extends BaseFilter {
  name = "Anti-magic";
  description = "Wykrywa wishful thinking i magiczne założenia";

  private magicPatterns = [
    /\bsam[ao] się\b/i,
    /\bautomagicznie\b/i,
    /\bcudownie\b/i,
    /\bbez wysiłku\b/i,
    /\bnatychmiast\b.*\bwyniki\b/i,
    /\bmagically\b/i,
    /\bautomagically\b/i,
    /\binstantly\b/i,
    /\bwithout effort\b/i,
    /\bmiraculously\b/i,
    /\bpo prostu działa\b/i,
    /\bjust works\b/i,
  ];

  private vagueCommandPatterns = [
    /\bcoś tam\b/i,
    /\bgdzieś\b/i,
    /\bjakoś\b/i,
    /\bmniej więcej\b/i,
    /\bsomehow\b/i,
    /\bsomewhere\b/i,
    /\bsomething like\b/i,
  ];

  private concretePatterns = [
    /\bkonkretnie\b/i,
    /\bdokładnie\b/i,
    /\bkrok po kroku\b/i,
    /\bspecifically\b/i,
    /\bexactly\b/i,
    /\bstep by step\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const magicCount = this.magicPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const vagueCount = this.vagueCommandPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const concreteCount = this.concretePatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );

    if (magicCount > 0) {
      issues.push(`Magiczne myślenie: ${magicCount} wzorców`);
      htypes.push(HallucinationType.WISHFUL_THINKING);
      suggestions.push("Opisz konkretny mechanizm działania");
    }

    if (vagueCount > 0) {
      issues.push(`Niejasne polecenia: ${vagueCount}`);
      suggestions.push("Zastąp niejasne sformułowania konkretnymi krokami");
    }

    const score = Math.max(10, 85 - magicCount * 20 - vagueCount * 8 + concreteCount * 5);
    const passed = score >= this.blockThreshold;
    const severity =
      magicCount >= 2 ? Severity.HIGH : magicCount >= 1 || vagueCount >= 2 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, 0.75, issues, suggestions, htypes, severity, {
      magic: magicCount,
      vague: vagueCount,
      concrete: concreteCount,
    });
  }
}

// F5: DWUPERSPEKTYWA — Kahneman, każda sytuacja ma co najmniej dwie strony
class DwuperspektywaFilter extends BaseFilter {
  name = "Dwuperspektywa";
  description = "Wykrywa polaryzację i brak alternatywnej perspektywy";

  private polarizationPatterns = [
    /\bawanturnicy\b/i,
    /\bidioci\b/i,
    /\bzłoczyńcy\b/i,
    /\bwrogowie\b/i,
    /\bidiots\b/i,
    /\bvillains\b/i,
    /\benemies\b/i,
    /\bevildoers\b/i,
    /\bkłamcy\b/i,
    /\bliars\b/i,
  ];

  private demonizationPatterns = [
    /\bzawsze kłamią\b/i,
    /\bnigdy nie mówią prawdy\b/i,
    /\bsą absolutnie\s+\w+\b/i,
    /\bwyłącznie negatywn\b/i,
    /\balways lie\b/i,
    /\bnever tell truth\b/i,
  ];

  private dualPatterns = [
    /\bz perspektywy\b/i,
    /\bz jednej strony\b/i,
    /\bz drugiej\b/i,
    /\bjednocześnie\b/i,
    /\bperspective\b/i,
    /\bon one hand\b/i,
    /\bon the other\b/i,
    /\bhowever\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const polarCount = this.polarizationPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const demonCount = this.demonizationPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const dualCount = this.dualPatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);

    if (polarCount > 0) {
      issues.push(`Polaryzacja: ${polarCount} wzorców`);
      htypes.push(HallucinationType.POLARIZATION);
      suggestions.push("Uwzględnij perspektywę drugiej strony");
    }

    if (demonCount > 0) {
      issues.push(`Demonizacja: ${demonCount} wzorców`);
      suggestions.push("Unikaj absolutnych negatywnych ocen");
    }

    const score = Math.max(15, 85 - polarCount * 15 - demonCount * 20 + dualCount * 8);
    const passed = score >= this.blockThreshold;
    const severity =
      demonCount > 0 ? Severity.HIGH : polarCount >= 2 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, 0.82, issues, suggestions, htypes, severity, {
      polarization: polarCount,
      demonization: demonCount,
      dual: dualCount,
    });
  }
}

// F6: BACKTRACK — Śledź łańcuch logiczny
class BacktrackFilter extends BaseFilter {
  name = "Backtrack";
  description = "Śledzi logikę rozumowania, wykrywa skoki logiczne";
  blockThreshold = 0; // Backtrack nie blokuje — tylko ostrzega

  private logicalJumpsPatterns = [
    /\bwięc oczywiście\b/i,
    /\boczywiste że\b/i,
    /\bkażdy wie że\b/i,
    /\bthus obviously\b/i,
    /\beveryone knows that\b/i,
    /\bclearly therefore\b/i,
  ];

  private circularPatterns = [
    /\bbo tak\b/i,
    /\bdlatego że tak jest\b/i,
    /\bbecause it is\b/i,
    /\bjest\s+\w+\s+bo\s+jest\b/i,
  ];

  private planBPatterns = [
    /\balternatywnie\b/i,
    /\bplan b\b/i,
    /\bjeśli nie\b/i,
    /\balternatively\b/i,
    /\bif not\b/i,
    /\botherwise\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const jumpCount = this.logicalJumpsPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const circularCount = this.circularPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const planbCount = this.planBPatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);

    if (jumpCount > 0) {
      issues.push(`Potencjalnych skoków logicznych: ${jumpCount}`);
      htypes.push(HallucinationType.LOGICAL_JUMP);
      suggestions.push("Wyjaśnij krok po kroku jak doszedłeś do wniosku");
    }

    if (circularCount > 0) {
      issues.push(`Rozumowanie kołowe: ${circularCount}`);
      suggestions.push("Podaj zewnętrzne uzasadnienie");
    }

    if (planbCount === 0 && jumpCount > 0) {
      suggestions.push("Rozważ dodanie alternatywnej ścieżki rozwiązania");
    }

    const score = Math.max(20, 85 - jumpCount * 10 - circularCount * 15 + planbCount * 5);

    return this.createResult(true, score, 0.6, issues, suggestions, htypes, Severity.INFO, {
      jumps: jumpCount,
      circular: circularCount,
      plan_b: planbCount,
    });
  }
}

// F7: ATRYBUCJA — Heider/Kelley, Fundamental Attribution Error
class AtrybucjaFilter extends BaseFilter {
  name = "Atrybucja";
  description = "Wykrywa błędy atrybucji przyczynowej";

  private internalAttributionPatterns = [
    /\bbo jest głupi\b/i,
    /\bbo jest leniwy\b/i,
    /\bbo mu się nie chce\b/i,
    /\bz natury\b/i,
    /\bwrodzony\b/i,
    /\bbecause (he|she|they)('?s| is| was| are| were) (stupid|lazy|dumb|incompetent|smart|talented|genius)\b/i,
    /\b(he|she|they)('?s| is| was| are| were) (just )?(stupid|lazy|dumb|smart) (by nature|innately)?\b/i,
    /\bby nature\b/i,
    /\binnately\b/i,
    /\bit'?s who (he|she|they) (is|are)\b/i,
    /\b(disposition|character|personality) (flaw|defect|issue)\b/i,
  ];

  private externalIgnorePatterns = [
    /\bniezależnie od okoliczności\b/i,
    /\bbez względu na kontekst\b/i,
    /\bregardless of circumstances\b/i,
    /\bno matter the context\b/i,
  ];

  private goodAttributionPatterns = [
    /\bw tych warunkach\b/i,
    /\bze względu na\b/i,
    /\bpod wpływem\b/i,
    /\bbiorąc pod uwagę\b/i,
    /\bgiven the circumstances\b/i,
    /\bdue to\b/i,
    /\bgiven that\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const internalCount = this.internalAttributionPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const extIgnoreCount = this.externalIgnorePatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );
    const goodCount = this.goodAttributionPatterns.reduce(
      (sum, p) => sum + (text.match(p) || []).length,
      0
    );

    if (internalCount > 0) {
      issues.push(`Błąd atrybucji wewnętrznej: ${internalCount}`);
      htypes.push(HallucinationType.ATTRIBUTION_ERROR);
      suggestions.push("Uwzględnij czynniki zewnętrzne i kontekst sytuacyjny");
    }

    if (extIgnoreCount > 0) {
      issues.push("Ignorowanie kontekstu zewnętrznego");
      suggestions.push("Zawsze rozważ okoliczności zewnętrzne");
    }

    const score = Math.max(20, 85 - internalCount * 15 - extIgnoreCount * 20 + goodCount * 8);
    const passed = score >= this.blockThreshold;
    const severity =
      internalCount >= 2 ? Severity.HIGH : internalCount >= 1 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, 0.78, issues, suggestions, htypes, severity, {
      internal: internalCount,
      ext_ignore: extIgnoreCount,
      good: goodCount,
    });
  }
}

// F8: HYPE / OVERCLAIM — common in marketing/Facebook posts (rozszerzenie ALFA dla użycia w agencie)
class HypeFilter extends BaseFilter {
  name = "Hype";
  description = "Wykrywa niepoparte superlatywy i gwarancje marketingowe";

  private hypePatterns = [
    /\bbest ever\b/i,
    /\b#1\b/i,
    /\bthe best\b/i,
    /\brevolutionary\b/i,
    /\bguaranteed\b/i,
    /\b100% results\b/i,
    /\btransform your life\b/i,
    /\binstant success\b/i,
    /\bultimate\b/i,
    /\bperfect solution\b/i,
    /\bnever seen before\b/i,
    /\bgame changer\b/i,
    /\bmust have\b/i,
    /\bjedyny taki\b/i,
    /\bnajlepszy\b/i,
    /\bgwarancja\b/i,
    /\b100% skuteczny\b/i,
  ];

  private evidencePatterns = [
    /\b(proven|tested|studied|data shows|according to)\b/i,
    /\busers? report\b/i,
    /\bcase study\b/i,
    /\breviewed\b/i,
  ];

  analyze(text: string): FilterResult {
    const issues: string[] = [];
    const suggestions: string[] = [];
    const htypes: HallucinationType[] = [];

    const hypeCount = this.hypePatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);
    const evidenceCount = this.evidencePatterns.reduce((sum, p) => sum + (text.match(p) || []).length, 0);

    if (hypeCount > 0 && evidenceCount === 0) {
      issues.push(`Niepoparte superlatywy/gwarancje: ${hypeCount}`);
      htypes.push(HallucinationType.OVERCONFIDENT);
      suggestions.push("Dodaj dowód (dane, recenzje, konkretne wyniki) lub złagodź język");
    }

    const score = Math.max(20, 95 - hypeCount * 18 + evidenceCount * 12);
    const passed = hypeCount === 0 || evidenceCount > 0 || score >= 65;
    const severity = hypeCount >= 2 && evidenceCount === 0 ? Severity.HIGH : hypeCount >= 1 ? Severity.MEDIUM : Severity.LOW;

    return this.createResult(passed, score, 0.7, issues, suggestions, htypes, severity, {
      hype: hypeCount,
      evidence: evidenceCount,
    });
  }
}

// ORCHESTRATOR
export class FiltrTonoyana {
  private filters = [
    new KontrargumentFilter(),
    new WeryfikacjaFilter(),
    new KontekstFilter(),
    new AntiMagicFilter(),
    new DwuperspektywaFilter(),
    new BacktrackFilter(),
    new AtrybucjaFilter(),
    new HypeFilter(), // NEW: rozszerzenie dla treści marketingowych FB
  ];

  analyze(text: string): AnalysisReport {
    const results = this.filters.map((f) => f.analyze(text));
    const blockedBy = results.filter((r) => !r.passed).map((r) => r.filterName);
    const allIssues = results.flatMap((r) => r.issues);
    const allSuggestions = results.flatMap((r) => r.suggestions);
    const avgScore = Math.floor(results.reduce((sum, r) => sum + r.score, 0) / results.length);
    const passed = blockedBy.length === 0;

    // Count high severity signals for stricter overall decision (even if individual filters "passed")
    const highSeverityCount = results.filter(r => r.severity === Severity.HIGH).length;
    const mediumSeverityCount = results.filter(r => r.severity === Severity.MEDIUM).length;
    const totalIssues = allIssues.length;

    let decision: Decision;
    if (passed) {
      if (highSeverityCount >= 2 || totalIssues >= 4) {
        decision = Decision.WARN;
      } else if (highSeverityCount >= 1) {
        decision = Decision.WARN; // any hard red flag → at least WARN for review
      } else if (avgScore < 78 || mediumSeverityCount >= 2) {
        decision = Decision.WARN;
      } else {
        decision = Decision.PASS;
      }
    } else {
      decision = avgScore >= 55 && highSeverityCount === 0 ? Decision.WARN : Decision.BLOCK;
    }

    return {
      text: text.substring(0, 200),
      passed,
      overallScore: avgScore,
      decision,
      results,
      issues: allIssues,
      suggestions: allSuggestions,
      blockedBy,
      summary(): string {
        const statusIcon =
          decision === Decision.PASS ? "✅" : decision === Decision.WARN ? "⚠️" : "❌";
        const lines = [
          `${statusIcon} ${decision} | score=${avgScore}/100 | decision=${decision}`,
          blockedBy.length > 0 ? `Blocked by: ${blockedBy.join(", ")}` : "",
        ];

        for (const r of results) {
          const icon = r.passed ? "✓" : "✗";
          lines.push(
            `  [${icon}] ${r.filterName.padEnd(16)} score=${String(r.score).padStart(3)}  ${r.severity}`
          );
        }

        return lines.filter((l) => l).join("\n");
      },
    };
  }

  quickCheck(text: string): boolean {
    return this.analyze(text).passed;
  }
}
