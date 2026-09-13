export type ConditionType =
  | "daily_decline"
  | "daily_gain"
  | "gap_down"
  | "consecutive_down"
  | "volatility_spike";

export interface ExperimentCondition {
  type: ConditionType;
  threshold: number; // e.g. 2 for 2%
  consecutiveDays?: number; // e.g. 3
  consecutiveBars?: number; // e.g. 3
  description: string;
}

export type EntryType = "next_open" | "same_close";

export interface ExperimentEntry {
  type: EntryType;
  description: string;
}

export type ExitType = "holding_period" | "stop_loss" | "profit_target";

export interface ExperimentExit {
  type: ExitType;
  days: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  description: string;
}

export interface TestPeriod {
  start: string;
  end: string;
  label: string;
}

export type ExperimentStatus = "draft" | "ready" | "tested" | "completed";

export interface ComparisonBranch {
  id: "A" | "B";
  name: string;
  condition: ExperimentCondition;
}

/**
 * Structured representation of contextual / filter conditions in natural-language research questions.
 * Distinguishes primary entry trigger from secondary market regime / prior condition filters.
 */
export interface ContextCondition {
  id: string;
  type:
    | "prior_period_weakness"
    | "consecutive_declines"
    | "high_volatility"
    | "above_average_volume"
    | "downward_trend"
    | "generic_context";
  label: string; // e.g., "Previous 5-day market weakness"
  period?: number; // e.g. 5
  rawPhrase: string; // e.g., "when the market was already weak during the previous five trading days"
  isResolved: boolean; // true once a definition is selected/confirmed
  definition?: string; // e.g., "Net return over previous 5 days <= -2%"
  selectedOptionId?: string;
  customDefinition?: string;
}

export interface ExperimentData {
  market: string;
  instrument?: string;
  timeframe: string;
  condition: ExperimentCondition;
  entry: ExperimentEntry;
  exit: ExperimentExit;
  holdingPeriod: number;
  testPeriod: TestPeriod;
  costAssumption: number; // e.g. 0.00 or 0.0010 (0.10%)
  hypothesis: string;
  filters?: string[];
  experimentType?: "single" | "comparison";
  isComparison?: boolean;
  comparisons?: [ComparisonBranch, ComparisonBranch];
  comparisonMetric?: string;
  comparisonDirection?: "better" | "worse" | "higher" | "lower" | "faster" | "slower";
  comparison?: {
    enabled: boolean;
    conditionA: ExperimentCondition;
    conditionB: ExperimentCondition;
    metric: string;
    direction?: string;
  };
  // Direct canonical parameters ensuring 100% flow from DEFINE to TEST
  threshold?: number;
  lookbackPeriod?: number;
  friction?: number;
  entryRule?: EntryType;
  exitRule?: ExitType;
  originalQuestion?: string;
  canonical?: CanonicalExperiment;
  contract?: ExperimentContract;
  baselineType?: string;
  baselineDescription?: string;
  assumptionProvenance?: Record<string, AssumptionProvenance>;
  // Contextual condition preservation
  contextConditions?: ContextCondition[];
  unsupportedContextNotice?: string;
  unsupportedComparisonNotice?: string;
}

export type AssumptionProvenance =
  | "USER PROVIDED"
  | "AI SUGGESTED"
  | "SYSTEM REQUIRED"
  | "USER CONFIRMED";

export interface ExperimentContract {
  contractId: string;
  originalQuestion: string;
  instrument: string;
  timeframe: string;
  trigger: string;
  entryTiming: string;
  holdingPeriodDays: number;
  exitRuleDescription: string;
  testWindowYears: number;
  transactionCostPct: number; // e.g. 0.10 for 0.10%
  primaryMetric: string;
  baseline?: string;
  isComparison?: boolean;
  hypothesis: string;
  integrityStatus: "READY" | "NEEDS_REVIEW" | "BLOCKED";
  assumptionProvenance?: Record<string, AssumptionProvenance>;
  createdAt: string;
}

export interface SensitivityPoint {
  parameterName: "holdingPeriod" | "friction";
  label: string;
  value: number; // e.g. 3, 5, 10 for days or 0.0010 for friction
  isCurrent: boolean;
  averageReturn: number; // calculated deterministically
  winRate: number; // calculated deterministically
  tradeCount: number;
}

export interface SensitivityAnalysisResult {
  parameterTested: "holdingPeriod" | "friction";
  currentValueFormatted: string;
  points: SensitivityPoint[];
  interpretation: string;
  isStable: boolean;
}

/**
 * ONE Canonical Experiment Specification object that flows through:
 * ASK -> CLARIFY -> CHALLENGE -> DEFINE -> TEST -> LEARN
 */
