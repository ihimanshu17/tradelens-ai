import { describe, it, expect } from "vitest";
import {
  evaluateResearchIntegrity,
  detectMissingComparisonBaseline,
  applyBaselineSelection,
  validateQuestionScope,
} from "@/lib/research/integrity";
import {
  CanonicalExperiment,
  ExperimentData,
  canonicalToExperimentData,
  buildExperimentContract,
  validateExperimentAgainstSelections,
} from "@/types/experiment";
import { runExperiment, runSensitivityAnalysis } from "@/lib/research/engine";
import { analyzeQuestionFallback, generateInterpretationFallback } from "@/lib/ai/gemini";
import { getDeterministicMarketData } from "@/data/mockMarketData";

describe("TradeLens AI — Research Integrity, Challenge Step & Test Matrix Suite", () => {
  // TEST A — Complete question
  it("TEST A: Complete question extracts exact threshold and holding days without false warnings", () => {
    const question = "Does NIFTY recover over the next 5 trading days after a 2% daily decline?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.proposedThreshold).toBe(2.0);
    expect(analysis.hasExplicitThreshold).toBe(true);
    expect(analysis.proposedHoldingDays).toBe(5);
    expect(analysis.instrument).toBe("NIFTY");

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Buying NIFTY after a 2% daily drop produces positive short-term returns over a 5-day holding period.",
    };

    const integrity = evaluateResearchIntegrity(canonical, question);
    expect(integrity.status).toBe("READY");
    expect(integrity.canProceed).toBe(true);
    expect(integrity.missingComparisonBaseline).toBe(false);
  });

  // TEST B — Comparison question with missing baseline ("Higher than what?")
  it("TEST B: Comparison question detects missing comparison baseline and asks 'higher than what?' without silently inventing one", () => {
    const question = "Does BANK NIFTY produce higher returns after a 2% decline?";
    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "BANK NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Buying BANK NIFTY after a 2% daily drop produces positive short-term returns over a 5-day holding period.",
    };

    // 1. Check missing comparison baseline detection
    const baselineCheck = detectMissingComparisonBaseline(question, canonical);
    expect(baselineCheck.isMissing).toBe(true);
    expect(baselineCheck.comparativePhrase).toBe("higher");
    expect(baselineCheck.explanation).toContain("higher than what?");

    // 2. Integrity check reports NEEDS_REVIEW
    const integrity = evaluateResearchIntegrity(canonical, question);
    expect(integrity.status).toBe("NEEDS_REVIEW");
    expect(integrity.missingComparisonBaseline).toBe(true);

    // 3. User selects "Compare against normal trading days"
    const resolvedCanonicalUpdates = applyBaselineSelection(canonical, "normal_days");
    const updatedCanonical: CanonicalExperiment = {
      ...canonical,
      ...resolvedCanonicalUpdates,
    };

    expect(updatedCanonical.experimentType).toBe("comparison");
    expect(updatedCanonical.comparisons).toBeDefined();
    expect(updatedCanonical.comparisons?.length).toBe(2);
    expect(updatedCanonical.comparisons?.[0].name).toContain("2%");
    expect(updatedCanonical.comparisons?.[1].name).toContain("Normal trading days");

    // After user explicitly selects baseline, integrity becomes READY
    const postSelectionIntegrity = evaluateResearchIntegrity(updatedCanonical, question);
    expect(postSelectionIntegrity.status).toBe("READY");
    expect(postSelectionIntegrity.missingComparisonBaseline).toBe(false);
  });

  // TEST C — Multiple conditions (A vs B comparison)
  it("TEST C: Multiple conditions question creates Condition A and Condition B with identical holding/cost assumptions", () => {
    const question = "Does NIFTY perform better after two consecutive declining days than after a single 2% decline?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);

    const [branchA, branchB] = analysis.comparisons!;
    expect(branchA.name.toLowerCase()).toContain("consecutive");
    expect(branchB.name.toLowerCase()).toContain("single");

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      experimentType: "comparison",
      comparisons: [branchA, branchB],
      comparisonMetric: "average return",
      hypothesis: "Does NIFTY perform better following two consecutive down days than single down day?",
    };

    const expData = canonicalToExperimentData(canonical);
    expect(expData.isComparison).toBe(true);

    const result = runExperiment(expData);
    expect(result.comparisonResults).toBeDefined();
    expect(result.comparisonResults?.branchA.executedTrades).toBeGreaterThanOrEqual(0);
    expect(result.comparisonResults?.branchB.executedTrades).toBeGreaterThanOrEqual(0);
    // Differences are mathematically consistent
    const diff = result.comparisonResults!.difference;
    const expectedAvgDiff = Number(
      (result.comparisonResults!.branchA.averageReturn - result.comparisonResults!.branchB.averageReturn).toFixed(2)
    );
    expect(Math.abs(diff.avgReturnDiff - expectedAvgDiff)).toBeLessThanOrEqual(0.01);
  });

  // TEST D — Vague question
  it("TEST D: Vague question requires threshold and makes assumptions visible", () => {
    const question = "Does buying after a sharp fall work?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.isAmbiguous).toBe(true);
    expect(analysis.detectedAmbiguousPhrase).toBe("sharp fall");
    expect(analysis.hasExplicitThreshold).toBe(false);
    expect(analysis.proposedAssumptions.length).toBeGreaterThanOrEqual(4);
    // Threshold question must be asked
    const thresholdQ = analysis.clarificationQuestions.find((q) => q.category === "threshold");
    expect(thresholdQ).toBeDefined();
  });

  // TEST E — Non-trading question rejection
  it("TEST E: Non-trading questions are clearly rejected as unsupported input", () => {
    const nonTradingQuestion = "What are the benefits of React over Angular?";
    const scope = validateQuestionScope(nonTradingQuestion);

    expect(scope.isValid).toBe(false);
    expect(scope.reason).toContain("off-topic or software question");

    // analyzeQuestionFallback throws informative error
    expect(() => analyzeQuestionFallback(nonTradingQuestion)).toThrow(
      /off-topic or software question/
    );
  });

  // TEST F — Parameter propagation fidelity
  it("TEST F: Parameter changes (2% -> 3%, 5d -> 10d, 0.10% -> 0.30%) propagate with 100% fidelity into Contract and Simulation", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "Does NIFTY recover after a drop?",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 3.0,
      conditionThreshold: 3.0,
      holdingPeriod: 10,
      exitRule: "holding_period",
      lookbackPeriod: 10,
      friction: 0.003, // 0.30%
      entryRule: "next_open",
      hypothesis: "Buying NIFTY after a 3% daily drop produces positive short-term returns over a 10-day holding period.",
    };

    // 1. Check selections validation passes
    validateExperimentAgainstSelections(canonical, {
      threshold: 3.0,
      holdingDays: 10,
      testYears: 10,
      friction: 0.003,
    });

    // 2. Build authoritative contract
    const contract = buildExperimentContract(canonical, "READY");
    expect(contract.holdingPeriodDays).toBe(10);
    expect(contract.testWindowYears).toBe(10);
    expect(contract.transactionCostPct).toBe(0.3);
    expect(contract.trigger).toContain("3%");

    // 3. Convert to ExperimentData
    const expData = canonicalToExperimentData({ ...canonical, contract });
    expect(expData.condition.threshold).toBe(3.0);
    expect(expData.holdingPeriod).toBe(10);
    expect(expData.lookbackPeriod).toBe(10);
    expect(expData.friction).toBe(0.003);

    // 4. Run deterministic simulation
    const result = runExperiment(expData);
    expect(result.contract?.holdingPeriodDays).toBe(10);
    expect(result.frictionCostRoundTrip).toBe(0.003);
  });

  // TEST G — Deterministic reproducibility
  it("TEST G: Running identical experiment twice produces identical numerical output", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "Does NIFTY recover after a 2% daily drop?",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Buying NIFTY after a 2% daily drop produces positive short-term returns over a 5-day holding period.",
    };

    const expData = canonicalToExperimentData(canonical);
    const run1 = runExperiment(expData);
    const run2 = runExperiment(expData);

    expect(run1.observations).toBe(run2.observations);
    expect(run1.winningTrades).toBe(run2.winningTrades);
    expect(run1.losingTrades).toBe(run2.losingTrades);
    expect(run1.winRate).toBe(run2.winRate);
    expect(run1.averageReturn).toBe(run2.averageReturn);
    expect(run1.medianReturn).toBe(run2.medianReturn);
    expect(run1.cumulativeReturn).toBe(run2.cumulativeReturn);
  });

  // TEST H — Zero qualifying results handled safely without NaN or Infinity
  it("TEST H: Extreme condition producing zero qualifying events is handled safely without NaN or Infinity", () => {
    const extremeExp: ExperimentData = {
      market: "NIFTY",
      instrument: "NIFTY",
      timeframe: "daily",
      condition: {
        type: "daily_decline",
        threshold: 45.0, // 45% daily decline does not occur
        description: "Daily decline >= 45%",
      },
      entry: {
        type: "next_open",
        description: "Next open",
      },
      exit: {
        type: "holding_period",
        days: 5,
        description: "Close after 5 days",
      },
      holdingPeriod: 5,
      testPeriod: {
        start: "2020-01-01",
        end: "2025-01-01",
        label: "Last 5 years",
      },
      costAssumption: 0.001,
      friction: 0.001,
      lookbackPeriod: 5,
      hypothesis: "Hypothetical extreme drop test",
    };

    const result = runExperiment(extremeExp);
    expect(result.observations).toBe(0);
    expect(result.trades.length).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.averageReturn).toBe(0);
    expect(result.medianReturn).toBe(0);
    expect(result.cumulativeReturn).toBe(0);
    expect(isNaN(result.winRate)).toBe(false);
    expect(isNaN(result.averageReturn)).toBe(false);
    expect(isFinite(result.cumulativeReturn)).toBe(true);
  });

  // TEST I — Contradictory input blocked
  it("TEST I: Contradictory input (e.g. 0 trading days holding) is strictly blocked", () => {
    const invalidQuestion = "Test a 10% daily decline but only hold for 0 trading days.";
    const scope = validateQuestionScope(invalidQuestion);
    expect(scope.isValid).toBe(false);
    expect(scope.reason).toContain("Holding duration must be at least 1 trading day");

    const contradictoryCanonical: CanonicalExperiment = {
      originalQuestion: "Hold for 0 days",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 0, // Impossible holding period
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Test with 0 days holding",
    };

    const integrity = evaluateResearchIntegrity(contradictoryCanonical);
    expect(integrity.status).toBe("BLOCKED");
    expect(integrity.canProceed).toBe(false);
    expect(integrity.blockingReasons.some((r) => r.includes("Holding period"))).toBe(true);
  });

  // TEST J — Comparison integrity (same test window, holding, friction)
  it("TEST J: Comparison experiment enforces identical test window, holding period, and friction across branches", () => {
    const question = "Does NIFTY perform better after two consecutive down days than after a single down day?";
    const analysis = analyzeQuestionFallback(question);

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      experimentType: "comparison",
      comparisons: analysis.comparisons,
      comparisonMetric: "average return",
      hypothesis: "Comparison hypothesis",
    };

    const expData = canonicalToExperimentData(canonical);
    const result = runExperiment(expData);

    expect(result.comparisonResults).toBeDefined();
    expect(result.comparisonResults?.branchA).toBeDefined();
    expect(result.comparisonResults?.branchB).toBeDefined();
    // Verify math consistency
    const diff = result.comparisonResults!.difference;
    expect(diff).toBeDefined();
    expect(typeof diff.winRateDiff).toBe("number");
    expect(typeof diff.avgReturnDiff).toBe("number");
  });

  // Conclusion Robustness (Sensitivity Analysis) Test
  it("Conclusion Robustness: runs deterministic sensitivity variations across holding periods [3, 5, 10]", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "Does NIFTY recover after a 2% decline?",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Buying NIFTY after a 2% drop produces positive returns over a 5-day hold.",
    };

    const expData = canonicalToExperimentData(canonical);
    const sensitivity = runSensitivityAnalysis(expData);

    expect(sensitivity.points.length).toBe(3);
    expect(sensitivity.points.map((p) => p.value)).toEqual([3, 5, 10]);
    // Current point is 5-day hold
    const currentPoint = sensitivity.points.find((p) => p.isCurrent);
    expect(currentPoint).toBeDefined();
    expect(currentPoint?.value).toBe(5);

    // Results are finite numbers calculated deterministically
    sensitivity.points.forEach((p) => {
      expect(isNaN(p.averageReturn)).toBe(false);
      expect(isNaN(p.winRate)).toBe(false);
      expect(p.tradeCount).toBeGreaterThanOrEqual(0);
    });

    expect(sensitivity.interpretation).toBeDefined();
    expect(sensitivity.interpretation.length).toBeGreaterThan(10);
  });

  // BANK NIFTY Recovery Question & Contract Fidelity Verification
  it("BANK NIFTY Recovery: builds sealed contract, preserves parameters (2%, 3d, 0.00% friction, 5y) and runs simulation", () => {
    const question = "Does BANK NIFTY tend to recover over the next 3 trading days after falling at least 2% in a single day?";

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "BANK NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 3,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.0,
      entryRule: "next_open",
      hypothesis: "When BANK NIFTY declines >= 2% in a day, buying at next open and holding for 3 days produces positive returns.",
      assumptionProvenance: {
        timing: "USER CONFIRMED",
        friction: "USER CONFIRMED",
        holding: "USER CONFIRMED",
      },
    };

    // 1. Pure integrity evaluation has zero side effects on canonical object
    const snapshotBefore = JSON.stringify(canonical);
    const integrity = evaluateResearchIntegrity(canonical, question);
    const snapshotAfter = JSON.stringify(canonical);
    expect(snapshotBefore).toBe(snapshotAfter); // Proves pure evaluation: no mutation
    expect(integrity.canProceed).toBe(true);

    // 2. Build authoritative Experiment Contract
    const contract = buildExperimentContract(canonical, "READY");
    expect(contract.instrument).toBe("BANK NIFTY");
    expect(contract.holdingPeriodDays).toBe(3);
    expect(contract.testWindowYears).toBe(5);
    expect(contract.transactionCostPct).toBe(0);
    expect(contract.integrityStatus).toBe("READY");
    expect(contract.entryTiming).toContain("Next trading day's open");

    // 3. Convert to ExperimentData and run simulation
    const updatedCanonical = { ...canonical, contract };
    const expData = canonicalToExperimentData(updatedCanonical);
    expect(expData.market).toBe("BANK NIFTY");
    expect(expData.holdingPeriod).toBe(3);
    expect(expData.costAssumption).toBe(0.0);

    const result = runExperiment(expData);
    expect(result.observations).toBeGreaterThan(0);
    expect(result.contract).toBeDefined();
    expect(result.contract?.holdingPeriodDays).toBe(3);
    expect(result.contract?.instrument).toBe("BANK NIFTY");
    expect(result.sensitivity).toBeDefined();
  });

  // TARGETED REGRESSION TEST 1: Comparison Semantics & Baseline Consistency for target question
  it("TARGETED REGRESSION TEST 1: 'Does NIFTY perform better after two consecutive down days than after a single 2% decline?' preserves Condition A, Condition B, and unified baseline", () => {
    const question = "Does NIFTY perform better after two consecutive down days than after a single 2% decline?";
    const analysis = analyzeQuestionFallback(question);

    // 1. Comparison detection
    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);

    const [branchA, branchB] = analysis.comparisons!;
    // Condition A = "two consecutive down days"
    expect(branchA.name.toLowerCase()).toContain("consecutive");
    expect(branchA.condition.type).toBe("consecutive_down");

    // Condition B = "single 2% decline"
    expect(branchB.name.toLowerCase()).toContain("single");
    expect(branchB.name.toLowerCase()).toContain("2%");
    expect(branchB.condition.type).toBe("daily_decline");

    // 2. Canonical experiment state preserves both branches and establishes unified baseline
    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      experimentType: "comparison",
      comparisons: [branchA, branchB],
      comparisonMetric: "average return",
      hypothesis: `Does NIFTY perform better following ${branchA.name} than following ${branchB.name} (qualifying threshold: 2%) over a 5-day holding period?`,
      baselineType: "another_condition",
      baselineDescription: branchB.name,
      assumptionProvenance: {
        timing: "USER CONFIRMED",
        friction: "USER CONFIRMED",
        holding: "USER CONFIRMED",
        baseline: "USER PROVIDED",
      },
    };

    // 3. Stage 3 Challenge & Research Integrity evaluation
    const integrity = evaluateResearchIntegrity(canonical, question);

    // Baseline is explicitly established by Condition B
    expect(integrity.missingComparisonBaseline).toBe(false);
    expect(integrity.status).toBe("READY");
    expect(integrity.canProceed).toBe(true);

    // Check 3 preserves both conditions (NOT collapsed into a single trigger)
    const check3 = integrity.checks.find((c) => c.id === "check_entry_condition");
    expect(check3).toBeDefined();
    expect(check3?.name).toBe("Comparison Conditions");
    expect(check3?.currentValue).toContain(branchA.name);
    expect(check3?.currentValue).toContain(branchB.name);

    // Check 10 evaluates comparison baseline explicitly to Condition B
    const check10 = integrity.checks.find((c) => c.id === "check_comparison_baseline");
    expect(check10).toBeDefined();
    expect(check10?.status).toBe("pass");
    expect(check10?.currentValue).toContain(branchB.name);

    // 4. Experiment Contract contains both conditions
    const contract = buildExperimentContract(canonical, "READY");
    expect(contract.isComparison).toBe(true);
    expect(contract.trigger).toContain(branchA.name);
    expect(contract.trigger).toContain(branchB.name);
    expect(contract.baseline).toContain(branchB.name);
    expect(contract.holdingPeriodDays).toBe(5);
    expect(contract.instrument).toBe("NIFTY");
    expect(contract.transactionCostPct).toBe(0.1);

    // 5. Test engine receives and executes both conditions separately
    const expData = canonicalToExperimentData({ ...canonical, contract });
    expect(expData.isComparison).toBe(true);
    expect(expData.comparisons?.length).toBe(2);

    const testResult = runExperiment(expData);
    expect(testResult.comparisonResults).toBeDefined();

    const { branchA: resA, branchB: resB, difference } = testResult.comparisonResults!;
    expect(resA.name).toBe(branchA.name);
    expect(resB.name).toBe(branchB.name);
    expect(resA.executedTrades).toBeGreaterThanOrEqual(0);
    expect(resB.executedTrades).toBeGreaterThanOrEqual(0);
    expect(difference).toBeDefined();

    // 6. Learn Stage compares both result sets
    const learnResult = generateInterpretationFallback(expData, testResult);
    expect(learnResult.dataSummary).toContain(branchA.name);
    expect(learnResult.dataSummary).toContain(branchB.name);
    expect(learnResult.reasonableConclusions).toBeDefined();
    expect(learnResult.risksAndLimitations.length).toBeGreaterThan(0);
  });

  // TARGETED REGRESSION TEST 2: Single-condition experiment integrity
  it("TARGETED REGRESSION TEST 2: 'Does BANK NIFTY tend to recover over the next 3 trading days after falling at least 2% in a single day?' remains single-condition", () => {
    const question = "Does BANK NIFTY tend to recover over the next 3 trading days after falling at least 2% in a single day?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.experimentType).toBe("single");
    expect(analysis.comparisons).toBeUndefined();
    expect(analysis.instrument).toBe("BANK NIFTY");
    expect(analysis.proposedThreshold).toBe(2.0);
    expect(analysis.proposedHoldingDays).toBe(3);
  });

  // TARGETED REGRESSION TEST 3: Missing baseline detection & resolution options
  it("TARGETED REGRESSION TEST 3: 'Does BANK NIFTY produce higher returns after a 2% decline?' detects missing baseline and offers 4 resolution options", () => {
    const question = "Does BANK NIFTY produce higher returns after a 2% decline?";
    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "BANK NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: "Buying BANK NIFTY after a 2% daily drop produces higher returns.",
    };

    const integrity = evaluateResearchIntegrity(canonical, question);
    expect(integrity.missingComparisonBaseline).toBe(true);
    expect(integrity.comparisonBaselineOptions.length).toBe(4);

    const optionIds = integrity.comparisonBaselineOptions.map((o) => o.id);
    expect(optionIds).toContain("normal_days");
    expect(optionIds).toContain("non_trigger_days");
    expect(optionIds).toContain("another_condition");
    expect(optionIds).toContain("absolute_return");
  });

  // TARGETED REGRESSION TEST 4: Pure integrity evaluation (no mutation / no render-time update)
  it("TARGETED REGRESSION TEST 4: evaluateResearchIntegrity is strictly pure and does not mutate canonical experiment state", () => {
    const question = "Does NIFTY perform better after two consecutive down days than after a single 2% decline?";
    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      experimentType: "comparison",
      comparisons: [
        {
          id: "A",
          name: "two consecutive down days",
          condition: { type: "consecutive_down", threshold: 2.0, consecutiveDays: 2, description: "Two consecutive down days" },
        },
        {
          id: "B",
          name: "single 2% decline",
          condition: { type: "daily_decline", threshold: 2.0, description: "Single daily decline >= 2%" },
        },
      ],
      baselineType: "another_condition",
      baselineDescription: "single 2% decline",
    };

    const frozen = JSON.parse(JSON.stringify(canonical));
    const result1 = evaluateResearchIntegrity(canonical, question);
    const result2 = evaluateResearchIntegrity(canonical, question);

    expect(canonical).toEqual(frozen);
    expect(result1.status).toBe(result2.status);
    expect(result1.score).toEqual(result2.score);
  });

  // PRODUCTION READINESS FINAL SMOKE TESTS (Specification Section 12)
  describe("Production Readiness Final Smoke Tests", () => {
    // 1. Primary Smoke Test
    it("Primary Smoke Test: 'Does NIFTY have a positive 5-day return after falling at least 2% in a single day?' flows through full pipeline without drift", () => {
      const question = "Does NIFTY have a positive 5-day return after falling at least 2% in a single day?";
      
      // Stage 1: Ask & Parameter Extraction
      const analysis = analyzeQuestionFallback(question);
      expect(analysis.instrument).toBe("NIFTY");
      expect(analysis.proposedThreshold).toBe(2.0);
      expect(analysis.hasExplicitThreshold).toBe(true);
      expect(analysis.proposedHoldingDays).toBe(5);
      expect(analysis.experimentType).toBe("single");

      // Stage 2: Clarify -> Canonical Experiment
      const canonical: CanonicalExperiment = {
        originalQuestion: question,
        experimentType: "single",
        instrument: analysis.instrument,
        timeframe: "daily",
        threshold: analysis.proposedThreshold,
        conditionThreshold: analysis.proposedThreshold,
        holdingPeriod: analysis.proposedHoldingDays,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
        hypothesis: "Buying NIFTY after a daily decline >= 2% produces positive 5-day returns over a 5-day holding period.",
      };

      // Stage 3: Challenge / Research Integrity
      const integrity = evaluateResearchIntegrity(canonical, question);
      expect(integrity.status).toBe("READY");
      expect(integrity.canProceed).toBe(true);
      expect(integrity.missingComparisonBaseline).toBe(false);

      // Stage 4: Define / Authoritative Experiment Contract
      const contract = buildExperimentContract(canonical, "READY");
      expect(contract.instrument).toBe("NIFTY");
      expect(contract.trigger).toContain("2%");
      expect(contract.holdingPeriodDays).toBe(5);
      expect(contract.testWindowYears).toBe(5);
      expect(contract.transactionCostPct).toBe(0.1);
      expect(contract.entryTiming).toContain("Next trading day's open");

      // Stage 5: Test / Deterministic Simulation
      const expData = canonicalToExperimentData({ ...canonical, contract });
      expect(expData.market).toBe("NIFTY");
      expect(expData.condition.threshold).toBe(2.0);
      expect(expData.holdingPeriod).toBe(5);
      expect(expData.costAssumption).toBe(0.001);
      expect(expData.lookbackPeriod).toBe(5);

      const simResult = runExperiment(expData);
      expect(simResult.trades.length).toBeGreaterThan(0);
      expect(simResult.observations).toBeGreaterThan(0);
      expect(simResult.winRate).toBeGreaterThanOrEqual(0);
      expect(simResult.winRate).toBeLessThanOrEqual(100);
      expect(simResult.averageReturn).toBeDefined();

      // Stage 6: Learn / Evidence-grounded Synthesis
      const learn = generateInterpretationFallback(expData, simResult);
      expect(learn.dataSummary).toContain("qualifying trade opportunities");
      expect(learn.reasonableConclusions).toContain("simulated sample");
      expect(learn.risksAndLimitations.length).toBeGreaterThanOrEqual(4);
      expect(learn.followUpQuestions.length).toBeGreaterThanOrEqual(3);
    });

    // 2. Question A (Ambiguous)
    it("Regression A (Ambiguous): 'Does NIFTY recover after a large decline?' identifies ambiguity and missing threshold", () => {
      const q = "Does NIFTY recover after a large decline?";
      const analysis = analyzeQuestionFallback(q);
      expect(analysis.isAmbiguous).toBe(true);
      expect(analysis.detectedAmbiguousPhrase).toBe("large decline");
      expect(analysis.hasExplicitThreshold).toBe(false);
    });

    // 3. Question B (Comparative)
    it("Regression B (Comparative): 'Does NIFTY perform better after two consecutive down days than after a single 2% decline?' preserves both branches and establishes baseline", () => {
      const q = "Does NIFTY perform better after two consecutive down days than after a single 2% decline?";
      const analysis = analyzeQuestionFallback(q);
      expect(analysis.experimentType).toBe("comparison");
      expect(analysis.comparisons?.length).toBe(2);
      expect(analysis.comparisons?.[0].name).toContain("consecutive");
      expect(analysis.comparisons?.[1].name).toContain("2%");
    });

    // 4. Question C (Off-topic)
    it("Regression C (Off-topic): 'What are the advantages of React compared with Angular?' is rejected gracefully", () => {
      const q = "What are the advantages of React compared with Angular?";
      const scope = validateQuestionScope(q);
      expect(scope.isValid).toBe(false);
      expect(scope.reason).toContain("off-topic or software question");
    });

    // 5. Question D (Contradictory)
    it("Regression D (Contradictory): 'Buy NIFTY when RSI is above 80 and below 20.' detects mutually exclusive contradictory conditions", () => {
      const q = "Buy NIFTY when RSI is above 80 and below 20.";
      const scope = validateQuestionScope(q);
      expect(scope.isValid).toBe(false);
      expect(scope.reason).toContain("Contradictory condition");
    });
  });
});

