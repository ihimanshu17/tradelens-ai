import { CanonicalExperiment, ComparisonBranch, generateHypothesis, validateAndEnforceHypothesisFidelity } from "@/types/experiment";
import {
  ResearchIntegrityResult,
  IntegrityCheckItem,
  IntegrityStatus,
  ComparisonBaselineOption,
  ComparisonBaselineOptionId,
} from "@/types/research";

/**
 * Supported index instruments in prototype dataset.
 */
export const SUPPORTED_INSTRUMENTS = ["NIFTY", "BANK NIFTY", "NIFTY50", "BANKNIFTY", "NIFTY 50", "BANK NIFTY INDEX"];

/**
 * Words indicating comparative intent where a baseline is logically required.
 */
export const COMPARATIVE_WORDS = [
  { word: "higher", metric: "higher returns" },
  { word: "better", metric: "better performance" },
  { word: "faster", metric: "faster recovery" },
  { word: "recovers faster", metric: "faster recovery" },
  { word: "outperform", metric: "outperformance" },
  { word: "more profitable", metric: "higher profitability" },
  { word: "lower risk", metric: "lower drawdown" },
  { word: "lower drawdown", metric: "lower drawdown" },
  { word: "superior", metric: "superior return" },
];

/**
 * Non-trading domain keywords used to detect off-topic questions.
 */
export const NON_TRADING_KEYWORDS = [
  "react over angular",
  "react vs angular",
  "angular over react",
  "angular vs react",
  "react js",
  "reactjs",
  "react native",
  "angular",
  "vue.js",
  "vuejs",
  "javascript",
  "typescript",
  "programming",
  "frontend",
  "backend",
  "recipe",
  "cooking",
  "weather forecast",
  "movie",
  "song lyrics",
  "capital of",
  "president of",
  "prime minister of",
];

/**
 * Trading domain keywords to verify market relevance.
 */
export const TRADING_KEYWORDS = [
  "nifty",
  "bank nifty",
  "banknifty",
  "index",
  "stock",
  "market",
  "trading",
  "trade",
  "buy",
  "buying",
  "sell",
  "selling",
  "return",
  "returns",
  "profit",
  "loss",
  "drawdown",
  "drop",
  "fall",
  "decline",
  "gain",
  "rebound",
  "recovery",
  "recover",
  "consecutive",
  "volatility",
  "gap",
  "gap-down",
  "day",
  "days",
  "holding",
  "edge",
  "strategy",
];

/**
 * Validates whether the natural-language question is within the trading research domain.
 */
