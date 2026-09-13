import { describe, it, expect } from "vitest";
import {
  CanonicalExperiment,
  generateHypothesis,
  validateAndEnforceHypothesisFidelity,
  canonicalToExperimentData,
  validateExperimentAgainstSelections,
  assertExperimentFidelity,
  validateIntentPreservation,
} from "@/types/experiment";
import { analyzeQuestionFallback, generateInterpretationFallback } from "@/lib/ai/gemini";
import { runExperiment } from "@/lib/research/engine";

describe("State Propagation and Canonical Experiment Fidelity", () => {
  it("regenerates formulated hypothesis dynamically from resolved parameters", () => {
    const hyp = generateHypothesis({
      instrument: "NIFTY",
      conditionThreshold: 3,
      holdingPeriod: 3,
    });
    expect(hyp).toBe(
      "Buying NIFTY after a 3% daily drop produces positive short-term returns over a 3-day holding period."
    );

    const hyp2 = generateHypothesis({
      instrument: "BANKNIFTY",
      conditionThreshold: 2.5,
      holdingPeriod: 7,
    });
    expect(hyp2).toBe(
      "Buying BANKNIFTY after a 2.5% daily drop produces positive short-term returns over a 7-day holding period."
    );
  });

  it("converts canonical experiment specification with exact fidelity for Stage 3, 4, 5", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion:
        "Does NIFTY tend to recover within 3 trading days after falling more than 2% in a single day?",
      instrument: "NIFTY",
      timeframe: "daily",
      conditionThreshold: 3,
      holdingPeriod: 3,
      exitRule: "holding_period",
      lookbackPeriod: 10,
      friction: 0.003, // 0.30%
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        conditionThreshold: 3,
        holdingPeriod: 3,
      }),
    };

    const expData = canonicalToExperimentData(canonical);

    expect(expData.market).toBe("NIFTY");
    expect(expData.condition.threshold).toBe(3);
    expect(expData.condition.description).toBe("Daily decline >= 3%");
    expect(expData.holdingPeriod).toBe(3);
    expect(expData.exit.days).toBe(3);
    expect(expData.exit.description).toBe("Close after 3 trading days");
    expect(expData.costAssumption).toBe(0.003);
    expect(expData.testPeriod.label).toBe("Last 10 years");
    expect(expData.hypothesis).toBe(
      "Buying NIFTY after a 3% daily drop produces positive short-term returns over a 3-day holding period."
    );
    expect(canonical.originalQuestion).toBe(
      "Does NIFTY tend to recover within 3 trading days after falling more than 2% in a single day?"
    );
  });

  it("validates experiment against user selections and catches mismatches", () => {
    const canonical: CanonicalExperiment = {
      originalQuestion: "Test question",
      instrument: "NIFTY",
      timeframe: "daily",
      conditionThreshold: 3,
      holdingPeriod: 3,
      exitRule: "holding_period",
      lookbackPeriod: 10,
      friction: 0.003,
      entryRule: "next_open",
      hypothesis: "Test",
    };

    // Correct match succeeds
    expect(
      validateExperimentAgainstSelections(canonical, {
        threshold: 3,
        holdingDays: 3,
        testYears: 10,
        friction: 0.003,
      })
    ).toBe(true);

    // Mismatch in threshold throws error
    expect(() =>
      validateExperimentAgainstSelections(canonical, {
        threshold: 2, // stale default
        holdingDays: 3,
        testYears: 10,
        friction: 0.003,
      })
    ).toThrowError(/State propagation error/);

    // Mismatch in holding period throws error
    expect(() =>
      validateExperimentAgainstSelections(canonical, {
        threshold: 3,
        holdingDays: 5, // stale default
        testYears: 10,
        friction: 0.003,
      })
    ).toThrowError(/State propagation error/);
  });

  it("Regression Test A: 1% / 1 day / 3 years / 0%", () => {
    const exp: CanonicalExperiment = {
      originalQuestion: "Test A",
      instrument: "NIFTY",
      timeframe: "daily",
      conditionThreshold: 1,
      holdingPeriod: 1,
      exitRule: "holding_period",
      lookbackPeriod: 3,
      friction: 0.0,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        conditionThreshold: 1,
        holdingPeriod: 1,
      }),
    };

    const expData = canonicalToExperimentData(exp);
    expect(expData.condition.threshold).toBe(1);
    expect(expData.holdingPeriod).toBe(1);
    expect(expData.testPeriod.label).toBe("Last 3 years");
    expect(expData.costAssumption).toBe(0.0);
  });

  it("Regression Test B: 3% / 10 days / 10 years / 0.30%", () => {
    const exp: CanonicalExperiment = {
      originalQuestion: "Test B",
      instrument: "NIFTY",
      timeframe: "daily",
      conditionThreshold: 3,
      holdingPeriod: 10,
      exitRule: "holding_period",
      lookbackPeriod: 10,
      friction: 0.003,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        conditionThreshold: 3,
        holdingPeriod: 10,
      }),
    };

    const expData = canonicalToExperimentData(exp);
    expect(expData.condition.threshold).toBe(3);
    expect(expData.holdingPeriod).toBe(10);
    expect(expData.testPeriod.label).toBe("Last 10 years");
    expect(expData.costAssumption).toBe(0.003);
  });

  it("Regression Test C: Custom threshold (2.5%) / custom holding (7 days)", () => {
    const exp: CanonicalExperiment = {
      originalQuestion: "Test C",
      instrument: "NIFTY",
      timeframe: "daily",
      conditionThreshold: 2.5,
      holdingPeriod: 7,
      exitRule: "holding_period",
      lookbackPeriod: 5,
      friction: 0.0015,
      entryRule: "next_open",
      hypothesis: generateHypothesis({
        instrument: "NIFTY",
        conditionThreshold: 2.5,
        holdingPeriod: 7,
      }),
    };

    const expData = canonicalToExperimentData(exp);
    expect(expData.condition.threshold).toBe(2.5);
    expect(expData.condition.description).toBe("Daily decline >= 2.5%");
    expect(expData.holdingPeriod).toBe(7);
    expect(expData.costAssumption).toBe(0.0015);
  });

  it("Regression Test D: Comparative Query (BANK NIFTY, 2 consecutive vs single-day, 3%, 10d, 3y, 0.00% friction)", () => {
    const question =
      "Does BANK NIFTY perform better after two consecutive days of decline compared with a single-day decline?";

    // 1. Check analyzer heuristic extraction
    const analysis = analyzeQuestionFallback(question);

    expect(analysis.instrument).toBe("BANK NIFTY");
    expect(analysis.experimentType).toBe("comparison");
    expect(analysis.comparisons).toBeDefined();
    expect(analysis.comparisons?.length).toBe(2);
    expect(analysis.comparisons?.[0].name).toContain("two consecutive declining days");
    expect(analysis.comparisons?.[1].name).toContain("single-day decline");

    // 2. Simulate User's Explicit Selections in Stage 2 CLARIFY
    const userSelections = {
      threshold: 3.0,
      holdingDays: 10,
      testYears: 3,
      friction: 0.0, // 0.00% round trip selected explicitly
      exitRule: "holding_period" as const,
      entryRule: "next_open" as const,
    };

    const updatedComparisons = analysis.comparisons?.map((c: any) => ({
      ...c,
      condition: { ...c.condition, threshold: userSelections.threshold },
    })) as any;

    const canonical: CanonicalExperiment = {
      originalQuestion: question,
      instrument: analysis.instrument,
      timeframe: analysis.timeframe,
      conditionThreshold: userSelections.threshold,
      holdingPeriod: userSelections.holdingDays,
      exitRule: userSelections.exitRule,
      lookbackPeriod: userSelections.testYears,
      friction: userSelections.friction,
      entryRule: userSelections.entryRule,
      experimentType: analysis.experimentType,
      comparisons: updatedComparisons,
      hypothesis: generateHypothesis({
        instrument: analysis.instrument,
        conditionThreshold: userSelections.threshold,
        holdingPeriod: userSelections.holdingDays,
        experimentType: analysis.experimentType,
        comparisons: updatedComparisons,
      }),
    };

    // 3. Verify validation against user selections succeeds
    expect(
      validateExperimentAgainstSelections(canonical, {
        threshold: userSelections.threshold,
        holdingDays: userSelections.holdingDays,
        testYears: userSelections.testYears,
        friction: userSelections.friction,
      })
    ).toBe(true);

    // 4. Verify canonical to experiment specification conversion (Stage 3 DEFINE)
    const expData = canonicalToExperimentData(canonical);

    expect(expData.market).toBe("BANK NIFTY");
    expect(expData.costAssumption).toBe(0.0);
    expect(expData.holdingPeriod).toBe(10);
    expect(expData.exit.days).toBe(10);
    expect(expData.exit.description).toBe("Close after 10 trading days");
    expect(expData.testPeriod.label).toBe("Last 3 years");
    expect(expData.entry.description).toBe("Buy at next trading day's open");
    expect(expData.experimentType).toBe("comparison");
    expect(expData.comparisons?.length).toBe(2);

    // Verify friction display string in Stage 3 DEFINE
    const frictionDisplay = `${((expData.costAssumption ?? 0) * 100).toFixed(2)}% round trip`;
    expect(frictionDisplay).toBe("0.00% round trip");

    // Verify comparison hypothesis preservation
    expect(expData.hypothesis).toContain("BANK NIFTY");
    expect(expData.hypothesis).toContain("two consecutive declining days");
    expect(expData.hypothesis).toContain("single-day decline");
    expect(expData.hypothesis).toContain("3%");
    expect(expData.hypothesis).toContain("10-day");

    // 5. Verify Stage 4 deterministic simulation handles comparison branches
    const result = runExperiment(expData);

    expect(result.comparisonResults).toBeDefined();
    expect(result.comparisonResults?.branchA.name).toContain("two consecutive declining days");
    expect(result.comparisonResults?.branchB.name).toContain("single-day decline");
    expect(result.comparisonResults?.verdict).toBeDefined();
  });

  describe("QA Verification: DEFINE -> TEST Parameter Fidelity & Determinism", () => {
    // TEST A: 1% threshold, 3-day holding, 10-year lookback, 0.30% friction
    it("TEST A: 1% threshold, 3-day holding, 10-year lookback, 0.30% friction", () => {
      const canonicalA: CanonicalExperiment = {
        originalQuestion: "Does NIFTY recover after a 1% fall?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 1.0,
        conditionThreshold: 1.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003, // 0.30%
        entryRule: "next_open",
        hypothesis: generateHypothesis({
          instrument: "NIFTY",
          threshold: 1.0,
          holdingPeriod: 3,
        }),
      };

      const expDataA = canonicalToExperimentData(canonicalA);

      // Verify assertExperimentFidelity succeeds
      expect(
        assertExperimentFidelity(expDataA, {
          threshold: 1.0,
          holdingDays: 3,
          testYears: 10,
          friction: 0.003,
        })
      ).toBe(true);

      const resultA = runExperiment(expDataA);

      // Verify lookback evaluated 2,520 bars (10 years * 252 bars)
      expect(resultA.datasetType).toContain("2,520 bars");
      expect(resultA.datasetType).toContain("10y");
      expect(resultA.trades.length).toBeGreaterThan(0);

      // Verify holding period of exactly 3 trading days
      for (const t of resultA.trades) {
        expect(t.holdingDays).toBe(3);
        // Verify round-trip cost of 0.30% applied: netReturn = grossReturn - 0.30%
        expect(Number((t.grossReturn - 0.3).toFixed(2))).toBe(t.netReturn);
      }
    });

    // TEST B: 3% threshold, 10-day holding, 3-year lookback, 0.00% friction
    it("TEST B: 3% threshold, 10-day holding, 3-year lookback, 0.00% friction", () => {
      const canonicalB: CanonicalExperiment = {
        originalQuestion: "Does NIFTY recover after a 3% fall over 10 days with 0% friction?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 10,
        exitRule: "holding_period",
        lookbackPeriod: 3,
        friction: 0.0, // 0.00% frictionless
        entryRule: "next_open",
        hypothesis: generateHypothesis({
          instrument: "NIFTY",
          threshold: 3.0,
          holdingPeriod: 10,
        }),
      };

      const expDataB = canonicalToExperimentData(canonicalB);

      // Verify assertExperimentFidelity succeeds with 0.00% friction without falling back
      expect(
        assertExperimentFidelity(expDataB, {
          threshold: 3.0,
          holdingDays: 10,
          testYears: 3,
          friction: 0.0,
        })
      ).toBe(true);

      const resultB = runExperiment(expDataB);

      // Verify lookback evaluated 756 bars (3 years * 252 bars)
      expect(resultB.datasetType).toContain("756 bars");
      expect(resultB.datasetType).toContain("3y");
      expect(resultB.trades.length).toBeGreaterThan(0);

      // Verify holding period of 10 trading days and 0.00% friction (grossReturn === netReturn)
      for (const t of resultB.trades) {
        expect(t.holdingDays).toBe(10);
        expect(t.netReturn).toBe(t.grossReturn);
      }
    });

    // TEST C: 2% threshold, 5-day holding, 5-year lookback, 0.10% friction
    it("TEST C: 2% threshold, 5-day holding, 5-year lookback, 0.10% friction", () => {
      const canonicalC: CanonicalExperiment = {
        originalQuestion: "Standard 2% drop 5-day hold test",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001, // 0.10%
        entryRule: "next_open",
        hypothesis: generateHypothesis({
          instrument: "NIFTY",
          threshold: 2.0,
          holdingPeriod: 5,
        }),
      };

      const expDataC = canonicalToExperimentData(canonicalC);

      expect(
        assertExperimentFidelity(expDataC, {
          threshold: 2.0,
          holdingDays: 5,
          testYears: 5,
          friction: 0.001,
        })
      ).toBe(true);

      const resultC = runExperiment(expDataC);

      // Verify lookback evaluated 1,260 bars (5 years * 252 bars)
      expect(resultC.datasetType).toContain("1,260 bars");
      expect(resultC.datasetType).toContain("5y");
      expect(resultC.trades.length).toBeGreaterThan(0);

      for (const t of resultC.trades) {
        expect(t.holdingDays).toBe(5);
        expect(Number((t.grossReturn - 0.1).toFixed(2))).toBe(t.netReturn);
      }
    });

    // Verify TEST A, B, and C produce distinct, experiment-specific configurations and results
    it("verifies TEST A, B, and C produce distinct experiment-specific results", () => {
      const expA = canonicalToExperimentData({
        originalQuestion: "A",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 1.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003,
        entryRule: "next_open",
        hypothesis: "A",
      });

      const expB = canonicalToExperimentData({
        originalQuestion: "B",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        holdingPeriod: 10,
        exitRule: "holding_period",
        lookbackPeriod: 3,
        friction: 0.0,
        entryRule: "next_open",
        hypothesis: "B",
      });

      const expC = canonicalToExperimentData({
        originalQuestion: "C",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
        hypothesis: "C",
      });

      const resA = runExperiment(expA);
      const resB = runExperiment(expB);
      const resC = runExperiment(expC);

      // Different lookback datasets
      expect(resA.datasetType).toContain("2,520 bars");
      expect(resB.datasetType).toContain("756 bars");
      expect(resC.datasetType).toContain("1,260 bars");

      // Different signal counts due to 1% vs 3% vs 2% threshold and holding periods
      expect(resA.observations).not.toBe(resB.observations);
      expect(resA.observations).not.toBe(resC.observations);
      expect(resB.observations).not.toBe(resC.observations);

      // Different win rates / returns
      expect(resA.winRate).toBeDefined();
      expect(resB.winRate).toBeDefined();
      expect(resC.winRate).toBeDefined();
    });

    // Verify 100% Determinism: Running identical experiment twice produces identical results
    it("confirms repeated identical experiments produce identical results", () => {
      const expA = canonicalToExperimentData({
        originalQuestion: "Determinism test",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 1.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003,
        entryRule: "next_open",
        hypothesis: "Determinism test",
      });

      const run1 = runExperiment(expA);
      const run2 = runExperiment(expA);

      expect(run1.observations).toBe(run2.observations);
      expect(run1.winningTrades).toBe(run2.winningTrades);
      expect(run1.losingTrades).toBe(run2.losingTrades);
      expect(run1.winRate).toBe(run2.winRate);
      expect(run1.averageReturn).toBe(run2.averageReturn);
      expect(run1.medianReturn).toBe(run2.medianReturn);
      expect(run1.bestReturn).toBe(run2.bestReturn);
      expect(run1.worstReturn).toBe(run2.worstReturn);
      expect(run1.cumulativeReturn).toBe(run2.cumulativeReturn);
      expect(run1.trades.length).toBe(run2.trades.length);
      expect(run1.datasetType).toBe(run2.datasetType);
    });
  });

  describe("Preservation of Original Research Intent with Context Conditions", () => {
    const question =
      "Do large one-day declines in NIFTY lead to better returns when the market was already weak during the previous five trading days?";

    it("CLARIFY: identifies 'large decline' as ambiguous and extracts prior 5-day weakness as context condition", () => {
      const analysis = analyzeQuestionFallback(question);

      expect(analysis.instrument).toBe("NIFTY");
      expect(analysis.isAmbiguous).toBe(true);
      expect(analysis.detectedAmbiguousPhrase).toBe("large decline");

      // Verifies context condition was extracted
      expect(analysis.contextConditions).toBeDefined();
      expect(analysis.contextConditions!.length).toBeGreaterThanOrEqual(1);

      const ctx = analysis.contextConditions![0];
      expect(ctx.type).toBe("prior_period_weakness");
      expect(ctx.period).toBe(5);
      expect(ctx.isResolved).toBe(false); // Must not invent a definition
      expect(ctx.label).toBe("Previous 5 trading days showed market weakness");

      // Verifies missing information alerts user to missing threshold and weakness definition
      expect(analysis.missingInformation).toContain("Drop threshold for 'large decline'");
      expect(analysis.missingInformation).toContain("Definition of 'weak' during prior 5 days");

      // Verifies targeted clarification questions
      const weaknessQ = analysis.clarificationQuestions.find(
        (q) => q.id === "context_weakness_question"
      );
      expect(weaknessQ).toBeDefined();
      expect(weaknessQ?.title).toContain("weak during the previous 5 trading days");
      expect(weaknessQ?.options.some((o) => o.label.includes("Net return over previous 5 days <= -2%"))).toBe(true);
      expect(weaknessQ?.options.some((o) => o.label.includes("negative"))).toBe(true);
      expect(weaknessQ?.options.some((o) => o.label.includes("trend was negative"))).toBe(true);
    });

    it("DEFINE: preserves complete hypothesis with prior 5-day weakness condition when resolved", () => {
      const analysis = analyzeQuestionFallback(question);
      const ctx = analysis.contextConditions![0];

      // User clarifies parameters:
      // Drop threshold = 3%, Holding period = 3 trading days, Exit = After holding period,
      // Lookback = 10 years, Friction = 0.30%, Entry = next trading day's open
      // Weakness definition = "Net return over previous 5 days <= -2%"
      const resolvedContext = {
        ...ctx,
        isResolved: true,
        definition: "Net return over previous 5 days <= -2%",
      };

      const canonical: CanonicalExperiment = {
        originalQuestion: question,
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003, // 0.30%
        entryRule: "next_open",
        contextConditions: [resolvedContext],
        hypothesis: generateHypothesis({
          instrument: "NIFTY",
          threshold: 3.0,
          conditionThreshold: 3.0,
          holdingPeriod: 3,
          contextConditions: [resolvedContext],
        }),
      };

      const expData = canonicalToExperimentData(canonical);

      // Verify header and condition description preserve context
      expect(expData.condition.description).toContain("3%");
      expect(expData.condition.description).toContain("prior 5-day weakness");

      // Verify formulated hypothesis contains both trigger and defined weakness condition
      expect(expData.hypothesis).toBe(
        "Buying NIFTY after a daily decline of at least 3%, when the preceding 5 trading days met the defined weakness condition (Net return over previous 5 days <= -2%), produces positive returns over a 3-day holding period."
      );

      // Verify user parameters are authoritative and intact
      expect(expData.market).toBe("NIFTY");
      expect(expData.condition.threshold).toBe(3.0);
      expect(expData.holdingPeriod).toBe(3);
      expect(expData.exit.days).toBe(3);
      expect(expData.exit.description).toBe("Close after 3 trading days");
      expect(expData.testPeriod.label).toBe("Last 10 years");
      expect(expData.costAssumption).toBe(0.003);
      expect(expData.entry.type).toBe("next_open");

      // Validate intent preservation
      const validation = validateIntentPreservation(canonical);
      expect(validation.isValid).toBe(true);
      expect(validation.missingConditions.length).toBe(0);
      expect(validation.resolvedIntent.some((r) => r.includes("previous 5-day weakness"))).toBe(true);
    });

    it("DEFINE: hypothesis indicates unresolved context when definition is pending rather than inventing one", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: question,
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003,
        entryRule: "next_open",
        contextConditions: [
          {
            id: "ctx_weakness",
            type: "prior_period_weakness",
            label: "Previous 5 trading days showed market weakness",
            period: 5,
            rawPhrase: "when the market was already weak during the previous five trading days",
            isResolved: false,
          },
        ],
        hypothesis: "",
      };

      const hyp = generateHypothesis(canonical);
      expect(hyp).toContain("definition pending/unresolved");
      expect(hyp).not.toContain("Net return over previous 5 days <= -2%");
    });

    it("TEST & LEARN: transparently flags that context condition is not supported by prototype simulation engine", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: question,
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003,
        entryRule: "next_open",
        contextConditions: [
          {
            id: "ctx_weakness",
            type: "prior_period_weakness",
            label: "Previous 5 trading days showed market weakness",
            period: 5,
            rawPhrase: "when the market was already weak during the previous five trading days",
            isResolved: true,
            definition: "Net return over previous 5 days <= -2%",
          },
        ],
        hypothesis: "Hypothesis",
      };

      const expData = canonicalToExperimentData(canonical);

      // Verify TestStage unsupportedContextNotice requirement
      expect(expData.unsupportedContextNotice).toBe(
        "Context condition identified but not yet supported by the prototype simulation engine."
      );

      // Run simulation
      const result = runExperiment(expData);
      expect(result.datasetType).toContain("2,520 bars");

      // Learn Stage: Verify interpretation does NOT claim evidence for unmodeled condition
      const interpretation = generateInterpretationFallback(expData, {
        observations: result.observations,
        winningTrades: result.winningTrades,
        losingTrades: result.losingTrades,
        winRate: result.winRate,
        averageReturn: result.averageReturn,
        medianReturn: result.medianReturn,
        bestReturn: result.bestReturn,
        worstReturn: result.worstReturn,
        cumulativeReturn: result.cumulativeReturn,
      });

      expect(interpretation.reasonableConclusions).toContain(
        "was not modeled by the prototype simulation engine"
      );
      expect(interpretation.reasonableConclusions).toContain(
        "cannot confirm or reject whether prior market weakness improves rebound returns"
      );
      expect(
        interpretation.risksAndLimitations.some((r) =>
          r.includes("Context Filter Not Modeled")
        )
      ).toBe(true);
    });

    it("STAGE 5 QA: enforces correct friction direction, entry rule fidelity, and outcome grounding", () => {
      // Configuration for the exact user experiment:
      // Instrument: NIFTY, Threshold: 3%, Holding: 3d, Lookback: 10y, Friction: 0.30%, Entry: next_open
      const expData = canonicalToExperimentData({
        originalQuestion: question,
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003, // 0.30%
        entryRule: "next_open",
        hypothesis: "Hypothesis",
      });

      // Negative returns case (actual results: avg -0.29%, median -0.58%, cumulative -40.27%)
      const negativeSummary = {
        observations: 182,
        winningTrades: 84,
        losingTrades: 98,
        winRate: 46,
        averageReturn: -0.29,
        medianReturn: -0.58,
        cumulativeReturn: -40.27,
      };

      const interpretation = generateInterpretationFallback(expData, negativeSummary);

      // ISSUE 1: Friction direction must NEVER call 0.30% -> 0.20% an "increase"
      const frictionQ = interpretation.followUpQuestions.find((q) => q.includes("friction"));
      expect(frictionQ).toBeDefined();
      expect(frictionQ).toContain("reducing round-trip friction from 0.30% to 0.20%");
      expect(frictionQ).not.toContain("increasing round-trip friction from 0.30% to 0.20%");

      // ISSUE 2: Entry rule fidelity: MUST say "next trading day's open" and NEVER say "immediately"
      expect(interpretation.reasonableConclusions).toContain("next trading day's open");
      expect(interpretation.reasonableConclusions).not.toContain("entering immediately");

      // ISSUE 3: Do NOT claim an "observed recovery" or "edge" when returns are negative
      expect(interpretation.reasonableConclusions).not.toContain("recovery");
      expect(interpretation.reasonableConclusions).toContain("negative average returns");
      interpretation.followUpQuestions.forEach((q) => {
        expect(q.toLowerCase()).not.toContain("eliminate the observed recovery");
        expect(q.toLowerCase()).not.toContain("relative edge");
      });

      // Positive returns case: verify direction and positive terminology when returns actually are positive
      const positiveSummary = {
        observations: 150,
        winningTrades: 90,
        losingTrades: 60,
        winRate: 60,
        averageReturn: 0.85,
        medianReturn: 0.70,
        cumulativeReturn: 18.5,
      };
      const expPositiveLowFriction = canonicalToExperimentData({
        ...expData,
        costAssumption: 0.001, // 0.10%
        friction: 0.001,
      });
      const positiveInterp = generateInterpretationFallback(expPositiveLowFriction, positiveSummary);
      const posFrictionQ = positiveInterp.followUpQuestions.find((q) => q.includes("friction"));
      expect(posFrictionQ).toBeDefined();
      // Moving from 0.10% to 0.25% is an increase
      expect(posFrictionQ).toContain("increasing round-trip friction from 0.10% to 0.25%");
      expect(positiveInterp.reasonableConclusions).toContain("positive average returns");
    });
  });

  describe("Stage 3 Formulated Hypothesis Fidelity & Mismatch Healing", () => {
    it("Test A: 2% / 5 days / 5 years / 0.10% -> Hypothesis dynamically reflects 2% and 5 days", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: "How does NIFTY perform after falling 2%?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001, // 0.10%
        entryRule: "next_open",
      };

      const expData = canonicalToExperimentData(canonical);

      // Verify hypothesis contains canonical threshold and holding period
      expect(expData.hypothesis).toMatch(/2%\s*(?:daily\s*)?drop|decline of at least 2%/i);
      expect(expData.hypothesis).toMatch(/5-day/i);
      expect(expData.hypothesis).toContain("NIFTY");
      expect(expData.hypothesis).not.toContain("3%");

      // Verify canonical parameters are authoritative
      expect(expData.condition.threshold).toBe(2.0);
      expect(expData.holdingPeriod).toBe(5);
      expect(expData.costAssumption).toBe(0.001);
    });

    it("Test B: 3% / 3 days / 10 years / 0.30% -> Hypothesis dynamically reflects 3% and 3 days", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: "How does NIFTY perform after falling 3%?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 3,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003, // 0.30%
        entryRule: "next_open",
      };

      const expData = canonicalToExperimentData(canonical);

      // Verify hypothesis contains canonical threshold and holding period
      expect(expData.hypothesis).toMatch(/3%\s*(?:daily\s*)?drop|decline of at least 3%/i);
      expect(expData.hypothesis).toMatch(/3-day/i);
      expect(expData.hypothesis).toContain("NIFTY");
      expect(expData.hypothesis).not.toContain("2%");

      expect(expData.condition.threshold).toBe(3.0);
      expect(expData.holdingPeriod).toBe(3);
      expect(expData.costAssumption).toBe(0.003);
    });

    it("Test C: 1% / 10 days / 3 years / 0% -> Hypothesis dynamically reflects 1% and 10 days", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: "How does NIFTY perform after falling 1%?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 1.0,
        conditionThreshold: 1.0,
        holdingPeriod: 10,
        exitRule: "holding_period",
        lookbackPeriod: 3,
        friction: 0.0,
        entryRule: "next_open",
      };

      const expData = canonicalToExperimentData(canonical);

      // Verify hypothesis contains canonical threshold and holding period
      expect(expData.hypothesis).toMatch(/1%\s*(?:daily\s*)?drop|decline of at least 1%/i);
      expect(expData.hypothesis).toMatch(/10-day/i);
      expect(expData.hypothesis).toContain("NIFTY");

      expect(expData.condition.threshold).toBe(1.0);
      expect(expData.holdingPeriod).toBe(10);
      expect(expData.costAssumption).toBe(0.0);
    });

    it("Regression Healing: Stale 3% hypothesis with 2% canonical threshold is automatically healed to 2%", () => {
      // Simulates the exact user regression:
      // Canonical experiment has threshold 2%, but a stale hypothesis containing 3% is passed
      const staleHypothesis =
        "Buying NIFTY after a 3% daily drop produces positive short-term returns over a 5-day holding period.";

      const canonicalWithStaleHypothesis: CanonicalExperiment = {
        originalQuestion: "How does NIFTY perform after falling 2%?",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
        hypothesis: staleHypothesis, // STALE 3% STRING
      };

      // 1. Direct validation function detects mismatch and regenerates
      const healedHypothesis = validateAndEnforceHypothesisFidelity(canonicalWithStaleHypothesis);
      expect(healedHypothesis).toContain("2%");
      expect(healedHypothesis).not.toContain("3%");
      expect(healedHypothesis).toContain("5-day");
      expect(healedHypothesis).toContain("NIFTY");

      // 2. canonicalToExperimentData heals the hypothesis
      const expData = canonicalToExperimentData(canonicalWithStaleHypothesis);
      expect(expData.hypothesis).toContain("2%");
      expect(expData.hypothesis).not.toContain("3%");
      expect(expData.hypothesis).toContain("5-day");

      // 3. assertExperimentFidelity enforces the healing
      assertExperimentFidelity(expData, {
        threshold: 2.0,
        holdingDays: 5,
        testYears: 5,
        friction: 0.001,
      });
      expect(expData.hypothesis).toContain("2%");
    });

    it("Regression Healing: Holding period mismatch is automatically healed to canonical value", () => {
      // Canonical holding is 5 days, but hypothesis says 3 days
      const staleHypothesis =
        "Buying NIFTY after a 2% daily drop produces positive short-term returns over a 3-day holding period.";

      const canonical: CanonicalExperiment = {
        originalQuestion: "Test holding mismatch",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5, // Canonical is 5 days
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
        hypothesis: staleHypothesis,
      };

      const expData = canonicalToExperimentData(canonical);
      expect(expData.hypothesis).toContain("5-day");
      expect(expData.hypothesis).not.toContain("3-day");
      expect(expData.hypothesis).toContain("2%");
    });

    it("Regression Healing: Instrument mismatch is automatically healed to canonical instrument", () => {
      // Canonical instrument is NIFTY, but hypothesis says BANK NIFTY
      const staleHypothesis =
        "Buying BANK NIFTY after a 2% daily drop produces positive short-term returns over a 5-day holding period.";

      const canonical: CanonicalExperiment = {
        originalQuestion: "Test instrument mismatch",
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
        hypothesis: staleHypothesis,
      };

      const expData = canonicalToExperimentData(canonical);
      expect(expData.hypothesis).toContain("NIFTY");
      expect(expData.hypothesis).not.toContain("BANK NIFTY");
    });

    it("CONFIRMATION: DEFINE -> TEST parameter propagation remains 100% intact for 2% / 5 days / 5 years / 0.10%", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: "How does NIFTY perform after a 2% decline?",
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

      // 1. Convert canonical to ExperimentData
      const expData = canonicalToExperimentData(canonical);

      // Verify all canonical DEFINE fields
      expect(expData.instrument).toBe("NIFTY");
      expect(expData.condition.threshold).toBe(2.0);
      expect(expData.threshold).toBe(2.0);
      expect(expData.holdingPeriod).toBe(5);
      expect(expData.exit.days).toBe(5);
      expect(expData.lookbackPeriod).toBe(5);
      expect(expData.costAssumption).toBe(0.001);
      expect(expData.friction).toBe(0.001);
      expect(expData.entryRule).toBe("next_open");
      expect(expData.hypothesis).toMatch(/2%/);
      expect(expData.hypothesis).toMatch(/5-day/);

      // 2. Run deterministic simulation engine
      const simResult = runExperiment(expData);

      expect(simResult.experimentId).toBeDefined();
      expect(simResult.observations).toBeGreaterThan(0);
      // Simulation must use 5-year lookback (1,260 bars)
      expect(simResult.datasetType).toContain("1,260 bars");
      expect(simResult.datasetType).toContain("5y");
      expect(simResult.trades.length).toBeGreaterThan(0);
      for (const t of simResult.trades) {
        expect(t.holdingDays).toBe(5);
        expect(Number((t.grossReturn - 0.1).toFixed(2))).toBe(t.netReturn);
      }
    });
  });

  describe("Comparison Intent & Branch Preservation (ASK -> CLARIFY -> DEFINE -> TEST -> LEARN)", () => {
    const comparisonQuestion =
      "Does NIFTY recover faster after two consecutive down days than after a single down day?";

    it("TEST 1: Single condition question preserves single condition behavior", () => {
      const singleQ = "Does NIFTY recover after falling 2% in a single trading day?";
      const analysis = analyzeQuestionFallback(singleQ);
      expect(analysis.experimentType).toBe("single");
      expect(analysis.comparisons).toBeUndefined();

      const canonical: CanonicalExperiment = {
        originalQuestion: singleQ,
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

      // Validates successfully for single condition
      expect(() => validateIntentPreservation(canonical)).not.toThrow();
      const expData = canonicalToExperimentData(canonical);
      expect(expData.experimentType).toBe("single");
      expect(expData.hypothesis).toContain("Buying NIFTY after a 2% daily drop");
    });

    it("TEST 2: Core comparison question detects comparison and preserves branches across all stages", () => {
      // 1. ASK stage analysis
      const analysis = analyzeQuestionFallback(comparisonQuestion);
      expect(analysis.experimentType).toBe("comparison");
      expect(analysis.comparisons).toBeDefined();
      expect(analysis.comparisons?.length).toBe(2);
      expect(analysis.comparisonMetric).toBe("recovery speed");

      // 2. CLARIFY stage canonical setup
      const canonicalComparisons = analysis.comparisons?.map((c) => ({
        ...c,
        condition: { ...c.condition, threshold: 3.0 },
      })) as [ComparisonBranch, ComparisonBranch];

      const canonical: CanonicalExperiment = {
        originalQuestion: comparisonQuestion,
        experimentType: "comparison",
        comparisons: canonicalComparisons,
        comparisonMetric: analysis.comparisonMetric,
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.003,
        entryRule: "next_open",
        hypothesis: generateHypothesis({
          instrument: "NIFTY",
          threshold: 3.0,
          conditionThreshold: 3.0,
          holdingPeriod: 5,
          experimentType: "comparison",
          comparisons: canonicalComparisons,
          comparisonMetric: analysis.comparisonMetric,
        }),
      };

      // Both conditions must share identical threshold
      expect(canonical.comparisons?.[0].condition.threshold).toBe(3.0);
      expect(canonical.comparisons?.[1].condition.threshold).toBe(3.0);

      // Hypothesis must compare Condition A and Condition B
      expect(canonical.hypothesis).toContain("two consecutive down days");
      expect(canonical.hypothesis).toContain("single down day");
      expect(canonical.hypothesis).toContain("3%");
      expect(canonical.hypothesis).toContain("5-day");

      // Intent validation passes
      const valResult = validateIntentPreservation(canonical);
      expect(valResult.isValid).toBe(true);
      expect(valResult.missingConditions).toHaveLength(0);

      // 3. DEFINE stage data conversion
      const expData = canonicalToExperimentData(canonical);
      expect(expData.experimentType).toBe("comparison");
      expect(expData.comparisons).toHaveLength(2);
      expect(expData.hypothesis).toBe(canonical.hypothesis);

      // 4. TEST stage deterministic simulation
      const simResult = runExperiment(expData);
      expect(simResult.comparisonResults).toBeDefined();
      const comp = simResult.comparisonResults!;

      expect(comp.branchA.observations).toBeGreaterThan(0);
      expect(comp.branchB.observations).toBeGreaterThan(0);
      expect(comp.branchA.winRate).toBeGreaterThanOrEqual(0);
      expect(comp.branchB.winRate).toBeGreaterThanOrEqual(0);
      expect(comp.branchA.executedTrades).toBeDefined();
      expect(comp.branchB.executedTrades).toBeDefined();
      expect(comp.branchA.medianReturn).toBeDefined();
      expect(comp.branchB.medianReturn).toBeDefined();
      expect(comp.branchA.recoveryMetric).toBeDefined();
      expect(comp.branchB.recoveryMetric).toBeDefined();
      expect(comp.difference).toBeDefined();
      expect(comp.verdict).toBeTruthy();

      // 5. LEARN stage synthesis
      const interp = generateInterpretationFallback(expData, {
        observations: simResult.observations,
        winningTrades: simResult.winningTrades,
        losingTrades: simResult.losingTrades,
        winRate: simResult.winRate,
        averageReturn: simResult.averageReturn,
        medianReturn: simResult.medianReturn,
        bestReturn: simResult.bestReturn,
        worstReturn: simResult.worstReturn,
        cumulativeReturn: simResult.cumulativeReturn,
        comparisonResults: simResult.comparisonResults,
      });

      expect(interp.dataSummary).toContain(comp.branchA.name);
      expect(interp.dataSummary).toContain(comp.branchB.name);
      expect(interp.dataSummary).toContain("Difference");
      expect(interp.reasonableConclusions).not.toContain("definitely has an edge");
      expect(interp.reasonableConclusions).not.toContain("causal");
    });

    it("TEST 3: Alternative comparison wording (versus / better)", () => {
      const q = "Is NIFTY's 5-day return better after two consecutive declines versus one large decline?";
      const analysis = analyzeQuestionFallback(q);
      expect(analysis.experimentType).toBe("comparison");
      expect(analysis.comparisons).toBeDefined();
      expect(analysis.comparisons?.length).toBe(2);
    });

    it("TEST 4: 'Better than' comparison detection", () => {
      const q = "Does buying after repeated market weakness perform better than buying after a single decline?";
      const analysis = analyzeQuestionFallback(q);
      expect(analysis.experimentType).toBe("comparison");
      expect(analysis.comparisons).toBeDefined();
      expect(analysis.comparisons?.length).toBe(2);
    });

    it("TEST 5: validateIntentPreservation fails if a comparison question is collapsed into single condition", () => {
      // Comparison question collapsed to single experiment type
      const invalidCanonical: CanonicalExperiment = {
        originalQuestion: comparisonQuestion,
        experimentType: "single", // COLLAPSED!
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 3.0,
        conditionThreshold: 3.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 5,
        friction: 0.001,
        entryRule: "next_open",
      };

      const validation = validateIntentPreservation(invalidCanonical);
      expect(validation.isValid).toBe(false);
      expect(
        validation.missingConditions.some((m) => m.toLowerCase().includes("comparison"))
      ).toBe(true);
    });

    it("TEST 6: Engine calculates recovery metrics and differences between branches accurately", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: comparisonQuestion,
        experimentType: "comparison",
        comparisons: [
          {
            name: "Two consecutive down days",
            condition: {
              type: "consecutive_down",
              threshold: 2.0,
              consecutiveBars: 2,
              description: "2 consecutive down days >= 2%",
            },
          },
          {
            name: "Single down day",
            condition: {
              type: "daily_decline",
              threshold: 2.0,
              description: "Daily decline >= 2%",
            },
          },
        ],
        instrument: "NIFTY",
        timeframe: "daily",
        threshold: 2.0,
        conditionThreshold: 2.0,
        holdingPeriod: 5,
        exitRule: "holding_period",
        lookbackPeriod: 10,
        friction: 0.001,
        entryRule: "next_open",
      };

      const expData = canonicalToExperimentData(canonical);
      const res = runExperiment(expData);

      expect(res.comparisonResults).toBeDefined();
      const comp = res.comparisonResults!;

      // Verify diff calculations
      const expectedWinDiff = Number((comp.branchA.winRate - comp.branchB.winRate).toFixed(1));
      expect(comp.difference.winRateDiff).toBe(expectedWinDiff);

      const expectedAvgDiff = Number((comp.branchA.averageReturn - comp.branchB.averageReturn).toFixed(2));
      expect(comp.difference.avgReturnDiff).toBe(expectedAvgDiff);

      const expectedMedDiff = Number(
        ((comp.branchA.medianReturn ?? 0) - (comp.branchB.medianReturn ?? 0)).toFixed(2)
      );
      expect(comp.difference.medianReturnDiff).toBe(expectedMedDiff);
    });

    it("TEST 7: Unsupported comparison logic provides disclaimer instead of faked results", () => {
      const canonical: CanonicalExperiment = {
        originalQuestion: "Compare solar flares vs lunar cycles for NIFTY",
        experimentType: "comparison",
        comparisons: [
          {
            name: "Solar flare days",
            condition: {
              type: "custom_unsupported" as any,
              threshold: 2.0,
              description: "Solar flare peak",
            },
          },
          {
            name: "Lunar cycles",
            condition: {
              type: "custom_unsupported" as any,
              threshold: 2.0,
              description: "Full moon",
            },
          },
        ],
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
      const res = runExperiment(expData);

      expect(res.unsupportedComparisonNotice).toBeDefined();
      expect(res.unsupportedComparisonNotice).toContain("not yet support");
    });
  });
});