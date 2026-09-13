import { GoogleGenAI } from "@google/genai";
import { SYSTEM_ANALYZE_PROMPT, SYSTEM_LEARN_PROMPT } from "./prompts";
import { AnalysisResult, ClarificationQuestion, ProposedAssumption, InterpretationResult } from "@/types/research";
import { ExperimentData, ComparisonBranch, generateHypothesis } from "@/types/experiment";
import { validateQuestionScope } from "@/lib/research/integrity";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Comprehensive natural-language markers indicating comparative intent (A vs B).
 */
export const COMPARISON_MARKERS = [
  "compared with",
  "compared to",
  "better after",
  "better than",
  "worse after",
  "worse than",
  "faster after",
  "faster than",
  "slower after",
  "slower than",
  "than after",
  " vs ",
  " vs. ",
  "versus",
  "relative to",
  "more effective than",
  "outperform",
  "outperforms",
  "difference between",
  "which performs better",
  "which recovers faster",
  "perform better",
  "performs better",
  "recover faster",
  "recovers faster",
  "recover better",
  "recovers better",
];

/**
 * Returns true if the query indicates a comparative research intent.
 */
export function isComparisonQuestion(question: string): boolean {
  const qLower = question.toLowerCase();
  return COMPARISON_MARKERS.some((m) => qLower.includes(m));
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
 * Dynamically detects whether a user's question is asking a comparative research question (A vs B).
 */
export function detectComparisonBranches(
  question: string,
  threshold: number
): {
  isComparison: boolean;
  comparisonMetric?: string;
  comparisonDirection?: string;
  comparisons?: [ComparisonBranch, ComparisonBranch];
} {
  const qLower = question.toLowerCase();

  const marker = COMPARISON_MARKERS.find((m) => qLower.includes(m));
  if (!marker) {
    return { isComparison: false };
  }

  // Accurately determine comparison metric and direction from natural language
  const { metric: comparisonMetric, direction: comparisonDirection } = detectComparisonMetric(question);

  // 1. Check for consecutive days / repeated weakness in either part
  const consecutiveRegex = /\b(?:two|three|four|2|3|4)?\s*(?:consecutive\s*(?:down\s+|declining\s+|negative\s+)?(?:days?|declines?|drops?)|repeated\s*(?:market\s*)?weakness)\b/i;
  const hasConsecutiveDays =
    consecutiveRegex.test(qLower) ||
    qLower.includes("consecutive") ||
    qLower.includes("days of decline") ||
    qLower.includes("down days") ||
    qLower.includes("repeated market weakness");

  // 2. Check for single day / single decline / single drop
  const singleRegex = /\b(?:single|one|1)\s*(?:-|\s+)?(?:\d+(?:\.\d+)?%?\s+)?(?:down\s+|declining\s+|negative\s+|large\s+)?(?:day|decline|drop)\b/i;
  const hasSingleDay =
    singleRegex.test(qLower) ||
    qLower.includes("single-day") ||
    qLower.includes("single day") ||
    qLower.includes("one-day") ||
    qLower.includes("one day") ||
    qLower.includes("single decline") ||
    qLower.includes("one large decline") ||
    qLower.includes("single drop") ||
    (qLower.includes("single") && (qLower.includes("decline") || qLower.includes("drop") || qLower.includes("down")));

  // Determine consecutive count
  let consecutiveCount = 2;
  if (qLower.includes("three") || qLower.includes("3 consecutive") || qLower.includes("3-day") || qLower.includes("3 declines")) {
    consecutiveCount = 3;
  } else if (qLower.includes("four") || qLower.includes("4 consecutive")) {
    consecutiveCount = 4;
  } else if (qLower.includes("two") || qLower.includes("2 consecutive") || qLower.includes("2-day") || qLower.includes("2 declines")) {
    consecutiveCount = 2;
  }

  if (hasConsecutiveDays && hasSingleDay) {
    let nameA = `${consecutiveCount === 2 ? "two" : consecutiveCount} consecutive down days`;
    let descA = `${consecutiveCount === 2 ? "Two" : consecutiveCount} consecutive down days`;
    let condTypeA: "consecutive_down" | "daily_decline" = "consecutive_down";

    if (qLower.includes("repeated market weakness") || qLower.includes("repeated weakness")) {
      nameA = "repeated market weakness";
      descA = "Repeated market weakness (consecutive declining closes)";
    } else if (
      qLower.includes("consecutive declining day") ||
      qLower.includes("consecutive declining days") ||
      qLower.includes("consecutive days of decline")
    ) {
      nameA = `${consecutiveCount === 2 ? "two" : consecutiveCount} consecutive declining days`;
      descA = `${consecutiveCount === 2 ? "Two" : consecutiveCount} consecutive declining days`;
    } else if (qLower.includes("consecutive decline") || qLower.includes("consecutive declines")) {
      nameA = `${consecutiveCount === 2 ? "two" : consecutiveCount} consecutive declines`;
      descA = `${consecutiveCount === 2 ? "Two" : consecutiveCount} consecutive declines`;
    }

    let nameB = "single down day";
    let descB = "Single down day";
    let thresholdB = threshold;

    const singlePctMatch = qLower.match(
      /\b(?:single|one)\s*(?:daily\s*)?(\d+(?:\.\d+)?%?)\s*(?:decline|drop|fall|down day|day)\b/i
    );
    if (singlePctMatch) {
      const pct = singlePctMatch[1].endsWith("%") ? singlePctMatch[1] : `${singlePctMatch[1]}%`;
      nameB = `single ${pct} decline`;
      descB = `Single daily decline >= ${pct}`;
      thresholdB = parseFloat(singlePctMatch[1]);
    } else if (qLower.includes("one large decline")) {
      nameB = "one large decline";
      descB = "One large decline";
    } else if (qLower.includes("single-day decline") || qLower.includes("single day decline")) {
      nameB = "single-day decline";
      descB = "Single-day decline";
    } else if (qLower.includes("single decline") || qLower.includes("single daily decline")) {
      nameB = "single decline";
      descB = "Single decline";
    } else if (qLower.includes("single-day") || qLower.includes("single day")) {
      nameB = qLower.includes("down day") ? "single down day" : "single-day decline";
      descB = qLower.includes("down day") ? "Single down day" : "Single-day decline";
    }

    const branchA: ComparisonBranch = {
      id: "A",
      name: nameA,
      condition: {
        type: condTypeA,
        threshold,
        consecutiveDays: consecutiveCount,
        consecutiveBars: consecutiveCount,
        description: descA,
      },
    };

    const branchB: ComparisonBranch = {
      id: "B",
      name: nameB,
      condition: {
        type: "daily_decline",
        threshold: thresholdB,
        description: descB,
      },
    };

    return { isComparison: true, comparisonMetric, comparisonDirection, comparisons: [branchA, branchB] };
  }

  // Check gap-down vs daily decline
  if (
    (qLower.includes("gap") || qLower.includes("gap-down")) &&
    (qLower.includes("daily") || qLower.includes("fall") || qLower.includes("decline"))
  ) {
    const branchA: ComparisonBranch = {
      id: "A",
      name: "opening gap-down",
      condition: {
        type: "gap_down",
        threshold,
        description: "Opening gap-down",
      },
    };
    const branchB: ComparisonBranch = {
      id: "B",
      name: "single-day decline",
      condition: {
        type: "daily_decline",
        threshold,
        description: "Single-day decline",
      },
    };
    return { isComparison: true, comparisonMetric, comparisonDirection, comparisons: [branchA, branchB] };
  }

  // Generic comparative extraction around marker
  const delimiters = ["than after", "than following", " vs ", " vs. ", "versus", "compared with", "compared to", "relative to"];
  const chosenMarker = delimiters.find((d) => qLower.includes(d)) || marker;
  const markerIdx = qLower.indexOf(chosenMarker);
  const leftPart = question.substring(0, markerIdx).trim();
  const rightPart = question.substring(markerIdx + chosenMarker.length).trim();

  let nameA = leftPart;
  const afterIdx = nameA.toLowerCase().lastIndexOf("after ");
  if (afterIdx !== -1) {
    nameA = nameA.substring(afterIdx + 6).trim();
  } else {
    // Strip leading query phrases e.g. "does buying after ", "does NIFTY recover faster after "
    nameA = nameA.replace(/^(?:does\s+\w+\s+recover\s+faster\s+(?:after\s+)?|does\s+buying\s+after\s+|is\s+\w+'s\s+[\w-]+\s+return\s+better\s+after\s+|which\s+performs\s+better\s+(?:after\s+)?)/i, "").trim();
  }

  let nameB = rightPart.replace(/\?.*$/, "").trim();
  if (nameB.toLowerCase().startsWith("after ")) {
    nameB = nameB.substring(6).trim();
  } else if (nameB.toLowerCase().startsWith("buying after ")) {
    nameB = nameB.substring(13).trim();
  }
  if (nameB.toLowerCase().startsWith("a ")) {
    nameB = nameB.substring(2).trim();
  }

  const branchA: ComparisonBranch = {
    id: "A",
    name: nameA || "Condition A",
    condition: {
      type: nameA.toLowerCase().includes("consecutive") ? "consecutive_down" : "daily_decline",
      threshold,
      consecutiveDays: consecutiveCount,
      description: nameA || "Condition A",
    },
  };

  const branchB: ComparisonBranch = {
    id: "B",
    name: nameB || "Condition B",
    condition: {
      type: "daily_decline",
      threshold,
      description: nameB || "Condition B",
    },
  };

  return { isComparison: true, comparisonMetric, comparisonDirection, comparisons: [branchA, branchB] };
}

/**
 * Ambiguous qualitative expressions that require explicit quantitative definition.
 */
export const AMBIGUOUS_DECLINE_PHRASES = [
  "sharp fall",
  "sharp drop",
  "sharp decline",
  "significant decline",
  "significant fall",
  "significant drop",
  "big drop",
  "big fall",
  "big decline",
  "major selloff",
  "major sell-off",
  "major drop",
  "major decline",
  "steep decline",
  "steep drop",
  "steep fall",
  "large drop",
  "large fall",
  "large decline",
  "huge drop",
  "huge fall",
  "crash",
];

/**
 * Extracts quantitative drop/decline threshold from user question.
 * Examples:
 * - "falling 3% or more" -> threshold = 3%
 * - "drops at least 2%" -> threshold = 2%
 * - "declines by 1.5%" -> threshold = 1.5%
 * - "down 4 percent" -> threshold = 4%
 */
export function extractQuantitativeThreshold(question: string): {
  hasExplicitThreshold: boolean;
  threshold?: number;
} {
  const qLower = question.toLowerCase();

  // Pattern 1: Action verb followed by percentage e.g. "falling 3%", "drops at least 2%", "declines by 1.5%", "down 4 percent"
  const actionWithPctRegex =
    /(?:falling|falls|drop|drops|dropped|decline|declines|declined|down|dip|dips|dipped|slump|slumps|selloff|sell-off|loss|losses)\s*(?:by|of|at\s*least|more\s*than|over|>=|>)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent\b|pct\b)/i;
  const actionMatch = qLower.match(actionWithPctRegex);
  if (actionMatch) {
    const val = parseFloat(actionMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { hasExplicitThreshold: true, threshold: val };
    }
  }

  // Pattern 2: Comparative bounds with percentage e.g. "at least 3%", ">= 2.5%", "more than 2%"
  const boundWithPctRegex =
    /(?:at\s*least|more\s*than|greater\s*than|over|>=|>)\s*(\d+(?:\.\d+)?)\s*(?:%|percent\b|pct\b)/i;
  const boundMatch = qLower.match(boundWithPctRegex);
  if (boundMatch) {
    const val = parseFloat(boundMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { hasExplicitThreshold: true, threshold: val };
    }
  }

  // Pattern 3: Any explicit percentage in the text e.g. "3%", "2.5 percent", "3 %"
  const anyPctRegex = /(\d+(?:\.\d+)?)\s*(?:%|percent\b|pct\b)/i;
  const anyMatch = qLower.match(anyPctRegex);
  if (anyMatch) {
    const val = parseFloat(anyMatch[1]);
    if (!isNaN(val) && val > 0) {
      return { hasExplicitThreshold: true, threshold: val };
    }
  }

  // Pattern 4: Action verb with number followed by "or more" / "in a single" e.g. "falls 3 or more"
  const actionWithoutPctRegex =
    /(?:falling|falls|drop|drops|dropped|decline|declines|declined|down)\s*(?:by|of|at\s*least|more\s*than|over)?\s*(\d+(?:\.\d+)?)\s*(?:or\s*more|in\s*a\s*single|in\s*one)/i;
  const actionNoPctMatch = qLower.match(actionWithoutPctRegex);
  if (actionNoPctMatch) {
    const val = parseFloat(actionNoPctMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 50) {
      return { hasExplicitThreshold: true, threshold: val };
    }
  }

  return { hasExplicitThreshold: false };
}

/**
 * Detects if the question actually contains an ambiguous qualitative expression.
 * Returns the matched phrase or null.
 */
export function detectAmbiguousDeclinePhrase(question: string): string | null {
  const qLower = question.toLowerCase();

  // Pattern matching qualitative decline modifiers e.g. "large one-day declines", "big drops", "sharp falls"
  const qualitativeRegex =
    /\b(sharp|significant|big|major|steep|large|huge)\s+(?:(?:one-day|single-day|daily)\s+)?(declines?|drops?|falls?|sell-?offs?|losses?)\b/i;
  const match = qLower.match(qualitativeRegex);
  if (match) {
    const adj = match[1].toLowerCase();
    const noun = match[2].toLowerCase().replace(/s$/, "");
    return `${adj} ${noun}`;
  }

  for (const phrase of AMBIGUOUS_DECLINE_PHRASES) {
    if (qLower.includes(phrase)) {
      return phrase;
    }
  }
  return null;
}

/**
 * Detects if an explicit holding duration was specified in the question (e.g. "held for 5 days").
 * Ignores single day references in entry conditions (e.g. "in a single trading day").
 */
export function detectHoldingDuration(question: string): number | null {
  const qLower = question.toLowerCase();
  // Strip out entry condition single day references first
  const sanitized = qLower.replace(/(?:in\s*a\s*single\s*(?:trading\s*)?day|in\s*one\s*(?:trading\s*)?day|single-day|one-day)/gi, "");
  const daysMatch = sanitized.match(/(\d+)\s*(?:trading\s*days|days|day\b)/i);
  if (daysMatch) {
    const d = parseInt(daysMatch[1], 10);
    if (!isNaN(d) && d > 0 && d <= 250) {
      return d;
    }
  }
  return null;
}

/**
 * Extracts contextual / filter conditions from natural-language queries.
 * Examples:
 * - "when the market was already weak during the previous five trading days" -> prior_period_weakness (period: 5)
 * - "when the market was already trending downward" -> downward_trend
 * - "after unusually high volatility" -> high_volatility
 * - "when volume was above average" -> above_average_volume
 * - "after two consecutive declines" -> consecutive_declines (period: 2)
 */
export function extractContextConditions(question: string): import("@/types/experiment").ContextCondition[] {
  const qLower = question.toLowerCase();
  const conditions: import("@/types/experiment").ContextCondition[] = [];

  // 1. Prior period weakness:
  // e.g. "when the market was already weak during the previous five trading days",
  // "when the market was weak over the past 5 days", "after prior 5-day weakness"
  const weaknessRegex =
    /(?:when\s+(?:the\s+)?market\s+was\s+(?:already\s+)?weak\s+(?:during|over|in)\s+the\s+(?:previous|prior|past)\s+(\w+|\d+)\s+(?:trading\s+)?days|after\s+prior\s+(\w+|\d+)(?:-day|\s+day)\s+weakness|when\s+(?:the\s+)?(?:previous|prior|past)\s+(\w+|\d+)\s+days\s+were\s+weak)/i;
  const weakMatch = qLower.match(weaknessRegex);
  if (weakMatch) {
    const rawWord = (weakMatch[1] || weakMatch[2] || weakMatch[3] || "five").toLowerCase();
    const wordToNum: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
    };
    const period = !isNaN(parseInt(rawWord, 10)) ? parseInt(rawWord, 10) : wordToNum[rawWord] || 5;

    conditions.push({
      id: "ctx_weakness_prior_period",
      type: "prior_period_weakness",
      label: `Previous ${period} trading days showed market weakness`,
      period,
      rawPhrase: weakMatch[0],
      isResolved: false, // "weak" requires explicit quantitative definition
    });
  }

  // 2. Downward trend:
  if (
    qLower.includes("trending downward") ||
    qLower.includes("downtrend") ||
    qLower.includes("downward trend")
  ) {
    if (!conditions.some((c) => c.type === "prior_period_weakness")) {
      conditions.push({
        id: "ctx_downtrend",
        type: "downward_trend",
        label: "Market was already trending downward",
        rawPhrase: "when the market was already trending downward",
        isResolved: false,
      });
    }
  }

  // 3. High volatility:
  if (
    qLower.includes("unusually high volatility") ||
    qLower.includes("high volatility regime") ||
    qLower.includes("elevated volatility")
  ) {
    conditions.push({
      id: "ctx_high_vol",
      type: "high_volatility",
      label: "Unusually high volatility regime",
      rawPhrase: "after unusually high volatility",
      isResolved: false,
    });
  }

  // 4. Above average volume:
  if (
    qLower.includes("volume was above average") ||
    qLower.includes("above average volume") ||
    qLower.includes("on unusually high volume")
  ) {
    conditions.push({
      id: "ctx_high_volume",
      type: "above_average_volume",
      label: "Volume was above average",
      rawPhrase: "when volume was above average",
      isResolved: false,
    });
  }

  // 5. Consecutive declines (as a context condition):
  if (
    qLower.includes("after two consecutive declines") ||
    qLower.includes("after 2 consecutive declines") ||
    qLower.includes("after three consecutive declines")
  ) {
    const isConsecutive2 = qLower.includes("two") || qLower.includes("2");
    const count = isConsecutive2 ? 2 : 3;
    conditions.push({
      id: "ctx_consecutive_down",
      type: "consecutive_declines",
      label: `Preceded by ${count} consecutive declining days`,
      period: count,
      rawPhrase: `after ${count} consecutive declines`,
      isResolved: true,
      definition: `${count} consecutive declining closes before trigger day`,
    });
  }

  return conditions;
}

/**
 * Intelligent domain heuristic fallback when Gemini API key is not configured or network fails.
 * Guarantees that the prototype never crashes and always delivers a high-quality demo.
 */
export function analyzeQuestionFallback(question: string): AnalysisResult {
  const scopeCheck = validateQuestionScope(question);
  if (!scopeCheck.isValid) {
    throw new Error(scopeCheck.reason || "Invalid research question");
  }

  const qLower = question.toLowerCase();

  // Detect market instrument
  let instrument = "NIFTY";
  if (qLower.includes("banknifty") || qLower.includes("bank nifty")) {
    instrument = "BANK NIFTY";
  } else if (qLower.includes("spy") || qLower.includes("s&p")) {
    instrument = "S&P 500";
  } else if (qLower.includes("btc") || qLower.includes("bitcoin")) {
    instrument = "BTC/USD";
  }

  // 1. Extract quantitative threshold
  const { hasExplicitThreshold, threshold: extractedThreshold } = extractQuantitativeThreshold(question);
  let proposedThreshold = hasExplicitThreshold && extractedThreshold !== undefined ? extractedThreshold : 2.0;

  // 2. Detect ambiguous expressions
  const ambiguousPhrase = detectAmbiguousDeclinePhrase(question);

  // 3. Detect holding duration
  const explicitHoldingDays = detectHoldingDuration(question);
  let proposedHoldingDays = explicitHoldingDays ?? 5;

  // 4. Extract contextual / filter conditions
  const contextConditions = extractContextConditions(question);
  const hasUnresolvedContext = contextConditions.some((c) => !c.isResolved);

  // Detect comparison questions (A vs B)
  const compInfo = detectComparisonBranches(question, proposedThreshold);
  const isComparison = compInfo.isComparison;
  const comparisons = compInfo.comparisons;

  let conditionType: "daily_decline" | "daily_gain" | "gap_down" | "consecutive_down" | "volatility_spike" = "daily_decline";
  let detectedCondition = "Daily decline";
  let isAmbiguous = false;
  let ambiguitySummary = "";
  const missingInfo: string[] = [];

  if (isComparison && comparisons) {
    detectedCondition = `${comparisons[0].name} VS ${comparisons[1].name}`;
    isAmbiguous = true;
    const metricName = compInfo.comparisonMetric || "5-day return";
    ambiguitySummary = `The question compares "${comparisons[0].name}" against "${comparisons[1].name}". To construct a deterministic backtest, we must clarify: (1) what percentage decline defines a qualifying "down day", and (2) how ${metricName} should be evaluated across the holding horizon.`;
    if (!hasExplicitThreshold) {
      missingInfo.push("Threshold percentage for 'down day'");
    }
    if (!explicitHoldingDays) {
      missingInfo.push(`Holding horizon for '${metricName}'`);
    }
    missingInfo.push("Transaction friction");
  } else if (qLower.includes("consecutive down") || qLower.includes("down days") || qLower.includes("three down")) {
    conditionType = "consecutive_down";
    detectedCondition = "Consecutive down days";
    if (!explicitHoldingDays) {
      missingInfo.push("Holding duration");
    }
    missingInfo.push("Exit trigger", "Round-trip trading costs");
    isAmbiguous = false;
    ambiguitySummary = "Condition is defined as down days, but holding horizon and exit rules are unspecified.";
  } else if (qLower.includes("gap-down") || qLower.includes("gap down")) {
    conditionType = "gap_down";
    detectedCondition = "Opening gap-down";
    if (!hasExplicitThreshold) {
      isAmbiguous = true;
      ambiguitySummary = "The term 'gap-down' requires an exact opening drop percentage.";
      missingInfo.push("Gap threshold percentage");
    }
    if (!explicitHoldingDays) {
      missingInfo.push("Holding duration");
    }
    missingInfo.push("Exit rule", "Transaction costs");
  } else if (qLower.includes("momentum") || qLower.includes("volatility")) {
    conditionType = "volatility_spike";
    detectedCondition = "High volatility regime";
    isAmbiguous = true;
    ambiguitySummary = "Both 'momentum' and 'high volatility' require explicit quantitative definitions.";
    missingInfo.push("Volatility metric/threshold");
    if (!explicitHoldingDays) {
      missingInfo.push("Holding duration");
    }
    missingInfo.push("Exit trigger", "Transaction costs");
  } else {
    conditionType = "daily_decline";
    if (hasExplicitThreshold) {
      detectedCondition = `Daily decline >= ${proposedThreshold}%`;
      if (hasUnresolvedContext) {
        isAmbiguous = true;
        const ctx = contextConditions[0];
        ambiguitySummary = `Entry threshold is defined as ${proposedThreshold}%, but the context filter "${ctx.label}" is qualitative and requires a precise quantitative definition.`;
        missingInfo.push(`Definition of 'weak' during prior ${ctx.period ?? 5} days`);
      } else {
        isAmbiguous = false;
        ambiguitySummary = `Entry condition is explicitly defined as a daily decline >= ${proposedThreshold}%. Holding duration, exit trigger, and transaction costs must be specified to run a deterministic backtest.`;
      }
      if (!explicitHoldingDays) {
        missingInfo.push("Holding duration");
      }
      missingInfo.push("Exit trigger", "Transaction costs");
    } else if (ambiguousPhrase) {
      detectedCondition = "Daily decline";
      isAmbiguous = true;
      ambiguitySummary = `The phrase '${ambiguousPhrase}' is ambiguous. A meaningful quantitative experiment requires an exact daily drop threshold.`;
      missingInfo.push(`Drop threshold for '${ambiguousPhrase}'`);
      if (hasUnresolvedContext) {
        const ctx = contextConditions[0];
        missingInfo.push(`Definition of 'weak' during prior ${ctx.period ?? 5} days`);
      }
      if (!explicitHoldingDays) {
        missingInfo.push("Holding duration");
      }
      missingInfo.push("Exit trigger", "Transaction costs");
    } else {
      detectedCondition = "Daily decline";
      isAmbiguous = true;
      if (hasUnresolvedContext) {
        const ctx = contextConditions[0];
        ambiguitySummary = `Both the decline threshold and the context filter "${ctx.label}" require quantitative definitions.`;
        missingInfo.push("Daily decline threshold");
        missingInfo.push(`Definition of 'weak' during prior ${ctx.period ?? 5} days`);
      } else {
        ambiguitySummary = "The daily decline threshold is unstated. A backtestable experiment requires an exact percentage drop.";
        missingInfo.push("Daily decline threshold");
      }
      if (!explicitHoldingDays) {
        missingInfo.push("Holding duration");
      }
      missingInfo.push("Exit trigger", "Transaction costs");
    }
  }

  // Construct structured clarification questions
  const clarificationQuestions: ClarificationQuestion[] = [
    {
      id: "threshold_question",
      category: "threshold",
      title: isComparison
        ? (hasExplicitThreshold ? `Qualifying decline threshold (Defined as ${proposedThreshold}%)` : `What percentage decline defines a "down day"?`)
        : (hasExplicitThreshold ? `Condition threshold (Defined as ${proposedThreshold}%)` : ambiguousPhrase ? `We need to define "${ambiguousPhrase}"` : "We need to define the drop threshold"),
      prompt: isComparison
        ? `Specify the percentage drop that defines a qualifying down day for both Condition A and Condition B:`
        : (hasExplicitThreshold ? `Your question specifies a ${proposedThreshold}% daily decline. Confirm or adjust the threshold below:` : ambiguousPhrase ? `What daily drop should qualify as a "${ambiguousPhrase}"?` : "What daily drop should qualify as a qualifying condition?"),
      options: isComparison
        ? [
            { id: "t1", label: "1.0% or more daily decline", value: 1.0, isDefault: proposedThreshold === 1.0 },
            { id: "t2", label: "2.0% or more daily decline", value: 2.0, isDefault: proposedThreshold === 2.0 },
            { id: "t3", label: "3.0% or more daily decline", value: 3.0, isDefault: proposedThreshold === 3.0 },
          ]
        : [
            { id: "t1", label: "1.0% or more in one day", value: 1.0, isDefault: proposedThreshold === 1.0 },
            { id: "t2", label: "2.0% or more in one day", value: 2.0, isDefault: proposedThreshold === 2.0 },
            { id: "t3", label: "3.0% or more in one day", value: 3.0, isDefault: proposedThreshold === 3.0 },
          ],
      allowCustom: true,
      selectedOptionId: proposedThreshold === 3.0 ? "t3" : proposedThreshold === 1.0 ? "t1" : "t2",
    },
  ];

  // If contextual condition exists (e.g. prior period weakness), add targeted clarification question
  if (contextConditions.length > 0) {
    const ctx = contextConditions[0];
    if (ctx.type === "prior_period_weakness") {
      const p = ctx.period ?? 5;
      clarificationQuestions.push({
        id: "context_weakness_question",
        category: "market",
        title: `How should 'weak during the previous ${p} trading days' be defined?`,
        prompt: `The phrase 'weak' is ambiguous. Select a quantitative rule to define market weakness over the prior ${p} trading days:`,
        options: [
          {
            id: "w_ret",
            label: `Net return over previous ${p} days <= -2%`,
            value: "return_pct",
            isDefault: true,
            description: `Cumulative index return over the preceding ${p} trading sessions is -2.0% or lower.`,
          },
          {
            id: "w_count",
            label: `At least ${Math.ceil(p * 0.6)} of previous ${p} days were negative`,
            value: "down_count",
            description: `Majority of days in the ${p}-day window experienced negative closing returns.`,
          },
          {
            id: "w_trend",
            label: `Previous ${p}-day trend was negative`,
            value: "sma_trend",
            description: `Index closed below its ${p}-day simple moving average before the trigger day.`,
          },
        ],
        allowCustom: true,
        selectedOptionId: "w_ret",
      });
    }
  }

  const compMetric = compInfo.comparisonMetric || "5-day return";
  clarificationQuestions.push(
    {
      id: "holding_period_question",
      category: "holding_period",
      title: isComparison
        ? (compMetric.includes("recover") ? "How should recovery speed be measured?" : `Evaluation horizon for ${compMetric}`)
        : "Holding period",
      prompt: isComparison
        ? `Select the evaluation horizon to compare ${compMetric}:`
        : "How long should the position be held before evaluating performance?",
      options: isComparison
        ? [
            { id: "h1", label: "Return after 1 trading day (Immediate)", value: 1 },
            { id: "h3", label: "Return after 3 trading days (Short-term)", value: 3, isDefault: proposedHoldingDays === 3 },
            { id: "h5", label: "Return after 5 trading days (1 week)", value: 5, isDefault: proposedHoldingDays === 5 },
            { id: "h10", label: "Return after 10 trading days (2 weeks)", value: 10, isDefault: proposedHoldingDays === 10 },
          ]
        : [
            { id: "h1", label: "1 trading day", value: 1 },
            { id: "h3", label: "3 trading days", value: 3, isDefault: proposedHoldingDays === 3 },
            { id: "h5", label: "5 trading days (1 week)", value: 5, isDefault: proposedHoldingDays === 5 },
            { id: "h10", label: "10 trading days (2 weeks)", value: 10, isDefault: proposedHoldingDays === 10 },
          ],
      allowCustom: true,
      selectedOptionId: proposedHoldingDays === 10 ? "h10" : proposedHoldingDays === 3 ? "h3" : "h5",
    },
    {
      id: "test_period_question",
      category: "test_period",
      title: "Test period",
      prompt: "What historical window should be evaluated?",
      options: [
        { id: "tp3", label: "Last 3 years (2022–2025)", value: 3, isDefault: true },
        { id: "tp5", label: "Last 5 years (2020–2025)", value: 5 },
        { id: "tp10", label: "Last 10 years", value: 10 },
      ],
      allowCustom: true,
      selectedOptionId: "tp3",
    },
    {
      id: "exit_rule_question",
      category: "exit_rule",
      title: "Exit rule",
      prompt: "How should trades be closed?",
      options: [
        { id: "ex_hold", label: "After holding period (time-based)", value: "holding_period", isDefault: true },
        { id: "ex_stop", label: "Stop loss (2.0% risk cap)", value: "stop_loss" },
        { id: "ex_tp", label: "Profit target (3.0% upside target)", value: "profit_target" },
      ],
      allowCustom: false,
      selectedOptionId: "ex_hold",
    }
  );

  const proposedAssumptions: ProposedAssumption[] = isComparison
    ? [
        {
          id: "assump_1",
          label: `Condition threshold = decline of at least ${proposedThreshold}% applied identically to both conditions`,
          rationale: "Ensures a fair comparison by keeping qualifying decline criteria uniform across both branches.",
          source: "AI suggested",
        },
        {
          id: "assump_2",
          label: "Entry = next trading day's open for both conditions",
          rationale: "Prevents look-ahead bias by executing on the first bar after condition confirmation.",
          source: "AI suggested",
        },
        {
          id: "assump_3",
          label: `Evaluation horizon = ${proposedHoldingDays} trading days ${compMetric} comparison`,
          rationale: "Compares post-event performance over an identical holding horizon.",
          source: "AI suggested",
        },
        {
          id: "assump_4",
          label: "Friction = 0.10% round trip transaction cost & slippage",
          rationale: "Baseline retail execution friction assumption applied identically to both branches.",
          source: "AI suggested",
        },
      ]
    : [
        {
          id: "assump_1",
          label: hasExplicitThreshold
            ? `Condition threshold = decline of at least ${proposedThreshold}% (Explicitly defined in question)`
            : `Condition threshold = decline of at least ${proposedThreshold}%`,
          rationale: hasExplicitThreshold
            ? "Extracted directly from quantitative parameters in the research question."
            : "Aligns with 2-sigma historical daily moves in large-cap equity indices.",
          source: "AI suggested",
        },
        {
          id: "assump_2",
          label: "Entry = next trading day's open",
          rationale: "Prevents look-ahead bias by executing on the first bar after condition confirmation.",
          source: "AI suggested",
        },
        {
          id: "assump_3",
          label: `Exit = close after ${proposedHoldingDays} trading days`,
          rationale: "Captures short-term mean-reversion cycle without multi-month macro drift.",
          source: "AI suggested",
        },
        {
          id: "assump_4",
          label: "Friction = 0.10% round trip transaction cost & slippage",
          rationale: "Baseline retail execution friction assumption (customizable).",
          source: "AI suggested",
        },
      ];

  if (contextConditions.length > 0) {
    const ctx = contextConditions[0];
    proposedAssumptions.splice(1, 0, {
      id: "assump_context",
      label: `Context filter = ${ctx.label} (requires user definition)`,
      rationale: "Preserves the multi-day market regime condition from the original research question.",
      source: "AI suggested",
    });
  }

  const preliminaryHypothesis = generateHypothesis({
    instrument,
    threshold: proposedThreshold,
    conditionThreshold: proposedThreshold,
    holdingPeriod: proposedHoldingDays,
    experimentType: isComparison ? "comparison" : "single",
    comparisons,
    comparisonMetric: compInfo.comparisonMetric,
    contextConditions: contextConditions.length > 0 ? contextConditions : undefined,
  });

  const semanticIntent = {
    instrument,
    primaryEvent: hasExplicitThreshold ? `decline >= ${proposedThreshold}%` : "daily decline",
    contextConditionPhrases: contextConditions.map((c) => c.label),
    evaluationIntent: "better returns",
  };

  return {
    originalQuestion: question,
    instrument,
    timeframe: "daily",
    detectedCondition,
    isAmbiguous,
    ambiguitySummary,
    missingInformation: missingInfo,
    clarificationQuestions,
    proposedAssumptions,
    preliminaryHypothesis,
    proposedThreshold,
    proposedHoldingDays,
    experimentType: isComparison ? "comparison" : "single",
    comparisons,
    comparisonMetric: compInfo.comparisonMetric,
    comparisonDirection: compInfo.comparisonDirection,
    confidence: isAmbiguous ? "medium" : "high",
    hasExplicitThreshold,
    detectedAmbiguousPhrase: ambiguousPhrase ?? undefined,
    contextConditions: contextConditions.length > 0 ? contextConditions : undefined,
    semanticIntent,
  };
}

/**
 * Server-side AI analysis using Gemini 2.5 Flash with structured output.
 */
export async function analyzeQuestion(question: string): Promise<AnalysisResult> {
  const scopeCheck = validateQuestionScope(question);
  if (!scopeCheck.isValid) {
    throw new Error(scopeCheck.reason || "Invalid research question");
  }

  if (!API_KEY) {
    return analyzeQuestionFallback(question);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_ANALYZE_PROMPT },
            { text: `Research Question: "${question}"` },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const responseText = response.text?.trim() || "";
    const parsed = JSON.parse(responseText);

    const fallback = analyzeQuestionFallback(question);
    const { hasExplicitThreshold, threshold: extractedThreshold } = extractQuantitativeThreshold(question);
    const ambiguousPhrase = detectAmbiguousDeclinePhrase(question);

    let finalProposedThreshold = fallback.proposedThreshold;
    if (hasExplicitThreshold && extractedThreshold !== undefined) {
      finalProposedThreshold = extractedThreshold;
    } else if (typeof parsed.proposedThreshold === "number" && parsed.proposedThreshold > 0) {
      finalProposedThreshold = parsed.proposedThreshold;
    }

    let finalMissingInfo: string[] = Array.isArray(parsed.missingInformation) && parsed.missingInformation.length > 0
      ? parsed.missingInformation
      : fallback.missingInformation;

    let finalAmbiguitySummary = parsed.ambiguitySummary || fallback.ambiguitySummary;

    // Strict guardrails against LLM hallucination of "sharp fall" or phantom missing thresholds:
    if (hasExplicitThreshold) {
      finalMissingInfo = finalMissingInfo.filter(
        (m: string) =>
          !m.toLowerCase().includes("sharp") &&
          !m.toLowerCase().includes("threshold") &&
          !m.toLowerCase().includes("percentage")
      );
      if (!finalMissingInfo.some((m) => m.toLowerCase().includes("holding"))) {
        finalMissingInfo.push("Holding duration");
      }
      if (!finalMissingInfo.some((m) => m.toLowerCase().includes("exit"))) {
        finalMissingInfo.push("Exit trigger");
      }
      if (!finalMissingInfo.some((m) => m.toLowerCase().includes("cost") || m.toLowerCase().includes("friction"))) {
        finalMissingInfo.push("Transaction costs");
      }
      if (finalAmbiguitySummary.toLowerCase().includes("sharp fall") || !finalAmbiguitySummary) {
        finalAmbiguitySummary = fallback.ambiguitySummary;
      }
    } else if (!ambiguousPhrase && finalAmbiguitySummary.toLowerCase().includes("sharp fall")) {
      finalAmbiguitySummary = fallback.ambiguitySummary;
      finalMissingInfo = fallback.missingInformation;
    }

    // Preserve contextual conditions and ensure missing definition is present if unresolved
    if (fallback.contextConditions && fallback.contextConditions.length > 0) {
      const ctx = fallback.contextConditions[0];
      if (!finalMissingInfo.some((m) => m.toLowerCase().includes("weak") || m.toLowerCase().includes("context"))) {
        finalMissingInfo.splice(1, 0, `Definition of 'weak' during prior ${ctx.period ?? 5} days`);
      }
    }

    return {
      originalQuestion: question,
      instrument: parsed.instrument || fallback.instrument,
      timeframe: parsed.timeframe || fallback.timeframe,
      detectedCondition: fallback.detectedCondition,
      isAmbiguous: fallback.isAmbiguous,
      ambiguitySummary: finalAmbiguitySummary,
      missingInformation: finalMissingInfo,
      clarificationQuestions: fallback.clarificationQuestions,
      proposedAssumptions: fallback.proposedAssumptions,
      preliminaryHypothesis: generateHypothesis({
        instrument: parsed.instrument || fallback.instrument,
        threshold: finalProposedThreshold,
        conditionThreshold: finalProposedThreshold,
        holdingPeriod: fallback.proposedHoldingDays ?? 5,
        experimentType: fallback.experimentType,
        comparisons: fallback.comparisons,
        comparisonMetric: fallback.comparisonMetric,
        contextConditions: fallback.contextConditions,
      }),
      proposedThreshold: finalProposedThreshold,
      proposedHoldingDays: fallback.proposedHoldingDays,
      experimentType: fallback.experimentType,
      comparisons: fallback.comparisons,
      comparisonMetric: fallback.comparisonMetric,
      confidence: parsed.confidence || "high",
      hasExplicitThreshold,
      detectedAmbiguousPhrase: ambiguousPhrase ?? undefined,
      contextConditions: fallback.contextConditions,
      semanticIntent: fallback.semanticIntent,
    };
  } catch (error) {
    console.warn("Gemini API call failed, using heuristic fallback:", error);
    return analyzeQuestionFallback(question);
  }
}