export function validateQuestionScope(question: string): {
  isValid: boolean;
  reason?: string;
} {
  const trimmed = question.trim();
  if (!trimmed || trimmed.length < 3) {
    return {
      isValid: false,
      reason: "Please provide a valid research question to investigate.",
    };
  }

  const qLower = trimmed.toLowerCase();

  // Check for impossible/contradictory parameters in question
  if (/\b(?:hold|held)\s*(?:for\s*)?0\s*(?:trading\s*)?days?\b/i.test(qLower) || /\b0\s*(?:-day|day)\s*hold\b/i.test(qLower)) {
    return {
      isValid: false,
      reason: "Contradictory parameter: Holding duration must be at least 1 trading day to simulate an evaluation.",
    };
  }

  // Check for mutually exclusive / contradictory indicator bounds (e.g. "above 80 and below 20")
  const contradictoryBoundsMatch = qLower.match(
    /\b(?:above|>|greater than)\s*(\d+(?:\.\d+)?)\s*(?:and|while)\s*(?:below|<|less than)\s*(\d+(?:\.\d+)?)\b/i
  );
  if (contradictoryBoundsMatch) {
    const upper = parseFloat(contradictoryBoundsMatch[1]);
    const lower = parseFloat(contradictoryBoundsMatch[2]);
    if (upper >= lower) {
      return {
        isValid: false,
        reason: `Contradictory condition: An indicator cannot simultaneously be above ${upper} and below ${lower}. Please refine your entry rules.`,
      };
    }
  }

  const contradictoryBoundsRevMatch = qLower.match(
    /\b(?:below|<|less than)\s*(\d+(?:\.\d+)?)\s*(?:and|while)\s*(?:above|>|greater than)\s*(\d+(?:\.\d+)?)\b/i
  );
  if (contradictoryBoundsRevMatch) {
    const lower = parseFloat(contradictoryBoundsRevMatch[1]);
    const upper = parseFloat(contradictoryBoundsRevMatch[2]);
    if (upper >= lower) {
      return {
        isValid: false,
        reason: `Contradictory condition: An indicator cannot simultaneously be below ${lower} and above ${upper}. Please refine your entry rules.`,
      };
    }
  }

  // Check for non-trading technical / conversational queries (e.g., React vs Angular)
  const foundNonTrading = NON_TRADING_KEYWORDS.find((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(qLower);
  });

  if (foundNonTrading) {
    return {
      isValid: false,
      reason: `TradeLens AI evaluates quantitative market strategies, but "${trimmed}" appears to be an off-topic or software question (${foundNonTrading}). I need more information before this can become a testable experiment.`,
    };
  }

  // Check for extremely vague questions (e.g., "What happens if the market does something good?")
  if (
    qLower.includes("does something good") ||
    qLower.includes("does something bad") ||
    qLower.includes("something good") ||
    qLower.includes("something bad") ||
    qLower.includes("does something")
  ) {
    return {
      isValid: false,
      reason: "I need more information before this can become a testable experiment. The term 'something good' is too vague to construct a quantitative entry condition.",
    };
  }

  // Check for pure gibberish / nonsense (e.g. "asdfghjk qwerty")
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const isPureSymbolsOrNonsense = words.every((w) => !/[aeiouy]/i.test(w) && !/\d/.test(w));
  if (isPureSymbolsOrNonsense && words.length > 0) {
    return {
      isValid: false,
      reason: "I need more information before this can become a testable experiment. Please enter a meaningful research question.",
    };
  }

  // Check if at least one market/trading indicator is present
  const hasTradingKeyword = TRADING_KEYWORDS.some((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    return regex.test(qLower);
  });

  if (!hasTradingKeyword && !qLower.includes("%") && !/\b\d+\s*days?\b/i.test(qLower)) {
    return {
      isValid: false,
      reason: "I need more information before this can become a testable experiment. Please include a market instrument (e.g. NIFTY) and a specific condition or event.",
    };
  }

  return { isValid: true };
}

/**
 * Detects whether the question asks a comparative question without a defined comparison baseline.
 */
export function detectMissingComparisonBaseline(
  question: string,
  canonical: CanonicalExperiment
): {
  isMissing: boolean;
  comparativePhrase?: string;
  explanation?: string;
} {
  const qLower = (question || canonical.originalQuestion || "").toLowerCase();

  // If experiment already has comparison branches defined, Condition B is the explicit baseline
  if (
    canonical.experimentType === "comparison" &&
    canonical.comparisons &&
    canonical.comparisons.length >= 2
  ) {
    return { isMissing: false };
  }

  // If user already selected an explicit baseline, it is not missing
  if (
    canonical.baselineType &&
    canonical.baselineType !== "absolute_return"
  ) {
    return { isMissing: false };
  }

  // If already set to absolute_return, user explicitly removed comparison
  if (canonical.baselineType === "absolute_return") {
    return { isMissing: false };
  }

  // Check for comparative words in the question
  const matchedComp = COMPARATIVE_WORDS.find((c) => {
    const regex = new RegExp(`\\b${c.word}\\b`, "i");
    return regex.test(qLower);
  });

  if (!matchedComp) {
    return { isMissing: false };
  }

  // Check if the question already has an explicit "than after" or "vs" comparison clause
  const hasExplicitSecondCondition =
    qLower.includes("than after") ||
    qLower.includes("than following") ||
    qLower.includes("compared with") ||
    qLower.includes("compared to") ||
    qLower.includes(" vs ") ||
    qLower.includes(" vs. ") ||
    qLower.includes("versus") ||
    (qLower.includes("consecutive") && qLower.includes("single"));

  if (hasExplicitSecondCondition && canonical.experimentType === "comparison") {
    return { isMissing: false };
  }

  // Single condition question using comparative language:
  // e.g. "Does BANK NIFTY produce higher returns after a 2% decline?"
  return {
    isMissing: true,
    comparativePhrase: matchedComp.word,
    explanation: `Your question asks whether returns are '${matchedComp.word}', but ${matchedComp.word} than what? A comparison baseline is required.`,
  };
}

