import { describe, it, expect } from "vitest";
import {
  CanonicalExperiment,
  generateHypothesis,
  validateAndEnforceHypothesisFidelity,
  canonicalToExperimentData,
  detectComparisonMetric,
} from "../types/experiment";
import {
  detectComparisonBranches,
  analyzeQuestionFallback,
  generateInterpretationFallback,
} from "../lib/ai/gemini";
import { runExperiment } from "../lib/research/engine";

describe("TradeLens AI - Master Stabilization & Regression Test Suite", () => {
  // TEST 1 — BASIC SINGLE CONDITION
  it("TEST 1: Basic single condition preserves 2% threshold, 5-day holding, and NIFTY", () => {
    const question =
      "Does NIFTY tend to rise over the next 5 trading days after a daily decline of at least 2%?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.instrument).toBe("NIFTY");
    expect(analysis.proposedThreshold).toBe(2.0);
    expect(analysis.hasExplicitThreshold).toBe(true);
    expect(analysis.proposedHoldingDays).toBe(5);
    expect(analysis.experimentType).toBe("single");

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
      hypothesis: generateHypothesis({
        instrument: analysis.instrument,
        threshold: analysis.proposedThreshold,
        conditionThreshold: analysis.proposedThreshold,
        holdingPeriod: analysis.proposedHoldingDays,
        experimentType: "single",
      }),
    };

    expect(canonical.threshold).toBe(2.0);
    expect(canonical.holdingPeriod).toBe(5);
    expect(canonical.instrument).toBe("NIFTY");
    expect(canonical.hypothesis).toContain("2%");
    expect(canonical.hypothesis).toContain("5-day");
    expect(canonical.hypothesis).toContain("NIFTY");
    expect(canonical.hypothesis).not.toContain("3%");
    expect(canonical.hypothesis).not.toContain("3-day");

    const expData = canonicalToExperimentData(canonical);
    expect(expData.condition.threshold).toBe(2.0);
    expect(expData.holdingPeriod).toBe(5);
    expect(expData.market).toBe("NIFTY");

    const result = runExperiment(expData);
    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.winningTrades + result.losingTrades).toBe(result.trades.length);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(100);
  });

  // TEST 2 — PARAMETER OVERRIDE
  it("TEST 2: Parameter overrides (3%, 3d, 10y, 0.30%) correctly update canonical, define, test, and learn", () => {
    const question =
      "Does NIFTY tend to rise over the next 5 trading days after a daily decline of at least 2%?";
    const analysis = analyzeQuestionFallback(question);

    // Initial canonical
    let canonical: CanonicalExperiment = {
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
      hypothesis: generateHypothesis({
        instrument: analysis.instrument,
        threshold: analysis.proposedThreshold,
        conditionThreshold: analysis.proposedThreshold,
        holdingPeriod: analysis.proposedHoldingDays,
        experimentType: "single",
      }),
    };

    // User overrides in CLARIFY:
    // threshold: 2% -> 3%
    // holdingPeriod: 5 -> 3
    // lookbackPeriod: 5 -> 10
    // friction: 0.10% -> 0.30% (0.003)
    canonical = {
      ...canonical,
      threshold: 3.0,
      conditionThreshold: 3.0,
      holdingPeriod: 3,
      lookbackPeriod: 10,
      friction: 0.003,
    };
    canonical.hypothesis = validateAndEnforceHypothesisFidelity(canonical);

    expect(canonical.threshold).toBe(3.0);
    expect(canonical.holdingPeriod).toBe(3);
    expect(canonical.lookbackPeriod).toBe(10);
    expect(canonical.friction).toBe(0.003);
    expect(canonical.hypothesis).toContain("3%");
    expect(canonical.hypothesis).toContain("3-day");
    expect(canonical.hypothesis).not.toContain("2%");
    expect(canonical.hypothesis).not.toContain("5-day");

    const expData = canonicalToExperimentData(canonical);
    expect(expData.condition.threshold).toBe(3.0);
    expect(expData.holdingPeriod).toBe(3);
    expect(expData.lookbackPeriod).toBe(10);
    expect(expData.costAssumption).toBe(0.003);

    const testResult = runExperiment(expData);
    expect(testResult.trades.length).toBeGreaterThan(0);
    expect(testResult.frictionCostRoundTrip).toBe(0.003);

    const learnResult = generateInterpretationFallback(expData, testResult);
    expect(learnResult.dataSummary).toContain("0.30% friction");
    expect(learnResult.dataSummary).not.toContain("0.10% friction");
  });

  // TEST 3 — DIFFERENT INSTRUMENT
  it("TEST 3: Different instrument (BANK NIFTY) with 1% and 10 days prevents NIFTY leakage", () => {
    const question =
      "Does BANK NIFTY perform better over 10 trading days after a 1% daily decline?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.instrument).toBe("BANK NIFTY");
    expect(analysis.proposedThreshold).toBe(1.0);
    expect(analysis.proposedHoldingDays).toBe(10);

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "single",
      instrument: "BANK NIFTY",
      timeframe: "daily",
      threshold: 1.0,
      conditionThreshold: 1.0,
      holdingPeriod: 10,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "BANK NIFTY",
        threshold: 1.0,
        conditionThreshold: 1.0,
        holdingPeriod: 10,
        experimentType: "single",
      }),
    };

    expect(canonical.instrument).toBe("BANK NIFTY");
    expect(canonical.hypothesis).toContain("BANK NIFTY");
    expect(canonical.hypothesis).not.toContain("Buying NIFTY");
    expect(canonical.hypothesis).toContain("1%");
    expect(canonical.hypothesis).toContain("10-day");

    const expData = canonicalToExperimentData(canonical);
    expect(expData.market).toBe("BANK NIFTY");
    expect(expData.condition.threshold).toBe(1.0);
    expect(expData.holdingPeriod).toBe(10);

    const result = runExperiment(expData);
    expect(result.trades.length).toBeGreaterThan(0);
  });

  // TEST 4 — ZERO FRICTION
  it("TEST 4: Zero friction (0.00%) works and does not fallback to 0.10% or default", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "NIFTY zero friction test",
      experimentType: "single",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0, // Explicit 0% friction
      entryRule: "next_open",
    };

    expect(canonical.friction).toBe(0);

    const expData = canonicalToExperimentData(canonical);
    expect(expData.costAssumption).toBe(0);
    expect(expData.friction).toBe(0);

    const result = runExperiment(expData);
    expect(result.frictionCostRoundTrip).toBe(0);

    const learn = generateInterpretationFallback(expData, result);
    expect(learn.dataSummary).toBeDefined();
    expect(result.frictionCostRoundTrip).toBe(0);
  });

  // TEST 5 — COMPARISON INTENT & METRIC
  it("TEST 5: Generic comparison preserves Condition A, Condition B, and 5-day return metric (not converted to recovery)", () => {
    const question =
      "Does NIFTY have a better 5-day return after two consecutive declining days than after a single-day decline?";
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);

    const compInfo = detectComparisonBranches(question, 2.0);
    expect(compInfo.isComparison).toBe(true);
    expect(compInfo.comparisonMetric).toBe("5-day return");
    expect(compInfo.comparisonDirection).toBe("better");

    const branchA = compInfo.comparisons?.[0];
    const branchB = compInfo.comparisons?.[1];

    expect(branchA?.name.toLowerCase()).toContain("consecutive");
    expect(branchB?.name.toLowerCase()).toContain("single");

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "comparison",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      comparisons: compInfo.comparisons,
      comparisonMetric: compInfo.comparisonMetric,
      comparisonDirection: compInfo.comparisonDirection,
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        experimentType: "comparison",
        comparisons: compInfo.comparisons,
        comparisonMetric: compInfo.comparisonMetric,
      }),
    };

    expect(canonical.hypothesis).toContain("better 5-day return");
    expect(canonical.hypothesis).not.toContain("recover faster");

    const expData = canonicalToExperimentData(canonical);
    expect(expData.isComparison).toBe(true);
    expect(expData.comparisonMetric).toBe("5-day return");

    const testResult = runExperiment(expData);
    expect(testResult.comparisonResults).toBeDefined();
    expect(testResult.comparisonResults?.branchA.name).toBe(branchA?.name);
    expect(testResult.comparisonResults?.branchB.name).toBe(branchB?.name);
    expect(testResult.comparisonResults?.difference).toBeDefined();

    // Math check: A - B
    const diff = testResult.comparisonResults!.difference!;
    const bA = testResult.comparisonResults!.branchA;
    const bB = testResult.comparisonResults!.branchB;
    expect(diff.winRateDiff).toBe(Number((bA.winRate - bB.winRate).toFixed(1)));
    expect(diff.avgReturnDiff).toBe(Number((bA.averageReturn - bB.averageReturn).toFixed(2)));

    // Interpretation check
    const learn = generateInterpretationFallback(expData, testResult);
    expect(learn.dataSummary).toContain("two consecutive");
    expect(learn.dataSummary).toContain("single-day");
    expect(learn.reasonableConclusions).not.toContain("recover faster");
  });

  // TEST 6 — RECOVERY SPEED INTENT & LIMITATION
  it("TEST 6: 'Does NIFTY recover faster...' preserves recovery speed metric and discloses engine limitation", () => {
    const question =
      "Does NIFTY recover faster after two consecutive declining days than after a single-day decline?";
    const { metric, direction } = detectComparisonMetric(question);

    expect(metric).toBe("recovery speed");
    expect(direction).toBe("faster");

    const compInfo = detectComparisonBranches(question, 2.0);
    expect(compInfo.comparisonMetric).toBe("recovery speed");

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "comparison",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      comparisons: compInfo.comparisons,
      comparisonMetric: compInfo.comparisonMetric,
      comparisonDirection: compInfo.comparisonDirection,
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        experimentType: "comparison",
        comparisons: compInfo.comparisons,
        comparisonMetric: compInfo.comparisonMetric,
      }),
    };

    expect(canonical.hypothesis).toContain("recover faster");

    const expData = canonicalToExperimentData(canonical);
    const testResult = runExperiment(expData);

    // Limitation notice must be present when recovery speed is requested
    expect(testResult.unsupportedComparisonNotice).toContain(
      "The prototype simulation engine evaluates fixed-horizon returns"
    );

    const learn = generateInterpretationFallback(expData, testResult);
    expect(learn.reasonableConclusions).toContain(
      "continuous time-to-recovery was not evaluated"
    );
  });

  // TEST 7 — WIN RATE METRIC
  it("TEST 7: 'Does NIFTY have a higher win rate...' preserves win rate metric", () => {
    const question =
      "Does NIFTY have a higher win rate after two consecutive declining days than after a single-day decline?";
    const { metric, direction } = detectComparisonMetric(question);

    expect(metric).toBe("win rate");
    expect(direction).toBe("higher");

    const compInfo = detectComparisonBranches(question, 2.0);

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "comparison",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      comparisons: compInfo.comparisons,
      comparisonMetric: metric,
      comparisonDirection: direction,
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        experimentType: "comparison",
        comparisons: compInfo.comparisons,
        comparisonMetric: metric,
      }),
    };

    expect(canonical.hypothesis).toContain("higher win rate");
    expect(canonical.hypothesis).not.toContain("recover faster");
    expect(canonical.hypothesis).not.toContain("average return");

    const expData = canonicalToExperimentData(canonical);
    const result = runExperiment(expData);
    expect(result.comparisonResults?.verdict).toContain("percentage points");
    expect(result.comparisonResults?.verdict).toContain("higher win rate");
  });

  // TEST 8 — AVERAGE RETURN METRIC
  it("TEST 8: 'Does NIFTY produce a higher average return...' preserves average return metric", () => {
    const question =
      "Does NIFTY produce a higher average return after two consecutive declining days than after a single-day decline?";
    const { metric, direction } = detectComparisonMetric(question);

    expect(metric).toBe("average return");
    expect(direction).toBe("higher");

    const compInfo = detectComparisonBranches(question, 2.0);

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "comparison",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      comparisons: compInfo.comparisons,
      comparisonMetric: metric,
      comparisonDirection: direction,
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        experimentType: "comparison",
        comparisons: compInfo.comparisons,
        comparisonMetric: metric,
      }),
    };

    expect(canonical.hypothesis).toContain("higher average return");
    expect(canonical.hypothesis).not.toContain("recover faster");

    const expData = canonicalToExperimentData(canonical);
    const result = runExperiment(expData);
    expect(result.comparisonResults?.verdict).toContain("net average return");
  });

  // TEST 9 — NEW EXPERIMENT RESET
  it("TEST 9: Running Experiment 1 (3%/3d/10y/0.30%) and resetting leaves zero state leakage in Experiment 2 (2%/5d/5y/0.10%)", () => {
    // Experiment 1
    const exp1Canonical: CanonicalExperiment = {
      originalQuestion: "Exp 1 question",
      experimentType: "single",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 3.0,
      conditionThreshold: 3.0,
      holdingPeriod: 3,
      exitRule: "holding_period",
      lookbackPeriod: 10,
      friction: 0.003,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        experimentType: "single",
      }),
    };

    // Full reset simulation: state becomes null
    let activeCanonical: CanonicalExperiment | null = exp1Canonical;
    let activeExpData = canonicalToExperimentData(activeCanonical);
    expect(activeExpData.condition.threshold).toBe(3.0);
    expect(activeExpData.holdingPeriod).toBe(3);
    expect(activeExpData.lookbackPeriod).toBe(10);
    expect(activeExpData.costAssumption).toBe(0.003);

    // RESET:
    activeCanonical = null;

    // Experiment 2 starts completely fresh:
    const q2 =
      "Does NIFTY tend to rise over the next 5 trading days after a daily decline of at least 2%?";
    const analysis2 = analyzeQuestionFallback(q2);

    const exp2Canonical: CanonicalExperiment = {
      originalQuestion: q2,
      experimentType: "single",
      instrument: analysis2.instrument,
      timeframe: "daily",
      threshold: analysis2.proposedThreshold, // 2.0
      conditionThreshold: analysis2.proposedThreshold, // 2.0
      holdingPeriod: analysis2.proposedHoldingDays, // 5
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: analysis2.instrument,
        threshold: analysis2.proposedThreshold,
        conditionThreshold: analysis2.proposedThreshold,
        holdingPeriod: analysis2.proposedHoldingDays,
        experimentType: "single",
      }),
    };

    expect(exp2Canonical.threshold).toBe(2.0);
    expect(exp2Canonical.holdingPeriod).toBe(5);
    expect(exp2Canonical.lookbackPeriod).toBe(5);
    expect(exp2Canonical.friction).toBe(0.001);

    expect(exp2Canonical.threshold).not.toBe(3.0);
    expect(exp2Canonical.holdingPeriod).not.toBe(3);
    expect(exp2Canonical.lookbackPeriod).not.toBe(10);
    expect(exp2Canonical.friction).not.toBe(0.003);

    expect(exp2Canonical.hypothesis).toContain("2%");
    expect(exp2Canonical.hypothesis).toContain("5-day");
    expect(exp2Canonical.hypothesis).not.toContain("3%");
    expect(exp2Canonical.hypothesis).not.toContain("3-day");
  });

  // TEST 10 — DETERMINISTIC ENGINE (IDENTICAL RUNS)
  it("TEST 10: Running the same experiment twice produces bitwise-identical results", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "Deterministic simulation test",
      experimentType: "single",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001,
      entryRule: "next_open",
    };

    const expData = canonicalToExperimentData(canonical);

    const run1 = runExperiment(expData);
    const run2 = runExperiment(expData);

    expect(run1.observations).toBe(run2.observations);
    expect(run1.trades.length).toBe(run2.trades.length);
    expect(run1.winningTrades).toBe(run2.winningTrades);
    expect(run1.losingTrades).toBe(run2.losingTrades);
    expect(run1.winRate).toBe(run2.winRate);
    expect(run1.averageReturn).toBe(run2.averageReturn);
    expect(run1.medianReturn).toBe(run2.medianReturn);
    expect(run1.cumulativeReturn).toBe(run2.cumulativeReturn);
    expect(run1.bestReturn).toBe(run2.bestReturn);
    expect(run1.worstReturn).toBe(run2.worstReturn);

    // Verify individual trade timestamps and returns are identical
    for (let i = 0; i < run1.trades.length; i++) {
      expect(run1.trades[i].entryDate).toBe(run2.trades[i].entryDate);
      expect(run1.trades[i].netReturn).toBe(run2.trades[i].netReturn);
    }
  });

  // FINAL END-TO-END GOLDEN TEST (SECTION 31 & 32)
  it("FINAL GOLDEN TEST: End-to-End comparative question with 2%, 5d, 5y, 0.10% friction", () => {
    const question =
      "Does NIFTY have a better 5-day return after two consecutive declining days than after a single-day decline?";

    // 1. ASK / PARSER
    const analysis = analyzeQuestionFallback(question);
    expect(analysis.instrument).toBe("NIFTY");
    expect(analysis.proposedThreshold).toBe(2.0);
    expect(analysis.proposedHoldingDays).toBe(5);
    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisonMetric).toBe("5-day return");
    expect(analysis.comparisonDirection).toBe("better");

    // 2. CLARIFY -> Canonical specification
    const compInfo = detectComparisonBranches(question, 2.0);
    expect(compInfo.isComparison).toBe(true);
    expect(compInfo.comparisons?.length).toBe(2);

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      experimentType: "comparison",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      conditionThreshold: 2.0,
      holdingPeriod: 5,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.001, // 0.10%
      entryRule: "next_open",
      comparisons: compInfo.comparisons,
      comparisonMetric: "5-day return",
      comparisonDirection: "better",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        experimentType: "comparison",
        comparisons: compInfo.comparisons,
        comparisonMetric: "5-day return",
      }),
    };

    // 3. DEFINE
    expect(canonical.instrument).toBe("NIFTY");
    expect(canonical.comparisons?.[0].name).toContain("consecutive");
    expect(canonical.comparisons?.[1].name).toContain("single");
    expect(canonical.comparisonMetric).toBe("5-day return");
    expect(canonical.threshold).toBe(2.0);
    expect(canonical.holdingPeriod).toBe(5);
    expect(canonical.lookbackPeriod).toBe(5);
    expect(canonical.friction).toBe(0.001);
    expect(canonical.entryRule).toBe("next_open");
    expect(canonical.exitRule).toBe("holding_period");

    // Hypothesis verification
    expect(canonical.hypothesis).toContain("better 5-day return");
    expect(canonical.hypothesis).not.toContain("recover faster");

    // 4. TEST (Deterministic Simulation)
    const expData = canonicalToExperimentData(canonical);
    const testResult = runExperiment(expData);

    expect(testResult.comparisonResults).toBeDefined();
    const { branchA, branchB, difference, verdict } = testResult.comparisonResults!;
    expect(branchA.observations).toBeGreaterThan(0);
    expect(branchB.observations).toBeGreaterThan(0);
    expect(difference).toBeDefined();
    expect(difference!.winRateDiff).toBe(Number((branchA.winRate - branchB.winRate).toFixed(1)));
    expect(difference!.avgReturnDiff).toBe(
      Number((branchA.averageReturn - branchB.averageReturn).toFixed(2))
    );
    expect(verdict).toContain("net average return");

    // 5. LEARN (Data vs Interpretation)
    const learnResult = generateInterpretationFallback(expData, testResult);

    // Section 1: Facts only
    expect(learnResult.dataSummary).toContain("Condition A");
    expect(learnResult.dataSummary).toContain("Condition B");
    expect(learnResult.dataSummary).toContain("percentage points (pp)");

    // Section 2: Grounded interpretation
    expect(learnResult.reasonableConclusions).not.toContain("recover faster");
    expect(learnResult.reasonableConclusions).toContain("5-day");

    // Section 4: Follow up questions
    expect(learnResult.followUpQuestions.length).toBeGreaterThanOrEqual(3);
  });
});