/**
 * Heuristic fallback for Stage 5 LEARN interpretation.
 */
export function generateInterpretationFallback(
  experiment: ExperimentData,
  resultSummary: {
    observations: number;
    winRate: number;
    averageReturn: number;
    medianReturn: number;
    cumulativeReturn: number;
    comparisonResults?: any;
  }
): InterpretationResult {
  const isPositive = resultSummary.averageReturn > 0;
  const currentFriction = experiment.friction ?? experiment.costAssumption ?? 0;
  const costPctStr = (currentFriction * 100).toFixed(2) + "%";
  const isComparison =
    experiment.experimentType === "comparison" &&
    !!experiment.comparisons &&
    experiment.comparisons.length >= 2;
  const hasContextConditions = !!(experiment.contextConditions && experiment.contextConditions.length > 0);

  // Issue 2: Read actual entry rule dynamically - NEVER say "immediately" when entering next open
  const entryTimingStr =
    experiment.entryRule === "next_open" || experiment.entry?.type === "next_open"
      ? "at the next trading day's open"
      : "at the same-day close";

  let dataSummary = `The simulated sample contains ${resultSummary.observations} qualifying trade opportunities. ${resultSummary.winRate}% of trades were profitable with an average net trade return of ${resultSummary.averageReturn > 0 ? "+" : ""}${resultSummary.averageReturn}% and a median return of ${resultSummary.medianReturn > 0 ? "+" : ""}${resultSummary.medianReturn}%. Cumulative compounded return over the sample period was ${resultSummary.cumulativeReturn > 0 ? "+" : ""}${resultSummary.cumulativeReturn}% with ${costPctStr} friction.`;

  // Outcome-grounded phrasing
  let reasonableConclusions = isPositive
    ? `The simulated sample suggests that entering ${entryTimingStr} after the condition produced positive average returns (+${resultSummary.averageReturn}%), though this evidence remains preliminary and insufficient to establish a robust trading edge.`
    : `The simulated sample suggests that entering ${entryTimingStr} after the condition produced negative average returns (${resultSummary.averageReturn}%), indicating that downward momentum continued during the holding period.`;

  if (isComparison && experiment.comparisons) {
    const compA = experiment.comparisons[0];
    const compB = experiment.comparisons[1];
    if (resultSummary.comparisonResults) {
      const bA = resultSummary.comparisonResults.branchA;
      const bB = resultSummary.comparisonResults.branchB;
      const diff = resultSummary.comparisonResults.difference;
      const avgDiff = diff?.avgReturnDiff ?? (bA.averageReturn - bB.averageReturn);
      const wrDiff = diff?.winRateDiff ?? (bA.winRate - bB.winRate);

      const metricName = experiment.comparisonMetric || "5-day return";
      dataSummary = `Condition A (${bA.name}): ${bA.observations} qualifying signals, ${bA.executedTrades ?? bA.observations} executed trades, ${bA.winRate}% win rate, average return ${bA.averageReturn > 0 ? "+" : ""}${bA.averageReturn}%, median return ${bA.medianReturn > 0 ? "+" : ""}${bA.medianReturn}%. Condition B (${bB.name}): ${bB.observations} qualifying signals, ${bB.executedTrades ?? bB.observations} executed trades, ${bB.winRate}% win rate, average return ${bB.averageReturn > 0 ? "+" : ""}${bB.averageReturn}%, median return ${bB.medianReturn > 0 ? "+" : ""}${bB.medianReturn}%. Difference (A − B): Average net return difference of ${avgDiff > 0 ? "+" : ""}${avgDiff.toFixed(2)}%, win rate difference of ${wrDiff > 0 ? "+" : ""}${wrDiff.toFixed(1)} percentage points (pp).`;

      if (Math.abs(avgDiff) < 0.05) {
        reasonableConclusions = `Empirical results indicate that ${bA.name} and ${bB.name} produced virtually identical average returns (${bA.averageReturn}% vs ${bB.averageReturn}%) over the ${experiment.holdingPeriod}-day holding horizon with ${costPctStr} friction. The data does not show that one condition meaningfully outperforms the other in this sample window.`;
      } else if (bA.averageReturn > bB.averageReturn) {
        reasonableConclusions = `Empirical results indicate that ${bA.name} generated higher average returns (+${bA.averageReturn}%) than ${bB.name} (${bB.averageReturn > 0 ? "+" : ""}${bB.averageReturn}%), a net difference of +${avgDiff.toFixed(2)}% over the ${experiment.holdingPeriod}-day holding period with ${costPctStr} friction. While this sample demonstrates higher performance following ${bA.name}, this historical observation does not constitute a proven edge or causal guarantee.`;
      } else {
        reasonableConclusions = `Empirical results indicate that ${bB.name} generated higher average returns (+${bB.averageReturn}%) than ${bA.name} (${bA.averageReturn > 0 ? "+" : ""}${bA.averageReturn}%), a net difference of +${(-avgDiff).toFixed(2)}% over the ${experiment.holdingPeriod}-day holding period with ${costPctStr} friction. The data does not support the hypothesis that ${bA.name} produces better ${metricName} than ${bB.name} in this sample.`;
      }
    } else {
      dataSummary = `Comparative evaluation between Condition A (${compA.name}) and Condition B (${compB.name}) across ${resultSummary.observations} sample sessions. Under identical ${experiment.holdingPeriod}-day holding horizons and ${costPctStr} friction, Condition A achieved a ${resultSummary.winRate}% win rate with ${resultSummary.averageReturn > 0 ? "+" : ""}${resultSummary.averageReturn}% average net return.`;
      reasonableConclusions = `The empirical data contrasts whether ${compA.name} produces stronger performance than ${compB.name}. In this sample, ${compA.name} showed an average expectancy of ${resultSummary.averageReturn > 0 ? "+" : ""}${resultSummary.averageReturn}%. Multiple market regimes must be evaluated before concluding an edge.`;
    }

    if (isComparison && experiment.comparisonMetric?.toLowerCase().includes("recover")) {
      reasonableConclusions += " Note: The research query inquired about recovery speed; continuous time-to-recovery was not evaluated by the prototype simulation engine.";
    }
  } else if (hasContextConditions && experiment.contextConditions) {
    const ctx = experiment.contextConditions[0];
    const ruleStr = ctx.definition || "prior weakness condition";
    reasonableConclusions = `The simulation evaluated unconditional single-day drops of >= ${experiment.condition.threshold}%, with entry ${entryTimingStr}, but the contextual regime filter ('${ctx.label}' with rule: ${ruleStr}) was not modeled by the prototype simulation engine. Therefore, these empirical results reflect unconditional drops and cannot confirm or reject whether prior market weakness improves rebound returns.`;
  }

  const risksAndLimitations = [
    "Sample Size: The number of observations is limited; results may reflect idiosyncratic historical clusters rather than an enduring edge.",
    `Cost Sensitivity: Testing at ${costPctStr} friction isolates gross theoretical behavior; execution slippage during high-volatility selloffs will compress returns.`,
    "Regime Dependency: Performance was not separated between secular bull and bear market regimes.",
    "Absence of Risk Controls: Fixed-period holding without dynamic stop-loss exposes the trader to severe tail drawdowns.",
  ];

  if (isComparison && experiment.comparisonMetric?.toLowerCase().includes("recover")) {
    risksAndLimitations.unshift(
      "Recovery Speed Modeling Limitation: The research question inquired about recovery speed; the prototype simulation engine measures discrete fixed-period returns and win rates across the holding period, rather than continuous time-to-recovery (drawdown duration to prior peak)."
    );
  }

  if (hasContextConditions && experiment.contextConditions) {
    risksAndLimitations.unshift(
      `Context Filter Not Modeled: The research hypothesis specifies entry only when ${experiment.contextConditions[0].label}, but the prototype simulation engine evaluated all qualifying daily declines unconditionally.`
    );
  }

  // Issue 1: Direction-aware friction target calculation
  let targetFriction: number;
  if (currentFriction >= 0.0025) {
    targetFriction = 0.0020; // 0.20%
  } else if (currentFriction <= 0.0010) {
    targetFriction = 0.0025; // 0.25%
  } else {
    targetFriction = 0.0030; // 0.30%
  }
  const targetPctStr = (targetFriction * 100).toFixed(2) + "%";

  // Issue 1 & Issue 3: Direction-aware AND outcome-grounded friction question
  let frictionQuestion = "";
  if (targetFriction < currentFriction) {
    // Reducing friction
    frictionQuestion = isPositive
      ? `Does reducing round-trip friction from ${costPctStr} to ${targetPctStr} materially enhance the observed returns?`
      : `Does reducing round-trip friction from ${costPctStr} to ${targetPctStr} materially improve the observed returns?`;
  } else {
    // Increasing friction
    frictionQuestion = isPositive
      ? `Does increasing round-trip friction from ${costPctStr} to ${targetPctStr} eliminate the observed positive returns?`
      : `Does increasing round-trip friction from ${costPctStr} to ${targetPctStr} further worsen the negative performance?`;
  }

  // Issue 3: Grounded stop-loss question
  const stopLossQuestion = isPositive
    ? `Does adding a 2.0% stop-loss improve the risk-adjusted Sharpe ratio without clipping rebound gains?`
    : `Does adding a 2.0% stop-loss effectively truncate tail drawdowns and mitigate the observed decline?`;

  // Issue 3: Grounded generalization question (never claim "edge" or "recovery" when returns are negative)
  const generalizationQuestion = isPositive
    ? `Does the positive tendency persist when evaluated out-of-sample on other liquid equity indices?`
    : `Does this negative performance persist when evaluated across different market regimes or other liquid equity indices?`;

  const regimeQuestion =
    isComparison && experiment.comparisons
      ? `How does the return comparison between ${experiment.comparisons[0].name} and ${experiment.comparisons[1].name} hold during high-volatility regimes (India VIX > 20)?`
      : `How does strategy performance behave during high-volatility regimes (e.g., India VIX > 20)?`;

  const followUpQuestions = [
    regimeQuestion,
    stopLossQuestion,
    frictionQuestion,
    `How does the return distribution look if holding period is varied across 1, 3, 5, and 10 trading days?`,
    generalizationQuestion,
  ];

  if (hasContextConditions && experiment.contextConditions) {
    const ctx = experiment.contextConditions[0];
    followUpQuestions.unshift(
      `How does strategy expectancy change when strictly filtering for ${ctx.definition || "prior 5-day weakness"} versus unconditional drops?`
    );
  }

  return {
    dataSummary,
    reasonableConclusions,
    risksAndLimitations,
    followUpQuestions,
  };
}