export interface CanonicalExperiment {
  originalQuestion: string;
  experimentType?: "single" | "comparison";
  comparisons?: [ComparisonBranch, ComparisonBranch];
  comparisonMetric?: string;
  comparisonDirection?: "better" | "worse" | "higher" | "lower" | "faster" | "slower";
  comparison?: {
    enabled: boolean;
    conditionA: ExperimentCondition;
    conditionB: ExperimentCondition;
    metric: string;
    direction?: string;
  };
  instrument: string;
  timeframe: string;
  threshold: number; // e.g. 1 for 1%
  conditionThreshold?: number; // backwards compatibility alias
  holdingPeriod: number; // e.g. 3 for 3 days
  exitRule: ExitType; // "holding_period" | "stop_loss" | "profit_target"
  lookbackPeriod: number; // e.g. 10 (years)
  friction: number; // e.g. 0.00 (0.00%) or 0.0030 (0.30%)
  entryRule: EntryType; // "next_open" | "same_close"
  hypothesis: string;
  contextConditions?: ContextCondition[]; // Preserved contextual conditions
  baselineType?: "normal_days" | "non_trigger_days" | "another_condition" | "absolute_return";
  baselineDescription?: string;
  assumptionProvenance?: Record<string, AssumptionProvenance>;
  contract?: ExperimentContract;
  metadata?: Record<string, any>;
}

/**
 * Accurately extracts the target evaluation metric and comparison direction from natural-language queries.
 */
export function detectComparisonMetric(question: string): { metric: string; direction: string } {
  const qLower = question.toLowerCase();

  // Direction:
  let direction = "better";
  if (qLower.includes("worse") || qLower.includes("lower") || qLower.includes("slower") || qLower.includes("underperform")) {
    direction = "worse";
  } else if (qLower.includes("higher")) {
    direction = "higher";
  } else if (qLower.includes("faster")) {
    direction = "faster";
  }

  // 1. Win rate:
  if (qLower.includes("win rate") || qLower.includes("win-rate") || qLower.includes("higher win") || qLower.includes("win percentage")) {
    return { metric: "win rate", direction: "higher" };
  }

  // 2. Average return:
  if (qLower.includes("average return") || qLower.includes("higher average return") || qLower.includes("better average return")) {
    return { metric: "average return", direction: direction === "worse" ? "lower" : "higher" };
  }

  // 3. Specific N-day return e.g. "5-day return", "3-day return", "10-day return":
  const dayReturnMatch = qLower.match(/(\d+)\s*[- ]day\s+returns?/i);
  if (dayReturnMatch) {
    return { metric: `${dayReturnMatch[1]}-day return`, direction: direction === "worse" ? "worse" : "better" };
  }

  // 4. Drawdown:
  if (qLower.includes("drawdown") || qLower.includes("max drawdown") || qLower.includes("smaller loss")) {
    return { metric: "drawdown", direction: "lower" };
  }

  // 5. Profitability:
  if (qLower.includes("more profitable") || qLower.includes("profitability") || qLower.includes("profit")) {
    return { metric: "profitability", direction: "higher" };
  }

  // 6. Recovery speed:
  if (qLower.includes("recover faster") || qLower.includes("recovers faster") || qLower.includes("recovery speed") || qLower.includes("faster recovery")) {
    return { metric: "recovery speed", direction: "faster" };
  }

  // 7. General return:
  if (qLower.includes("better return") || qLower.includes("higher return") || qLower.includes("returns")) {
    return { metric: "5-day return", direction: direction === "worse" ? "worse" : "better" };
  }

  // 8. Performance / default:
  if (qLower.includes("perform better") || qLower.includes("performs better") || qLower.includes("outperform") || qLower.includes("performance")) {
    return { metric: "5-day return", direction: "better" };
  }

  return { metric: "5-day return", direction: "better" };
}

/**
 * Dynamically generates a formulated hypothesis from the resolved parameters,
 * preserving comparison semantics and contextual filter conditions.
 */