/**
 * Available comparison baseline options for the user to resolve baseline ambiguity.
 */
export const COMPARISON_BASELINE_OPTIONS: ComparisonBaselineOption[] = [
  {
    id: "normal_days",
    label: "Compare against normal trading days",
    description: "Evaluates returns after the decline against the index's unconditional baseline returns across all trading days.",
  },
  {
    id: "non_trigger_days",
    label: "Compare against days without the trigger condition",
    description: "Compares post-event returns specifically against sessions where the qualifying decline did not occur.",
  },
  {
    id: "another_condition",
    label: "Define another condition",
    description: "Compare against another distinct market pattern (e.g. two consecutive down days vs a single decline).",
  },
  {
    id: "absolute_return",
    label: "Measure absolute return instead",
    description: "Removes comparative benchmarking and measures standalone absolute return and win rate.",
  },
];

/**
 * Applies the user's chosen baseline selection to update the CanonicalExperiment specification.
 */
export function applyBaselineSelection(
  canonical: CanonicalExperiment,
  selection: ComparisonBaselineOptionId
): Partial<CanonicalExperiment> {
  const threshold = canonical.threshold ?? canonical.conditionThreshold ?? 2.0;

  if (selection === "normal_days") {
    const branchA: ComparisonBranch = {
      id: "A",
      name: `Daily decline ≥ ${threshold}%`,
      condition: {
        type: "daily_decline",
        threshold,
        description: `Daily decline ≥ ${threshold}%`,
      },
    };
    const branchB: ComparisonBranch = {
      id: "B",
      name: "Normal trading days (Benchmark)",
      condition: {
        type: "daily_gain", // threshold 0 evaluates all market days baseline
        threshold: 0.0,
        description: "All trading days (market baseline)",
      },
    };

    return {
      experimentType: "comparison",
      comparisons: [branchA, branchB],
      baselineType: "normal_days",
      baselineDescription: "Normal trading days (unconditional market baseline)",
      comparisonMetric: canonical.comparisonMetric || "average return",
      comparisonDirection: "higher",
      hypothesis: generateHypothesis({
        instrument: canonical.instrument,
        threshold,
        conditionThreshold: threshold,
        holdingPeriod: canonical.holdingPeriod,
        experimentType: "comparison",
        comparisons: [branchA, branchB],
        comparisonMetric: "average return",
      }),
    };
  }

  if (selection === "non_trigger_days") {
    const branchA: ComparisonBranch = {
      id: "A",
      name: `Daily decline ≥ ${threshold}%`,
      condition: {
        type: "daily_decline",
        threshold,
        description: `Daily decline ≥ ${threshold}%`,
      },
    };
    const branchB: ComparisonBranch = {
      id: "B",
      name: `Days without trigger (< ${threshold}% decline)`,
      condition: {
        type: "daily_gain",
        threshold: -threshold, // non-trigger days
        description: `Non-trigger sessions (< ${threshold}% decline)`,
      },
    };

    return {
      experimentType: "comparison",
      comparisons: [branchA, branchB],
      baselineType: "non_trigger_days",
      baselineDescription: `Days without trigger (< ${threshold}% decline)`,
      comparisonMetric: canonical.comparisonMetric || "average return",
      comparisonDirection: "higher",
      hypothesis: generateHypothesis({
        instrument: canonical.instrument,
        threshold,
        conditionThreshold: threshold,
        holdingPeriod: canonical.holdingPeriod,
        experimentType: "comparison",
        comparisons: [branchA, branchB],
        comparisonMetric: "average return",
      }),
    };
  }

  if (selection === "another_condition") {
    const branchA: ComparisonBranch = {
      id: "A",
      name: `Two consecutive down days`,
      condition: {
        type: "consecutive_down",
        threshold,
        consecutiveDays: 2,
        description: `Two consecutive down days (≥${threshold}%)`,
      },
    };
    const branchB: ComparisonBranch = {
      id: "B",
      name: `Single down day`,
      condition: {
        type: "daily_decline",
        threshold,
        description: `Single down day (≥${threshold}%)`,
      },
    };

    return {
      experimentType: "comparison",
      comparisons: [branchA, branchB],
      baselineType: "another_condition",
      baselineDescription: "Two consecutive down days vs single down day",
      comparisonMetric: canonical.comparisonMetric || "average return",
      comparisonDirection: "better",
      hypothesis: generateHypothesis({
        instrument: canonical.instrument,
        threshold,
        conditionThreshold: threshold,
        holdingPeriod: canonical.holdingPeriod,
        experimentType: "comparison",
        comparisons: [branchA, branchB],
        comparisonMetric: "average return",
      }),
    };
  }

  // absolute_return: remove comparison requirement
  return {
    experimentType: "single",
    comparisons: undefined,
    baselineType: "absolute_return",
    baselineDescription: "Absolute return (no comparison baseline)",
    hypothesis: generateHypothesis({
      instrument: canonical.instrument,
      threshold,
      conditionThreshold: threshold,
      holdingPeriod: canonical.holdingPeriod,
      experimentType: "single",
    }),
  };
}

