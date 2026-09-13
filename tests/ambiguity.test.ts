import { describe, it, expect } from "vitest";
import {
  analyzeQuestionFallback,
  extractQuantitativeThreshold,
  detectAmbiguousDeclinePhrase,
  detectHoldingDuration,
} from "@/lib/ai/gemini";

describe("Ambiguity and Parameter Extraction", () => {
  it("correctly interprets user question with explicit 3% single-day threshold", () => {
    const question = "How does NIFTY perform after falling 3% or more in a single trading day?";
    const analysis = analyzeQuestionFallback(question);

    // Instrument, timeframe, threshold
    expect(analysis.instrument).toBe("NIFTY");
    expect(analysis.timeframe).toBe("daily");
    expect(analysis.hasExplicitThreshold).toBe(true);
    expect(analysis.proposedThreshold).toBe(3.0);
    expect(analysis.detectedCondition).toBe("Daily decline >= 3%");

    // Genuinely missing parameters
    expect(analysis.missingInformation).toContain("Holding duration");
    expect(analysis.missingInformation).toContain("Exit trigger");
    expect(analysis.missingInformation).toContain("Transaction costs");

    // Must NOT report threshold as missing or hallucinate 'sharp fall'
    expect(analysis.missingInformation.some((m) => m.toLowerCase().includes("sharp"))).toBe(false);
    expect(analysis.missingInformation.some((m) => m.toLowerCase().includes("threshold"))).toBe(false);
    expect(analysis.ambiguitySummary.toLowerCase()).not.toContain("sharp fall");
    expect(analysis.ambiguitySummary).toContain("3%");
  });

  it("extracts quantitative parameters across natural language variations", () => {
    // "falls 3% or more" -> 3%
    const ex1 = extractQuantitativeThreshold("How does NIFTY perform after it falls 3% or more?");
    expect(ex1.hasExplicitThreshold).toBe(true);
    expect(ex1.threshold).toBe(3.0);

    // "drops at least 2%" -> 2%
    const ex2 = extractQuantitativeThreshold("What happens when BANKNIFTY drops at least 2% in a session?");
    expect(ex2.hasExplicitThreshold).toBe(true);
    expect(ex2.threshold).toBe(2.0);

    // "declines by 1.5%" -> 1.5%
    const ex3 = extractQuantitativeThreshold("Does buying after NIFTY declines by 1.5% have positive expectancy?");
    expect(ex3.hasExplicitThreshold).toBe(true);
    expect(ex3.threshold).toBe(1.5);

    // "down 4 percent" -> 4%
    const ex4 = extractQuantitativeThreshold("When SPY is down 4 percent, should you buy?");
    expect(ex4.hasExplicitThreshold).toBe(true);
    expect(ex4.threshold).toBe(4.0);
  });

  it("only marks threshold as missing when an ambiguous expression is actually used", () => {
    // "sharp fall"
    const sf = analyzeQuestionFallback("Does buying NIFTY after a sharp fall work?");
    expect(sf.hasExplicitThreshold).toBe(false);
    expect(sf.detectedAmbiguousPhrase).toBe("sharp fall");
    expect(sf.ambiguitySummary).toContain("sharp fall");
    expect(sf.missingInformation).toContain("Drop threshold for 'sharp fall'");

    // "big drop" (must NOT assume "sharp fall")
    const bd = analyzeQuestionFallback("Does buying NIFTY after a big drop work?");
    expect(bd.hasExplicitThreshold).toBe(false);
    expect(bd.detectedAmbiguousPhrase).toBe("big drop");
    expect(bd.ambiguitySummary).toContain("big drop");
    expect(bd.ambiguitySummary).not.toContain("sharp fall");
    expect(bd.missingInformation).toContain("Drop threshold for 'big drop'");
    expect(bd.missingInformation.some((m) => m.includes("sharp fall"))).toBe(false);

    // "significant decline" (must NOT assume "sharp fall")
    const sd = analyzeQuestionFallback("What happens after a significant decline in NIFTY?");
    expect(sd.hasExplicitThreshold).toBe(false);
    expect(sd.detectedAmbiguousPhrase).toBe("significant decline");
    expect(sd.ambiguitySummary).toContain("significant decline");
    expect(sd.ambiguitySummary).not.toContain("sharp fall");
    expect(sd.missingInformation).toContain("Drop threshold for 'significant decline'");

    // "major selloff" (must NOT assume "sharp fall")
    const ms = analyzeQuestionFallback("How does the market react after a major selloff?");
    expect(ms.hasExplicitThreshold).toBe(false);
    expect(ms.detectedAmbiguousPhrase).toBe("major selloff");
    expect(ms.ambiguitySummary).toContain("major selloff");
    expect(ms.ambiguitySummary).not.toContain("sharp fall");
    expect(ms.missingInformation).toContain("Drop threshold for 'major selloff'");
  });

  it("distinguishes entry condition timeframe from holding duration", () => {
    // 'in a single trading day' is entry timeframe, holding duration remains missing
    const q1 = analyzeQuestionFallback("How does NIFTY perform after falling 3% or more in a single trading day?");
    expect(q1.missingInformation).toContain("Holding duration");

    // When holding duration is stated, it should be extracted and not marked missing
    const q2 = analyzeQuestionFallback("How does NIFTY perform within 10 trading days after falling 3%?");
    expect(q2.proposedHoldingDays).toBe(10);
    expect(q2.missingInformation).not.toContain("Holding duration");
  });

  it("identifies consecutive down days pattern", () => {
    const analysis = analyzeQuestionFallback("What happens after three consecutive down days?");
    expect(analysis.detectedCondition).toBe("Consecutive down days");
    expect(analysis.missingInformation).toContain("Holding duration");
  });

  it("identifies gap-down ambiguity", () => {
    const analysis = analyzeQuestionFallback("Does buying after a large gap-down produce positive returns?");
    expect(analysis.isAmbiguous).toBe(true);
    expect(analysis.ambiguitySummary.toLowerCase()).toContain("gap-down");
  });

  it("provides structured proposed assumptions with clear rationales", () => {
    const analysis = analyzeQuestionFallback("Does buying NIFTY after a sharp fall work?");
    expect(analysis.proposedAssumptions.length).toBeGreaterThanOrEqual(3);
    for (const assump of analysis.proposedAssumptions) {
      expect(assump.source).toBe("AI suggested");
      expect(assump.rationale).toBeTruthy();
    }
  });

  it("detects comparative research intent and branches for core question", () => {
    const q = "Does NIFTY recover faster after two consecutive down days than after a single down day?";
    const analysis = analyzeQuestionFallback(q);

    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);

    const branchA = analysis.comparisons![0];
    const branchB = analysis.comparisons![1];

    expect(branchA.name).toMatch(/consecutive down days/i);
    expect(branchA.condition.type).toBe("consecutive_down");
    expect(branchA.condition.consecutiveBars).toBe(2);

    expect(branchB.name).toMatch(/single down day/i);
    expect(branchB.condition.type).toBe("daily_decline");

    expect(analysis.comparisonMetric).toBe("recovery speed");
    expect(analysis.ambiguitySummary).toContain("two consecutive down days");
    expect(analysis.ambiguitySummary).toContain("single down day");
    expect(analysis.missingInformation).toContain("Threshold percentage for 'down day'");
    expect(analysis.missingInformation).toContain("Holding horizon for 'recovery speed'");
  });

  it("detects comparative research intent with alternative phrasing (versus / better)", () => {
    const q = "Is NIFTY's 5-day return better after two consecutive declines versus one large decline?";
    const analysis = analyzeQuestionFallback(q);

    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);
    expect(analysis.proposedHoldingDays).toBe(5);
  });

  it("does not false-positive single condition questions as comparisons", () => {
    const q1 = "How does NIFTY perform after falling 3% or more in a single trading day?";
    const analysis1 = analyzeQuestionFallback(q1);
    expect(analysis1.experimentType).toBe("single");
    expect(analysis1.comparisons).toBeUndefined();

    const q2 = "Does NIFTY recover after falling 2% in a single trading day?";
    const analysis2 = analyzeQuestionFallback(q2);
    expect(analysis2.experimentType).toBe("single");
    expect(analysis2.comparisons).toBeUndefined();
  });
});