export function generateHypothesis(spec: {
  instrument: string;
  conditionThreshold?: number;
  threshold?: number;
  holdingPeriod: number;
  experimentType?: "single" | "comparison";
  comparisons?: [ComparisonBranch, ComparisonBranch] | ComparisonBranch[];
  comparisonMetric?: string;
  contextConditions?: ContextCondition[];
}): string {
  const thr = spec.threshold ?? spec.conditionThreshold ?? 2.0;

  // Build context clause dynamically from structured context conditions
  let contextClause = "";
  if (spec.contextConditions && spec.contextConditions.length > 0) {
    const clauses = spec.contextConditions.map((ctx) => {
      if (ctx.type === "prior_period_weakness") {
        const pStr = ctx.period ? `${ctx.period} trading days` : "prior period";
        if (ctx.isResolved && ctx.definition) {
          return `when the preceding ${pStr} met the defined weakness condition (${ctx.definition})`;
        }
        return `when the preceding ${pStr} showed market weakness (definition pending/unresolved)`;
      } else if (ctx.type === "downward_trend") {
        return ctx.isResolved && ctx.definition
          ? `when the market was in a defined downward trend (${ctx.definition})`
          : "when the market was already trending downward";
      } else if (ctx.type === "high_volatility") {
        return ctx.isResolved && ctx.definition
          ? `under defined high volatility conditions (${ctx.definition})`
          : "after unusually high volatility";
      } else if (ctx.type === "above_average_volume") {
        return ctx.isResolved && ctx.definition
          ? `on above-average volume (${ctx.definition})`
          : "when volume was above average";
      }
      return ctx.isResolved && ctx.definition
        ? `under condition: ${ctx.definition}`
        : `under condition: ${ctx.label}`;
    });
    contextClause = `, ${clauses.join(", ")}`;
  }

  if (
    spec.experimentType === "comparison" &&
    spec.comparisons &&
    spec.comparisons.length >= 2
  ) {
    const compA = spec.comparisons[0].name;
    const compB = spec.comparisons[1].name;
    const metricRaw = (spec.comparisonMetric || "").toLowerCase();

    if (metricRaw.includes("recover faster") || metricRaw.includes("recovery speed")) {
      return `Does ${spec.instrument} recover faster following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    if (metricRaw.includes("win rate") || metricRaw.includes("win-rate") || metricRaw.includes("higher win")) {
      return `Does ${spec.instrument} produce a higher win rate following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    if (metricRaw.includes("average return") || metricRaw.includes("higher average")) {
      return `Does ${spec.instrument} produce a higher average return following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    if (metricRaw.includes("drawdown") || metricRaw.includes("lower drawdown")) {
      return `Does ${spec.instrument} experience lower drawdown following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    if (metricRaw.includes("5-day return") || metricRaw.includes("return")) {
      const returnLabel = metricRaw.includes("5-day return") ? "5-day return" : `${spec.holdingPeriod}-day return`;
      return `Does ${spec.instrument} produce a better ${returnLabel} following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    if (metricRaw.includes("outperform") || metricRaw.includes("better") || metricRaw.includes("perform")) {
      return `Does ${spec.instrument} perform better following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
    }
    return `Does ${spec.instrument} produce better performance following ${compA} than following ${compB} (qualifying threshold: ${thr}%) over a ${spec.holdingPeriod}-day holding period?`;
  }

  if (!contextClause) {
    return `Buying ${spec.instrument} after a ${thr}% daily drop produces positive short-term returns over a ${spec.holdingPeriod}-day holding period.`;
  }

  return `Buying ${spec.instrument} after a daily decline of at least ${thr}%${contextClause}, produces positive returns over a ${spec.holdingPeriod}-day holding period.`;
}

/**
 * Validates that all quantitative parameters mentioned in the hypothesis
 * strictly match the canonical experiment specification (instrument, threshold, holding period, exit timing).
 * If any mismatch, stale text, or divergence is detected, regenerates the hypothesis
 * dynamically from the canonical specification so the canonical experiment remains the single source of truth.
 */
export function validateAndEnforceHypothesisFidelity(
  experiment: Partial<CanonicalExperiment> | Partial<ExperimentData>
): string {
  const instrument =
    experiment.instrument ||
    ("market" in experiment && typeof experiment.market === "string" ? experiment.market : "NIFTY");

  let threshold: number;
  if ("threshold" in experiment && typeof experiment.threshold === "number" && !isNaN(experiment.threshold)) {
    threshold = experiment.threshold;
  } else if ("conditionThreshold" in experiment && typeof experiment.conditionThreshold === "number" && !isNaN(experiment.conditionThreshold)) {
    threshold = experiment.conditionThreshold;
  } else if ("condition" in experiment && experiment.condition && typeof experiment.condition.threshold === "number") {
    threshold = experiment.condition.threshold;
  } else {
    threshold = 2.0;
  }

  const holdingPeriod =
    experiment.holdingPeriod ??
    ("exit" in experiment && experiment.exit && typeof experiment.exit.days === "number" ? experiment.exit.days : 5);

  const experimentType = experiment.experimentType ?? "single";
  const comparisons = experiment.comparisons;
  const comparisonMetric = experiment.comparisonMetric;
  const contextConditions = experiment.contextConditions;

  const candidateHypothesis = experiment.hypothesis?.trim();

  // If missing or empty, regenerate immediately from canonical parameters
  if (!candidateHypothesis) {
    return generateHypothesis({
      instrument,
      threshold,
      conditionThreshold: threshold,
      holdingPeriod,
      experimentType,
      comparisons,
      comparisonMetric,
      contextConditions,
    });
  }

  // Development-time validation against canonical parameters:
  let hasMismatch = false;
  let mismatchReason = "";

  // 1. Verify instrument matches
  const instRegex = new RegExp(`\\b${instrument.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (!instRegex.test(candidateHypothesis)) {
    hasMismatch = true;
    mismatchReason = `instrument mismatch (expected: ${instrument})`;
  } else if (instrument.toUpperCase() === "NIFTY" && /\bbank\s+nifty\b/i.test(candidateHypothesis)) {
    hasMismatch = true;
    mismatchReason = "instrument mismatch (expected NIFTY, found BANK NIFTY in hypothesis)";
  }

  // 2. If comparison experiment, verify that candidate hypothesis contains comparison semantics
  if (experimentType === "comparison" && comparisons && comparisons.length >= 2) {
    const isSingleConditionPattern = candidateHypothesis.startsWith("Buying ") && candidateHypothesis.includes("produces positive short-term returns");
    const hasBranchA = candidateHypothesis.toLowerCase().includes(comparisons[0].name.toLowerCase()) || candidateHypothesis.toLowerCase().includes("consecutive");
    const hasBranchB = candidateHypothesis.toLowerCase().includes(comparisons[1].name.toLowerCase()) || candidateHypothesis.toLowerCase().includes("single");
    
    if (isSingleConditionPattern || !hasBranchA || !hasBranchB) {
      hasMismatch = true;
      mismatchReason = "comparison experiment must preserve both comparison branches in hypothesis";
    }

    // Verify comparison metric compatibility: e.g. "5-day return" hypothesis must not say "recover faster"
    if (comparisonMetric) {
      const metricLower = comparisonMetric.toLowerCase();
      const hypLower = candidateHypothesis.toLowerCase();
      if (
        (metricLower.includes("return") && !hypLower.includes("return") && !hypLower.includes("performance") && !hypLower.includes("better")) ||
        (metricLower.includes("win rate") && !hypLower.includes("win rate")) ||
        (metricLower.includes("drawdown") && !hypLower.includes("drawdown")) ||
        (!metricLower.includes("recover") && hypLower.includes("recover faster"))
      ) {
        hasMismatch = true;
        mismatchReason = `comparison metric mismatch (canonical metric: ${comparisonMetric}, hypothesis has incompatible phrasing)`;
      }
    }
  }

  // 2. Verify threshold percentage:
  // Match the drop/decline percentage in the hypothesis e.g. "after a 3% daily drop" or "at least 3%" or "3% daily drop"
  const thresholdPattern = /(?:after a|at least|>=|>|drop of|decline of)\s*(\d+(?:\.\d+)?)\s*%/i;
  const generalPctPattern = /(\d+(?:\.\d+)?)\s*%/;
  const thrMatch = candidateHypothesis.match(thresholdPattern) || candidateHypothesis.match(generalPctPattern);

  if (thrMatch) {
    const mentionedThreshold = parseFloat(thrMatch[1]);
    if (Math.abs(mentionedThreshold - threshold) > 0.001) {
      hasMismatch = true;
      mismatchReason = `threshold mismatch (canonical experiment: ${threshold}%, hypothesis has: ${mentionedThreshold}%)`;
    }
  } else {
    hasMismatch = true;
    mismatchReason = "missing threshold percentage in hypothesis";
  }

  // 3. Verify holding period / exit timing:
  // Match the holding horizon e.g. "over a 5-day holding period" or "5 trading days"
  const dayPattern = /(?:over a|for)\s*(\d+)\s*(?:-day|day|trading\s*day)/i;
  const generalDayPattern = /(\d+)\s*(?:-day|day|trading\s*day)/i;
  const dayMatch = candidateHypothesis.match(dayPattern) || candidateHypothesis.match(generalDayPattern);

  if (dayMatch) {
    const mentionedDays = parseInt(dayMatch[1], 10);
    if (mentionedDays !== holdingPeriod) {
      hasMismatch = true;
      mismatchReason = `holding period mismatch (canonical experiment: ${holdingPeriod} days, hypothesis has: ${mentionedDays} days)`;
    }
  } else {
    hasMismatch = true;
    mismatchReason = "missing holding period in hypothesis";
  }

  // 4. Verify context condition preservation if present
  if (contextConditions && contextConditions.length > 0) {
    const ctx = contextConditions[0];
    if (ctx.isResolved && ctx.definition) {
      if (!candidateHypothesis.includes(ctx.definition)) {
        hasMismatch = true;
        mismatchReason = "resolved context condition definition missing from hypothesis";
      }
    }
  }

  if (hasMismatch) {
    console.warn(
      `[TradeLens AI Hypothesis Fidelity Enforcer] Mismatch detected: ${mismatchReason}. Regenerating hypothesis dynamically from canonical experiment.`
    );
    return generateHypothesis({
      instrument,
      threshold,
      conditionThreshold: threshold,
      holdingPeriod,
      experimentType,
      comparisons,
      comparisonMetric,
      contextConditions,
    });
  }

  return candidateHypothesis;
}

/**
 * Converts CanonicalExperiment to ExperimentData ensuring 100% fidelity.
 */
export function canonicalToExperimentData(canonical: CanonicalExperiment): ExperimentData {
  const isComparison =
    canonical.experimentType === "comparison" &&
    canonical.comparisons &&
    canonical.comparisons.length >= 2;

  const threshold = canonical.threshold ?? canonical.conditionThreshold ?? 2.0;
  const holdingPeriod = canonical.holdingPeriod ?? 5;
  const lookbackPeriod = canonical.lookbackPeriod ?? 5;
  const friction = canonical.friction ?? 0.0;
  const entryRule = canonical.entryRule ?? "next_open";
  const exitRule = canonical.exitRule ?? "holding_period";

  let conditionDescription = isComparison
    ? `${canonical.comparisons![0].name} VS ${canonical.comparisons![1].name}`
    : `Daily decline >= ${threshold}%`;

  if (canonical.contextConditions && canonical.contextConditions.length > 0) {
    const ctxLabel = canonical.contextConditions[0].period
      ? `prior ${canonical.contextConditions[0].period}-day weakness`
      : canonical.contextConditions[0].label;
    conditionDescription = `${conditionDescription} after ${ctxLabel}`;
  }

  const primaryCondition: ExperimentCondition = isComparison
    ? canonical.comparisons![0].condition
    : {
        type: "daily_decline",
        threshold: threshold,
        description: conditionDescription,
      };

  const exitDescription =
    exitRule === "stop_loss"
      ? `Stop loss at 2% risk cap or close after ${holdingPeriod} days`
      : exitRule === "profit_target"
      ? `Profit target at 3% or close after ${holdingPeriod} days`
      : `Close after ${holdingPeriod} trading days`;

  const startYear = 2025 - lookbackPeriod;

  const resolvedComparisonMetric =
    canonical.comparisonMetric ??
    canonical.comparison?.metric ??
    (canonical.originalQuestion ? detectComparisonMetric(canonical.originalQuestion).metric : undefined);

  const resolvedComparisonDirection = (canonical.comparisonDirection ??
    canonical.comparison?.direction ??
    (canonical.originalQuestion ? detectComparisonMetric(canonical.originalQuestion).direction : "better")) as
    | "better"
    | "worse"
    | "higher"
    | "lower"
    | "faster"
    | "slower";

  return {
    market: canonical.instrument,
    instrument: canonical.instrument,
    timeframe: canonical.timeframe,
    condition: primaryCondition,
    entry: {
      type: entryRule,
      description:
        entryRule === "next_open"
          ? "Buy at next trading day's open"
          : "Buy at same day close",
    },
    exit: {
      type: exitRule,
      days: holdingPeriod,
      stopLossPercent: exitRule === "stop_loss" ? 2.0 : undefined,
      takeProfitPercent: exitRule === "profit_target" ? 3.0 : undefined,
      description: exitDescription,
    },
    holdingPeriod: holdingPeriod,
    testPeriod: {
      start: `${startYear}-01-01`,
      end: "2025-01-01",
      label: `Last ${lookbackPeriod} years`,
    },
    costAssumption: friction,
    hypothesis: validateAndEnforceHypothesisFidelity({
      ...canonical,
      instrument: canonical.instrument,
      threshold,
      conditionThreshold: threshold,
      holdingPeriod,
      lookbackPeriod,
      friction,
      entryRule,
      exitRule,
      comparisonMetric: resolvedComparisonMetric,
      comparisonDirection: resolvedComparisonDirection,
    }),
    experimentType: canonical.experimentType,
    isComparison: isComparison,
    comparisons: canonical.comparisons,
    comparisonMetric: resolvedComparisonMetric,
    comparisonDirection: resolvedComparisonDirection,
    comparison: isComparison
      ? canonical.comparison || {
          enabled: true,
          conditionA: canonical.comparisons![0].condition,
          conditionB: canonical.comparisons![1].condition,
          metric: resolvedComparisonMetric || "5-day return",
          direction: resolvedComparisonDirection || "better",
        }
      : undefined,
    // Contextual condition preservation
    contextConditions: canonical.contextConditions,
    unsupportedContextNotice:
      canonical.contextConditions && canonical.contextConditions.length > 0
        ? "Context condition identified but not yet supported by the prototype simulation engine."
        : undefined,
    // Canonical mirror fields
    threshold: threshold,
    lookbackPeriod: lookbackPeriod,
    friction: friction,
    entryRule: entryRule,
    exitRule: exitRule,
    originalQuestion: canonical.originalQuestion,
    contract: canonical.contract || buildExperimentContract(canonical),
    baselineType: canonical.baselineType,
    baselineDescription: canonical.baselineDescription,
    assumptionProvenance: canonical.assumptionProvenance,
    canonical: {
      ...canonical,
      threshold,
      conditionThreshold: threshold,
      holdingPeriod,
      lookbackPeriod,
      friction,
      entryRule,
      exitRule,
      contextConditions: canonical.contextConditions,
      contract: canonical.contract,
      baselineType: canonical.baselineType,
      baselineDescription: canonical.baselineDescription,
      assumptionProvenance: canonical.assumptionProvenance,
    },
  };
}

/**
 * Validates that all extracted semantic components from the user's question
 * are preserved in the resolved experiment before entering DEFINE stage.
 */
export function validateIntentPreservation(canonical: CanonicalExperiment): {
  isValid: boolean;
  originalIntent: string[];
  resolvedIntent: string[];
  missingConditions: string[];
} {
  const originalIntent: string[] = [];
  const resolvedIntent: string[] = [];
  const missingConditions: string[] = [];

  const q = (canonical.originalQuestion || "").toLowerCase();

  // 1. Instrument
  originalIntent.push(canonical.instrument || "NIFTY");
  resolvedIntent.push(canonical.instrument || "NIFTY");

  // 2. Comparison validation (A vs B intent)
  const comparisonMarkers = [
    "compared with",
    "compared to",
    "better after",
    "better than",
    "worse than",
    "faster than",
    "faster after",
    "slower than",
    "slower after",
    "than after",
    " vs ",
    " vs. ",
    "versus",
    "relative to",
    "more effective than",
    "outperform",
    "difference between",
    "perform better",
    "performs better",
    "recover faster",
    "recovers faster",
    "which performs better",
    "which recovers faster",
  ];
  const hasComparisonIntent = comparisonMarkers.some((m) => q.includes(m));

  if (hasComparisonIntent) {
    originalIntent.push("Comparison experiment intent (Condition A vs. Condition B)");
    if (
      canonical.experimentType === "comparison" &&
      canonical.comparisons &&
      canonical.comparisons.length >= 2
    ) {
      resolvedIntent.push(
        `Comparison: ${canonical.comparisons[0].name} VS ${canonical.comparisons[1].name}`
      );
    } else {
      missingConditions.push(
        "Comparison branches (Condition A vs Condition B) missing from resolved experiment - collapsed to single condition"
      );
    }
  }

  // 3. Primary Event
  const thr = canonical.threshold ?? canonical.conditionThreshold ?? 2.0;
  if (
    q.includes("large one-day decline") ||
    q.includes("large one day decline") ||
    q.includes("one-day decline") ||
    q.includes("falling") ||
    q.includes("drop") ||
    q.includes("decline")
  ) {
    originalIntent.push(q.includes("large") ? "large one-day decline" : "one-day decline");
    resolvedIntent.push(`>=${thr}% daily decline`);
  }

  // 4. Contextual condition (e.g. previous five trading days weakness)
  const hasWeaknessIntent = q.includes("weak") || q.includes("weakness");
  if (hasWeaknessIntent) {
    const periodMatch = q.match(/(five|5|two|2|three|3|four|4|ten|10)\s*(?:trading\s*)?days/i);
    const pStr = periodMatch ? periodMatch[1] : "prior";
    originalIntent.push(`previous ${pStr}-day weakness`);

    const matchedContext = canonical.contextConditions?.find(
      (c) => c.type === "prior_period_weakness" || c.label.toLowerCase().includes("weak")
    );
    if (matchedContext) {
      resolvedIntent.push(
        `previous ${matchedContext.period ?? 5}-day weakness = ${
          matchedContext.definition || "unresolved/pending definition"
        }`
      );
    } else {
      missingConditions.push("previous 5-day weakness");
    }
  }

  // 5. Holding & Exit
  resolvedIntent.push(`${canonical.holdingPeriod}-day holding`);
  resolvedIntent.push(`${canonical.lookbackPeriod}-year lookback`);
  resolvedIntent.push(`${(canonical.friction * 100).toFixed(2)}% friction`);
  resolvedIntent.push(canonical.entryRule === "next_open" ? "next-day-open entry" : "same-day-close entry");

  // Development-time structured logging
  console.log("\n[TradeLens AI Intent Validation]");
  console.log("Original intent:\n" + originalIntent.map((i) => `  - ${i}`).join("\n"));
  console.log("Resolved intent:\n" + resolvedIntent.map((i) => `  - ${i}`).join("\n"));

  if (missingConditions.length > 0) {
    console.warn("WARNING: Extracted conditions missing from resolved experiment:\n" + missingConditions.map((m) => `  ! ${m}`).join("\n"));
    return {
      isValid: false,
      originalIntent,
      resolvedIntent,
      missingConditions,
    };
  }

  console.log("✓ All original semantic conditions successfully preserved in experiment specification.\n");
  return {
    isValid: true,
    originalIntent,
    resolvedIntent,
    missingConditions,
  };
}

/**
 * Validates that the experiment specification exactly matches the user's explicit selections.
 */
export function validateExperimentAgainstSelections(
  exp: CanonicalExperiment,
  expected: {
    threshold: number;
    holdingDays: number;
    testYears: number;
    friction: number;
  }
): boolean {
  const actualThreshold = exp.threshold ?? exp.conditionThreshold;
  const matches =
    actualThreshold === expected.threshold &&
    exp.holdingPeriod === expected.holdingDays &&
    exp.lookbackPeriod === expected.testYears &&
    Math.abs(exp.friction - expected.friction) < 0.00001;

  if (!matches) {
    console.error("CRITICAL STATE MISMATCH: Experiment specification does not match user selections!", {
      actual: {
        threshold: actualThreshold,
        holdingPeriod: exp.holdingPeriod,
        lookbackPeriod: exp.lookbackPeriod,
        friction: exp.friction,
      },
      expected,
    });
    throw new Error(
      `State propagation error: Experiment values (${actualThreshold}%, ${exp.holdingPeriod}d, ${exp.lookbackPeriod}y, ${(exp.friction * 100).toFixed(2)}%) do not match user selections (${expected.threshold}%, ${expected.holdingDays}d, ${expected.testYears}y, ${(expected.friction * 100).toFixed(2)}%)`
    );
  }

  // Ensure hypothesis strictly matches canonical selections
  exp.hypothesis = validateAndEnforceHypothesisFidelity(exp);
  return true;
}

/**
 * Pre-simulation development-time assertion: asserts experiment matches selected parameters.
 */
export function assertExperimentFidelity(
  experiment: ExperimentData,
  expected: {
    threshold: number;
    holdingDays: number;
    testYears: number;
    friction: number;
  }
): boolean {
  const expThreshold = experiment.threshold ?? experiment.condition.threshold;
  const expHolding = experiment.holdingPeriod;
  const expLookback =
    experiment.lookbackPeriod ??
    (experiment.testPeriod?.label ? parseInt(experiment.testPeriod.label.replace(/\D/g, ""), 10) : undefined);
  const expFriction = experiment.friction ?? experiment.costAssumption ?? 0;

  const matches =
    expThreshold === expected.threshold &&
    expHolding === expected.holdingDays &&
    expLookback === expected.testYears &&
    Math.abs(expFriction - expected.friction) < 0.00001;

  if (!matches) {
    throw new Error(
      `Development-time assertion failed: Experiment parameters (${expThreshold}%, ${expHolding}d, ${expLookback}y, ${(expFriction * 100).toFixed(2)}%) do not match selected configuration (${expected.threshold}%, ${expected.holdingDays}d, ${expected.testYears}y, ${(expected.friction * 100).toFixed(2)}%)`
    );
  }

  // Ensure hypothesis strictly matches canonical experiment parameters
  experiment.hypothesis = validateAndEnforceHypothesisFidelity(experiment);
  return true;
}


export interface Experiment {
  id: string;
  title: string;
  originalQuestion: string;
  market: string;
  timeframe: string;
  condition: ExperimentCondition;
  entryCondition: ExperimentEntry;
  exitCondition: ExperimentExit;
  holdingPeriod: number;
  testPeriod: TestPeriod;
  costAssumption: number;
  hypothesis: string;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentVersion {
  id: string;
  experimentId: string;
  versionNumber: number;
  experimentData: ExperimentData;
  changeSummary: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  entryIndex: number;
  exitIndex: number;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  grossReturn: number; // percentage
  netReturn: number; // percentage after roundtrip costs
  isWin: boolean;
  holdingDays: number;
}

export interface EquityPoint {
  tradeIndex: number;
  date: string;
  tradeReturn: number;
  cumulativeReturn: number;
}

export interface ReturnBucket {
  range: string;
  count: number;
}

export interface ComparisonBranchResult {
  name: string;
  observations: number;
  executedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageReturn: number;
  medianReturn: number;
  cumulativeReturn: number;
  recoveryMetric: {
    recoveryRate: number; // percentage of trades that reached or exceeded entry price within holding period
    avgDaysToRecover: number; // average bars until peak/recovery
    description: string;
  };
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  versionNumber: number;
  observations: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage, e.g. 61.2
  averageReturn: number; // percentage, e.g. 0.83
  medianReturn: number; // percentage, e.g. 0.54
  bestReturn: number; // percentage, e.g. 5.21
  worstReturn: number; // percentage, e.g. -4.12
  cumulativeReturn: number; // compounded percentage, e.g. 24.8
  datasetType: string;
  trades: Trade[];
  equityCurve: EquityPoint[];
  returnDistribution: ReturnBucket[];
  comparisonResults?: {
    branchA: ComparisonBranchResult;
    branchB: ComparisonBranchResult;
    metric?: string;
    difference: {
      winRateDiff: number; // branchA.winRate - branchB.winRate
      avgReturnDiff: number; // branchA.averageReturn - branchB.averageReturn
      medianReturnDiff: number; // branchA.medianReturn - branchB.medianReturn
      recoveryRateDiff: number; // branchA.recoveryMetric.recoveryRate - branchB.recoveryMetric.recoveryRate
    };
    verdict: string;
    unsupportedComparisonNotice?: string;
  };
  unsupportedComparisonNotice?: string;
  frictionCostRoundTrip?: number;
  sensitivity?: SensitivityAnalysisResult;
  contract?: ExperimentContract;
  createdAt: string;
}

/**
 * Builds the canonical Experiment Contract as the authoritative single source of truth.
 */
export function buildExperimentContract(
  canonical: CanonicalExperiment,
  integrityStatus: "READY" | "NEEDS_REVIEW" | "BLOCKED" = "READY"
): ExperimentContract {
  const threshold = canonical.threshold ?? canonical.conditionThreshold ?? 2.0;
  const holding = canonical.holdingPeriod ?? 5;
  const friction = canonical.friction ?? 0.001;
  const frictionPct = Number((friction * 100).toFixed(2));
  const lookback = canonical.lookbackPeriod ?? 5;
  const isComparison =
    canonical.experimentType === "comparison" &&
    !!canonical.comparisons &&
    canonical.comparisons.length >= 2;

  let triggerStr = isComparison
    ? `${canonical.comparisons![0].name} (≥${threshold}%) vs. ${canonical.comparisons![1].name} (≥${threshold}%)`
    : `Daily decline ≥ ${threshold}%`;

  if (canonical.contextConditions && canonical.contextConditions.length > 0) {
    const ctx = canonical.contextConditions[0];
    triggerStr += ` after ${ctx.label} (${ctx.definition || "rule defined"})`;
  }

  const entryTiming =
    canonical.entryRule === "same_close"
      ? "Same trading day's close (look-ahead risk)"
      : "Next trading day's open";

  const exitRuleDescription =
    canonical.exitRule === "stop_loss"
      ? `Stop loss at 2% risk cap or close after ${holding} trading days`
      : canonical.exitRule === "profit_target"
      ? `Profit target at 3% or close after ${holding} trading days`
      : `Close after ${holding} trading days`;

  let baselineStr: string | undefined = undefined;
  if (isComparison) {
    baselineStr = canonical.comparisons![1].name;
  } else if (canonical.baselineDescription) {
    baselineStr = canonical.baselineDescription;
  } else if (canonical.baselineType) {
    baselineStr = canonical.baselineType.replace(/_/g, " ");
  }

  const metric = canonical.comparisonMetric || "5-day average return";

  return {
    contractId: `contract-${canonical.instrument.toLowerCase()}-${Date.now()}`,
    originalQuestion: canonical.originalQuestion,
    instrument: canonical.instrument,
    timeframe: canonical.timeframe || "daily",
    trigger: triggerStr,
    entryTiming,
    holdingPeriodDays: holding,
    exitRuleDescription,
    testWindowYears: lookback,
    transactionCostPct: frictionPct,
    primaryMetric: metric,
    baseline: baselineStr,
    isComparison,
    hypothesis: canonical.hypothesis || validateAndEnforceHypothesisFidelity(canonical),
    integrityStatus,
    assumptionProvenance: canonical.assumptionProvenance,
    createdAt: new Date().toISOString(),
  };
}