/**
 * Main evaluation entry point: inspects the experiment specification across 15 criteria.
 */
export function evaluateResearchIntegrity(
  canonical: CanonicalExperiment,
  question?: string
): ResearchIntegrityResult {
  const checks: IntegrityCheckItem[] = [];
  const blockingReasons: string[] = [];
  const warningReasons: string[] = [];

  const rawQuestion = question || canonical.originalQuestion || "";
  const threshold = canonical.threshold ?? canonical.conditionThreshold ?? 2.0;
  const holding = canonical.holdingPeriod;
  const friction = canonical.friction ?? 0.001;
  const frictionPct = (friction * 100).toFixed(2);
  const lookback = canonical.lookbackPeriod;
  const instrument = canonical.instrument?.toUpperCase() || "";

  // 1. Instrument defined?
  const instClean = instrument.replace(/\s+/g, " ").trim();
  const isSupportedInstrument = SUPPORTED_INSTRUMENTS.some(
    (si) => si === instClean || instClean.includes(si)
  );

  if (!instrument || instrument.trim().length === 0) {
    checks.push({
      id: "check_instrument",
      name: "Instrument",
      category: "specification",
      status: "block",
      currentValue: "Not defined",
      message: "An index or market instrument must be specified to run an empirical test.",
      whyItMatters: "Different instruments possess distinct volatility, liquidity, and distribution characteristics.",
    });
    blockingReasons.push("Instrument is not defined.");
  } else if (!isSupportedInstrument) {
    checks.push({
      id: "check_instrument",
      name: "Instrument",
      category: "dataset",
      status: "warn",
      currentValue: canonical.instrument,
      message: `Prototype dataset supports NIFTY and BANK NIFTY. Testing '${canonical.instrument}' will map to simulated NIFTY dynamics.`,
      whyItMatters: "Simulated research requires a representative underlying asset.",
    });
    warningReasons.push(`Instrument '${canonical.instrument}' maps to proxy index model.`);
  } else {
    checks.push({
      id: "check_instrument",
      name: "Instrument",
      category: "specification",
      status: "pass",
      currentValue: canonical.instrument,
      message: `${canonical.instrument} is supported and mapped to simulated daily market data.`,
      whyItMatters: "Explicit instrument anchors all price calculations to a specific asset.",
    });
  }

  // 2. Timeframe defined?
  if (!canonical.timeframe) {
    checks.push({
      id: "check_timeframe",
      name: "Timeframe",
      category: "specification",
      status: "warn",
      currentValue: "Daily (default)",
      message: "Timeframe was not explicitly stated; defaulted to Daily bar resolution.",
      whyItMatters: "Intraday and daily timeframes exhibit fundamentally different noise and gap characteristics.",
    });
    warningReasons.push("Timeframe defaulted to daily.");
  } else {
    checks.push({
      id: "check_timeframe",
      name: "Timeframe",
      category: "specification",
      status: "pass",
      currentValue: `${canonical.timeframe.toUpperCase()} bars`,
      message: "Daily bar resolution is active.",
      whyItMatters: "Ensures trade calculations occur on standardized session intervals.",
    });
  }

  // 3. Entry condition defined?
  if (threshold === undefined || isNaN(threshold) || threshold <= 0) {
    checks.push({
      id: "check_entry_condition",
      name: "Entry condition",
      category: "specification",
      status: "block",
      currentValue: `${threshold}%`,
      message: "Qualifying decline threshold must be greater than 0%.",
      whyItMatters: "A 0% or negative threshold cannot define a meaningful decline event.",
    });
    blockingReasons.push("Decline threshold must be positive.");
  } else if (canonical.experimentType === "comparison" && canonical.comparisons && canonical.comparisons.length >= 2) {
    const branchA = canonical.comparisons[0];
    const branchB = canonical.comparisons[1];
    checks.push({
      id: "check_entry_condition",
      name: "Comparison Conditions",
      category: "specification",
      status: "pass",
      currentValue: `${branchA.name} vs. ${branchB.name}`,
      message: `Condition A (${branchA.name}) and Condition B (${branchB.name}) are distinctly specified with shared holding (${holding}d) and friction (${frictionPct}%).`,
      whyItMatters: "Comparison experiments evaluate relative edge between two distinct market conditions.",
    });
  } else {
    checks.push({
      id: "check_entry_condition",
      name: "Entry condition",
      category: "specification",
      status: "pass",
      currentValue: `Daily decline ≥ ${threshold}%`,
      message: `Trigger isolates days with a daily decline of at least ${threshold}%.`,
      whyItMatters: "Defines the exact mathematical boundary for signal qualification.",
    });
  }

  // 4. Entry timing defined? (Look-ahead bias check)
  if (canonical.entryRule === "same_close") {
    checks.push({
      id: "check_entry_timing",
      name: "Entry timing",
      category: "validity",
      status: "warn",
      currentValue: "Same trading day's close",
      message: "Entering at same day's close introduces look-ahead risk because closing price is needed to confirm the drop.",
      whyItMatters: "In live markets, you cannot execute at the close after observing the close without slippage or look-ahead bias.",
    });
    warningReasons.push("Same-day close execution carries potential look-ahead bias.");
  } else {
    checks.push({
      id: "check_entry_timing",
      name: "Entry timing",
      category: "validity",
      status: "pass",
      currentValue: "Next trading day's open",
      message: "Executes on next session's open. Prevents look-ahead bias.",
      whyItMatters: "The trigger is determined from day t close, so entering on t+1 open ensures realistic execution.",
    });
  }

  // 5. Exit condition defined?
  if (!canonical.exitRule) {
    checks.push({
      id: "check_exit_rule",
      name: "Exit rule",
      category: "specification",
      status: "warn",
      currentValue: "Holding period exit (default)",
      message: "Defaulted to fixed holding period exit.",
      whyItMatters: "Exit rules govern trade lifecycle and risk exposure.",
    });
    warningReasons.push("Exit rule defaulted to time-based exit.");
  } else {
    checks.push({
      id: "check_exit_rule",
      name: "Exit rule",
      category: "specification",
      status: "pass",
      currentValue:
        canonical.exitRule === "stop_loss"
          ? "Stop loss (2% risk cap)"
          : canonical.exitRule === "profit_target"
          ? "Profit target (3% target)"
          : `Close after ${holding} trading days`,
      message: "Clear deterministic exit rule defined.",
      whyItMatters: "Removes ambiguity about when capital is released.",
    });
  }

  // 6. Holding period defined?
  if (!holding || typeof holding !== "number" || holding <= 0) {
    checks.push({
      id: "check_holding_period",
      name: "Holding period",
      category: "specification",
      status: "block",
      currentValue: `${holding ?? 0} days`,
      message: "Holding period must be an integer of at least 1 trading day.",
      whyItMatters: "Zero or negative holding period is logically impossible to simulate.",
    });
    blockingReasons.push("Holding period must be at least 1 day.");
  } else if (holding > 60) {
    checks.push({
      id: "check_holding_period",
      name: "Holding period",
      category: "specification",
      status: "warn",
      currentValue: `${holding} trading days`,
      message: `Holding horizon of ${holding} days is unusually long for short-term rebound evaluation.`,
      whyItMatters: "Very long holding horizons blend mean-reversion signals with macroeconomic trend drift.",
    });
    warningReasons.push("Extended holding period may dilute mean-reversion signal.");
  } else {
    checks.push({
      id: "check_holding_period",
      name: "Holding period",
      category: "specification",
      status: "pass",
      currentValue: `${holding} trading days`,
      message: `Positions are evaluated over ${holding} trading sessions.`,
      whyItMatters: "Establishes the exact observation window for post-event returns.",
    });
  }

  // 7. Test period defined?
  if (!lookback || lookback <= 0) {
    checks.push({
      id: "check_test_period",
      name: "Test period",
      category: "specification",
      status: "block",
      currentValue: "Invalid",
      message: "Lookback window must be at least 1 year.",
      whyItMatters: "Sufficient historical depth is needed to observe multiple market cycles.",
    });
    blockingReasons.push("Test lookback period must be at least 1 year.");
  } else {
    checks.push({
      id: "check_test_period",
      name: "Test period",
      category: "specification",
      status: "pass",
      currentValue: `Last ${lookback} years (${2025 - lookback}–2025)`,
      message: `Sample evaluates ${lookback} years of daily sessions.`,
      whyItMatters: "Provides sample breadth across differing market regimes.",
    });
  }

  // 8. Transaction costs defined?
  if (friction === undefined || isNaN(friction) || friction < 0) {
    checks.push({
      id: "check_costs",
      name: "Transaction costs",
      category: "validity",
      status: "block",
      currentValue: "Undefined",
      message: "Transaction costs must be defined (0.0% or positive).",
      whyItMatters: "Zero-cost assumptions can produce deceptive gross profit illusions.",
    });
    blockingReasons.push("Transaction costs must be defined.");
  } else if (friction === 0) {
    checks.push({
      id: "check_costs",
      name: "Transaction costs",
      category: "validity",
      status: "warn",
      currentValue: "0.00% (Zero friction)",
      message: "Testing with 0% friction ignores real-world brokerage, exchange turnover fees, and slippage.",
      whyItMatters: "Friction often erodes thin statistical edges in high-turnover strategies.",
    });
    warningReasons.push("Zero transaction cost assumption creates theoretical gross results.");
  } else {
    checks.push({
      id: "check_costs",
      name: "Transaction costs",
      category: "validity",
      status: "pass",
      currentValue: `${frictionPct}% round trip`,
      message: `${frictionPct}% round trip friction deducted from each trade.`,
      whyItMatters: "Reflects retail friction and bid-ask slippage.",
    });
  }

  // 9. Primary metric defined?
  const primaryMetric = canonical.comparisonMetric || "Average return";
  checks.push({
    id: "check_primary_metric",
    name: "Primary metric",
    category: "specification",
    status: "pass",
    currentValue: primaryMetric,
    message: `Evaluation focuses on ${primaryMetric.toLowerCase()} across qualifying trades.`,
    whyItMatters: "A clear target metric is essential to determine whether the hypothesis succeeded.",
  });

  // 10. Comparison baseline defined when the question requires comparison? (CRITICAL!)
  const baselineCheck = detectMissingComparisonBaseline(rawQuestion, canonical);
  let missingBaseline = false;
  let baselineExplanation: string | undefined = undefined;

  if (baselineCheck.isMissing) {
    missingBaseline = true;
    baselineExplanation = baselineCheck.explanation;
    checks.push({
      id: "check_comparison_baseline",
      name: "Comparison baseline",
      category: "baseline",
      status: "warn",
      currentValue: "Not specified",
      message: baselineCheck.explanation || "Your question asks whether returns are higher, but higher than what?",
      whyItMatters: "Evaluating whether performance is 'better' or 'higher' requires an explicit benchmark condition.",
    });
    warningReasons.push("Comparison baseline is missing for comparative question.");
  } else if (canonical.experimentType === "comparison" && canonical.comparisons && canonical.comparisons.length >= 2) {
    const baselineLabel = canonical.comparisons[1].name;
    checks.push({
      id: "check_comparison_baseline",
      name: "Comparison baseline",
      category: "baseline",
      status: "pass",
      currentValue: `Condition B: ${baselineLabel}`,
      message: `Comparison baseline explicitly established: Condition B (${baselineLabel}).`,
      whyItMatters: "Condition B provides the authoritative reference benchmark to test relative edge.",
    });
  } else {
    checks.push({
      id: "check_comparison_baseline",
      name: "Comparison baseline",
      category: "baseline",
      status: "pass",
      currentValue: "Absolute return evaluation",
      message: "Non-comparative query: standalone return and win rate will be evaluated.",
      whyItMatters: "No baseline required when evaluating absolute expectancy.",
    });
  }

  // 11. Look-ahead bias risk?
  if (canonical.entryRule === "next_open") {
    checks.push({
      id: "check_lookahead",
      name: "Look-ahead bias risk",
      category: "validity",
      status: "pass",
      currentValue: "None detected (Clean t+1 execution)",
      message: "Condition evaluated at t close, order placed at t+1 open.",
      whyItMatters: "Ensures the information was fully available prior to trade placement.",
    });
  } else {
    checks.push({
      id: "check_lookahead",
      name: "Look-ahead bias risk",
      category: "validity",
      status: "warn",
      currentValue: "Elevated (Same-day close execution)",
      message: "Entering on same day close requires anticipating the closing print.",
      whyItMatters: "Can lead to inflated backtest results that cannot be executed in real trading.",
    });
  }

  // 12. Contradictory parameters?
  const hasContradictory =
    holding <= 0 ||
    threshold <= 0 ||
    (canonical.experimentType === "comparison" &&
      canonical.comparisons &&
      canonical.comparisons[0]?.name === canonical.comparisons[1]?.name &&
      canonical.comparisons[0]?.condition.threshold === canonical.comparisons[1]?.condition.threshold);

  if (hasContradictory) {
    checks.push({
      id: "check_contradictions",
      name: "Contradictory parameters",
      category: "validity",
      status: "block",
      currentValue: "Contradiction detected",
      message: "Parameters contain contradictory rules (e.g. identical comparison branches or non-positive holding).",
      whyItMatters: "Contradictory parameters invalidate statistical calculations.",
    });
    blockingReasons.push("Contradictory parameter specification detected.");
  } else {
    checks.push({
      id: "check_contradictions",
      name: "Contradictory parameters",
      category: "validity",
      status: "pass",
      currentValue: "None detected",
      message: "All parameters are logically mutually consistent.",
      whyItMatters: "Ensures the experiment represents a feasible trading system.",
    });
  }

  // 13. Missing information?
  const isMissingCore = !canonical.instrument || !threshold || !holding;
  if (isMissingCore) {
    checks.push({
      id: "check_missing_info",
      name: "Missing information",
      category: "specification",
      status: "block",
      currentValue: "Core fields missing",
      message: "One or more core parameters (instrument, threshold, holding) are missing.",
      whyItMatters: "Deterministic engine cannot run with missing parameters.",
    });
    blockingReasons.push("Critical parameters missing.");
  } else {
    checks.push({
      id: "check_missing_info",
      name: "Missing information",
      category: "specification",
      status: "pass",
      currentValue: "Complete",
      message: "All essential parameters are fully populated.",
      whyItMatters: "Allows end-to-end reproducible simulation.",
    });
  }

  // 14. Question-to-experiment mismatch?
  const qLower = rawQuestion.toLowerCase();
  let mismatchDetected = false;
  let mismatchMsg = "";

  if (qLower.includes("bank nifty") && canonical.instrument.toUpperCase() === "NIFTY") {
    mismatchDetected = true;
    mismatchMsg = "Question specified BANK NIFTY, but experiment instrument is configured as NIFTY.";
  } else if (!qLower.includes("bank nifty") && qLower.includes("nifty") && canonical.instrument.toUpperCase().includes("BANK")) {
    mismatchDetected = true;
    mismatchMsg = "Question specified NIFTY, but experiment instrument is configured as BANK NIFTY.";
  }

  if (mismatchDetected) {
    checks.push({
      id: "check_mismatch",
      name: "Question-to-experiment match",
      category: "validity",
      status: "block",
      currentValue: "Mismatch detected",
      message: mismatchMsg,
      whyItMatters: "The experiment must test the exact asset queried by the researcher.",
    });
    blockingReasons.push(mismatchMsg);
  } else {
    checks.push({
      id: "check_mismatch",
      name: "Question-to-experiment match",
      category: "validity",
      status: "pass",
      currentValue: "Aligned",
      message: "Parameters faithfully reflect the researcher's query.",
      whyItMatters: "Protects researcher intent from accidental substitution.",
    });
  }

  // 15. Whether the available dataset can actually support the requested experiment?
  if (isSupportedInstrument && (lookback >= 1 && lookback <= 30)) {
    checks.push({
      id: "check_dataset_support",
      name: "Dataset capability",
      category: "dataset",
      status: "pass",
      currentValue: `Supported (${instClean} daily synthetic model)`,
      message: "The dataset provides continuous OHLCV daily data to compute all required bars.",
      whyItMatters: "Simulating trades requires complete continuous price history.",
    });
  } else {
    checks.push({
      id: "check_dataset_support",
      name: "Dataset capability",
      category: "dataset",
      status: "warn",
      currentValue: "Limited support",
      message: "Requested asset or duration exceeds native dataset bounds; proxy modeling will be applied.",
      whyItMatters: "Results on unsupported datasets cannot be relied upon.",
    });
    warningReasons.push("Dataset support limitations apply.");
  }

  // Final status classification
  let status: IntegrityStatus = "READY";
  if (blockingReasons.length > 0) {
    status = "BLOCKED";
  } else if (warningReasons.length > 0 || missingBaseline) {
    status = "NEEDS_REVIEW";
  }

  const passedCount = checks.filter((c) => c.status === "pass").length;
  const warnedCount = checks.filter((c) => c.status === "warn").length;
  const blockedCount = checks.filter((c) => c.status === "block").length;

  return {
    status,
    canProceed: status !== "BLOCKED",
    score: {
      passed: passedCount,
      warnings: warnedCount,
      blocked: blockedCount,
      total: checks.length,
    },
    checks,
    missingComparisonBaseline: missingBaseline,
    comparisonBaselineExplanation: baselineExplanation,
    comparisonBaselineOptions: COMPARISON_BASELINE_OPTIONS,
    blockingReasons,
    warningReasons,
  };
}