/**
 * Server-side AI interpretation for Stage 5 LEARN.
 */
export async function interpretResults(
  experiment: ExperimentData,
  resultSummary: {
    observations: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    averageReturn: number;
    medianReturn: number;
    bestReturn: number;
    worstReturn: number;
    cumulativeReturn: number;
    comparisonResults?: any;
  }
): Promise<InterpretationResult> {
  const fallback = generateInterpretationFallback(experiment, resultSummary);

  if (!API_KEY) {
    return fallback;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: SYSTEM_LEARN_PROMPT },
            {
              text: `Experiment Definition: ${JSON.stringify(experiment, null, 2)}\n\nEmpirical Results:\nObservations: ${resultSummary.observations}\nWin Rate: ${resultSummary.winRate}%\nAverage Return: ${resultSummary.averageReturn}%\nMedian Return: ${resultSummary.medianReturn}%\nBest Return: ${resultSummary.bestReturn}%\nWorst Return: ${resultSummary.worstReturn}%\nCumulative Compounded Return: ${resultSummary.cumulativeReturn}%`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const responseText = response.text?.trim() || "";
    const parsed = JSON.parse(responseText);

    let reasonableConclusions = parsed.reasonableConclusions || fallback.reasonableConclusions;
    // Issue 2 Post-processing: ensure entry rule fidelity (never say "immediately" when entering next open)
    if (experiment.entryRule === "next_open" || experiment.entry?.type === "next_open") {
      reasonableConclusions = reasonableConclusions.replace(
        /\bentering immediately\b/gi,
        "entering at the next trading day's open"
      );
    }

    // Issue 1 & 3 Post-processing: ensure friction direction and outcome alignment in follow-up questions
    let followUpQuestions =
      parsed.followUpQuestions &&
      Array.isArray(parsed.followUpQuestions) &&
      parsed.followUpQuestions.length > 0
        ? parsed.followUpQuestions.map((q: string) => {
            if (q.toLowerCase().includes("increasing") && q.includes("0.30%") && q.includes("0.20%")) {
              return q.replace(/increasing/gi, "reducing");
            }
            if (resultSummary.averageReturn <= 0) {
              q = q.replace(/eliminate the observed recovery/gi, "materially improve the observed returns");
              q = q.replace(/observed recovery/gi, "observed returns");
              q = q.replace(/relative edge/gi, "performance");
            }
            return q;
          })
        : fallback.followUpQuestions;

    return {
      dataSummary: fallback.dataSummary,
      reasonableConclusions,
      risksAndLimitations: parsed.risksAndLimitations || fallback.risksAndLimitations,
      followUpQuestions,
    };
  } catch (error) {
    console.warn("Gemini interpretation failed, using fallback:", error);
    return fallback;
  }
}