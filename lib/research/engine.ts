import { MOCK_NIFTY_DATA, MarketBar, getDeterministicMarketData } from "@/data/mockMarketData";
import {
  ExperimentCondition,
  ExperimentData,
  ExperimentResult,
  Trade,
  EquityPoint,
  ReturnBucket,
  SensitivityPoint,
  SensitivityAnalysisResult,
  buildExperimentContract,
} from "@/types/experiment";

/**
 * Extracts configured lookback horizon in years from experiment.
 */
export function extractLookbackYears(experiment: ExperimentData): number {
  if (experiment.lookbackPeriod && experiment.lookbackPeriod > 0) {
    return experiment.lookbackPeriod;
  }
  if (experiment.canonical?.lookbackPeriod && experiment.canonical.lookbackPeriod > 0) {
    return experiment.canonical.lookbackPeriod;
  }
  if (experiment.testPeriod?.label) {
    const match = experiment.testPeriod.label.match(/(\d+)\s*year/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  if (experiment.testPeriod?.start && experiment.testPeriod?.end) {
    const startYr = parseInt(experiment.testPeriod.start.split("-")[0], 10);
    const endYr = parseInt(experiment.testPeriod.end.split("-")[0], 10);
    if (!isNaN(startYr) && !isNaN(endYr) && endYr > startYr) {
      return endYr - startYr;
    }
  }
  return 5;
}

/**
 * Deterministically identifies bar indices that satisfy the experiment's condition.
 */
export function identifyEntries(
  data: MarketBar[],
  condition: ExperimentCondition
): number[] {
  const signalIndices: number[] = [];
  const threshold = Math.abs(condition.threshold ?? 2.0);

  for (let i = 0; i < data.length - 1; i++) {
    const bar = data[i];
    let matched = false;

    switch (condition.type) {
      case "daily_decline":
        // e.g. Daily fall of 1% or more -> dailyReturn <= -1.0
        if (bar.dailyReturn <= -threshold) {
          matched = true;
        }
        break;

      case "daily_gain":
        if (bar.dailyReturn >= threshold) {
          matched = true;
        }
        break;

      case "gap_down":
        if (bar.gapReturn <= -threshold) {
          matched = true;
        }
        break;

      case "consecutive_down": {
        const streak = condition.consecutiveDays ?? 2;
        if (i >= streak - 1) {
          let allDown = true;
          for (let k = 0; k < streak; k++) {
            const isDown = threshold > 0 ? data[i - k].dailyReturn <= -threshold : data[i - k].dailyReturn < 0;
            if (!isDown) {
              allDown = false;
              break;
            }
          }
          matched = allDown;
        }
        break;
      }

      case "volatility_spike":
        if (bar.volatility >= threshold) {
          matched = true;
        }
        break;

      default:
        if (bar.dailyReturn <= -threshold) {
          matched = true;
        }
    }

    if (matched) {
      signalIndices.push(i);
    }
  }

  return signalIndices;
}

/**
 * Calculates trades deterministically from signals, respecting holding period and costs.
 * Avoids overlapping positions to simulate realistic single-lot capital allocation.
 */
export function generateTrades(
  data: MarketBar[],
  signalIndices: number[],
  experiment: ExperimentData
): Trade[] {
  const trades: Trade[] = [];
  const holdingDays = Math.max(1, experiment.holdingPeriod ?? 5);
  const friction = experiment.friction ?? experiment.costAssumption ?? 0;
  const costPct = friction * 100; // e.g. 0.00% or 0.30%

  let lastExitIndex = -1;

  for (const signalIdx of signalIndices) {
    // If we are already in an active trade, skip this signal to prevent overlapping position distortion
    if (signalIdx <= lastExitIndex) {
      continue;
    }

    // Entry bar

    const entryBarIdx = experiment.entry.type === "same_close" ? signalIdx : signalIdx + 1;
    if (entryBarIdx >= data.length) break;

    const entryBar = data[entryBarIdx];
    const entryPrice = experiment.entry.type === "same_close" ? entryBar.close : entryBar.open;

    // Exit bar calculation
    let exitBarIdx = Math.min(entryBarIdx + holdingDays, data.length - 1);
    let exitPrice = data[exitBarIdx].close;

    // Check optional stop-loss or take-profit intraday hits during holding window
    if (experiment.exit.type === "stop_loss" && experiment.exit.stopLossPercent) {
      const stopLevel = entryPrice * (1 - experiment.exit.stopLossPercent / 100);
      for (let step = entryBarIdx; step <= exitBarIdx; step++) {
        if (data[step].low <= stopLevel) {
          exitBarIdx = step;
          exitPrice = stopLevel;
          break;
        }
      }
    } else if (experiment.exit.type === "profit_target" && experiment.exit.takeProfitPercent) {
      const targetLevel = entryPrice * (1 + experiment.exit.takeProfitPercent / 100);
      for (let step = entryBarIdx; step <= exitBarIdx; step++) {
        if (data[step].high >= targetLevel) {
          exitBarIdx = step;
          exitPrice = targetLevel;
          break;
        }
      }
    }

    const exitBar = data[exitBarIdx];
    const grossReturn = Number((((exitPrice - entryPrice) / entryPrice) * 100).toFixed(2));
    const netReturn = Number((grossReturn - costPct).toFixed(2));

    trades.push({
      id: `trade-${trades.length + 1}`,
      entryIndex: entryBarIdx,
      exitIndex: exitBarIdx,
      entryDate: entryBar.date,
      exitDate: exitBar.date,
      entryPrice,
      exitPrice,
      grossReturn,
      netReturn,
      isWin: netReturn > 0,
      holdingDays: Math.max(1, exitBarIdx - entryBarIdx),
    });

    lastExitIndex = exitBarIdx;
  }

  return trades;
}

export function calculateWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.isWin).length;
  return Number(((wins / trades.length) * 100).toFixed(1));
}

export function calculateAverageReturn(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const total = trades.reduce((sum, t) => sum + t.netReturn, 0);
  return Number((total / trades.length).toFixed(2));
}

export function calculateMedianReturn(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const sorted = [...trades].map((t) => t.netReturn).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
  }
  return Number(sorted[mid].toFixed(2));
}

export function calculateBestTrade(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return Math.max(...trades.map((t) => t.netReturn));
}

export function calculateWorstTrade(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  return Math.min(...trades.map((t) => t.netReturn));
}

export function calculateCumulativeReturn(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  let equity = 1.0;
  for (const t of trades) {
    equity *= 1 + t.netReturn / 100;
  }
  return Number(((equity - 1) * 100).toFixed(2));
}

export function generateEquityCurve(trades: Trade[]): EquityPoint[] {
  const points: EquityPoint[] = [];
  let currentEquity = 100.0; // Start at 100 index base

  points.push({
    tradeIndex: 0,
    date: trades.length > 0 ? trades[0].entryDate : "Start",
    tradeReturn: 0,
    cumulativeReturn: 0,
  });

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    currentEquity *= 1 + t.netReturn / 100;
    const cumPct = Number((currentEquity - 100).toFixed(2));
    points.push({
      tradeIndex: i + 1,
      date: t.exitDate,
      tradeReturn: t.netReturn,
      cumulativeReturn: cumPct,
    });
  }

  return points;
}

export function generateReturnDistribution(trades: Trade[]): ReturnBucket[] {
  const buckets = [
    { range: "< -3.0%", min: -Infinity, max: -3.0, count: 0 },
    { range: "-3.0% to -1.0%", min: -3.0, max: -1.0, count: 0 },
    { range: "-1.0% to 0%", min: -1.0, max: 0, count: 0 },
    { range: "0% to +1.0%", min: 0, max: 1.0, count: 0 },
    { range: "+1.0% to +3.0%", min: 1.0, max: 3.0, count: 0 },
    { range: "> +3.0%", min: 3.0, max: Infinity, count: 0 },
  ];

  for (const t of trades) {
    for (const b of buckets) {
      if (t.netReturn >= b.min && t.netReturn < b.max) {
        b.count++;
        break;
      }
    }
  }

  return buckets.map((b) => ({ range: b.range, count: b.count }));
}

/**
 * Computes deterministic recovery performance metrics for a trade set.
 */
export function computeRecoveryMetric(
  trades: Trade[]
): {
  recoveryRate: number;
  avgDaysToRecover: number;
  description: string;
} {
  if (trades.length === 0) {
    return {
      recoveryRate: 0,
      avgDaysToRecover: 0,
      description: "0 positions executed",
    };
  }
  const recoveringTrades = trades.filter((t) => t.isWin || t.netReturn >= 0);
  const recoveryRate = Number(((recoveringTrades.length / trades.length) * 100).toFixed(1));
  const avgDaysToRecover = Number(
    (trades.reduce((acc, t) => acc + t.holdingDays, 0) / trades.length).toFixed(1)
  );
  return {
    recoveryRate,
    avgDaysToRecover,
    description: `${recoveringTrades.length}/${trades.length} positions (${recoveryRate}%) recovered entry price`,
  };
}

/**
 * Pre-simulation validation of the canonical experiment configuration.
 */
export function validateExperimentInput(experiment: ExperimentData): void {
  const inst = experiment.instrument || experiment.market;
  if (!inst || typeof inst !== "string" || inst.trim().length === 0) {
    throw new Error("Validation error: Experiment instrument/market is required.");
  }

  if (
    !experiment.condition ||
    typeof experiment.condition.threshold !== "number" ||
    experiment.condition.threshold < 0 ||
    (experiment.condition.type === "daily_decline" && experiment.condition.threshold <= 0)
  ) {
    throw new Error("Validation error: Experiment condition with valid threshold is required.");
  }

  const holding = experiment.holdingPeriod;
  if (!holding || typeof holding !== "number" || holding <= 0) {
    throw new Error("Validation error: Holding period must be a positive integer.");
  }

  const friction = experiment.friction ?? experiment.costAssumption;
  if (friction === undefined || typeof friction !== "number" || isNaN(friction) || friction < 0 || friction > 0.05) {
    throw new Error("Validation error: Friction must be between 0.0% and 5.0%.");
  }

  const lookback = extractLookbackYears(experiment);
  if (!lookback || lookback <= 0 || lookback > 30) {
    throw new Error("Validation error: Lookback period must be between 1 and 30 years.");
  }

  if (experiment.experimentType === "comparison") {
    if (!experiment.comparisons || experiment.comparisons.length < 2) {
      throw new Error("Validation error: Comparison experiment must define both Condition A and Condition B.");
    }
    const [branchA, branchB] = experiment.comparisons;
    if (!branchA?.condition || !branchB?.condition) {
      throw new Error("Validation error: Comparison branches must define valid entry conditions.");
    }
    const metric = experiment.comparisonMetric || experiment.comparison?.metric;
    if (!metric || metric.trim().length === 0) {
      throw new Error("Validation error: Comparison experiment must specify a comparison metric.");
    }
  }
}

/**
 * Post-simulation validation of calculated quantitative metrics.
 */
export function validateExperimentOutput(result: ExperimentResult): void {
  // 1. Executed trades consistency
  if (result.winningTrades + result.losingTrades !== result.trades.length) {
    throw new Error(
      `Engine calculation error: wins (${result.winningTrades}) + losses (${result.losingTrades}) != executed trades (${result.trades.length})`
    );
  }

  // 2. Win rate bounds
  if (result.winRate < 0 || result.winRate > 100 || isNaN(result.winRate)) {
    throw new Error(`Engine calculation error: invalid win rate (${result.winRate})`);
  }

  // 3. Finite numeric returns
  if (isNaN(result.averageReturn) || isNaN(result.medianReturn) || isNaN(result.cumulativeReturn)) {
    throw new Error("Engine calculation error: computed return metrics contain NaN");
  }

  // 4. Comparison consistency
  if (result.comparisonResults) {
    const { branchA, branchB, difference } = result.comparisonResults;
    if (branchA.winningTrades + branchA.losingTrades !== branchA.executedTrades) {
      throw new Error("Engine calculation error: branch A wins + losses != executed trades");
    }
    if (branchB.winningTrades + branchB.losingTrades !== branchB.executedTrades) {
      throw new Error("Engine calculation error: branch B wins + losses != executed trades");
    }

    const expectedWinRateDiff = Number((branchA.winRate - branchB.winRate).toFixed(1));
    const expectedAvgDiff = Number((branchA.averageReturn - branchB.averageReturn).toFixed(2));
    const expectedMedDiff = Number((branchA.medianReturn - branchB.medianReturn).toFixed(2));

    if (Math.abs(difference.winRateDiff - expectedWinRateDiff) > 0.1) {
      throw new Error("Engine calculation error: comparison winRateDiff mismatch");
    }
    if (Math.abs(difference.avgReturnDiff - expectedAvgDiff) > 0.01) {
      throw new Error("Engine calculation error: comparison avgReturnDiff mismatch");
    }
    if (Math.abs(difference.medianReturnDiff - expectedMedDiff) > 0.01) {
      throw new Error("Engine calculation error: comparison medianReturnDiff mismatch");
    }
  }
}

/**
 * Main deterministic research engine entry point.
 * Given an experiment definition, returns the calculated quantitative results.
 */
export function runExperiment(
  experiment: ExperimentData,
  dataset?: MarketBar[]
): ExperimentResult {
  // Input validation: fail fast if canonical experiment is incomplete
  validateExperimentInput(experiment);

  const lookbackYears = extractLookbackYears(experiment);
  const startYear = 2025 - lookbackYears;

  // Use explicitly supplied dataset (if non-empty and not the old static 260-bar dummy),
  // otherwise generate deterministic dataset for the exact lookback window.
  const datasetToUse =
    dataset && dataset.length > 0 && dataset !== MOCK_NIFTY_DATA
      ? dataset
      : getDeterministicMarketData(lookbackYears);

  const signalIndices = identifyEntries(datasetToUse, experiment.condition);
  const trades = generateTrades(datasetToUse, signalIndices, experiment);

  const winningTrades = trades.filter((t) => t.isWin).length;
  const losingTrades = trades.length - winningTrades;
  const winRate = calculateWinRate(trades);
  const averageReturn = calculateAverageReturn(trades);
  const medianReturn = calculateMedianReturn(trades);
  const bestReturn = calculateBestTrade(trades);
  const worstReturn = calculateWorstTrade(trades);
  const cumulativeReturn = calculateCumulativeReturn(trades);
  const equityCurve = generateEquityCurve(trades);
  const returnDistribution = generateReturnDistribution(trades);

  let comparisonResults: ExperimentResult["comparisonResults"] = undefined;
  let unsupportedComparisonNotice: string | undefined = undefined;

  if (
    experiment.experimentType === "comparison" &&
    experiment.comparisons &&
    experiment.comparisons.length >= 2
  ) {
    const compA = experiment.comparisons[0];
    const compB = experiment.comparisons[1];

    const supportedTypes = ["daily_decline", "daily_gain", "gap_down", "consecutive_down", "volatility_spike"];
    if (!supportedTypes.includes(compA.condition.type) || !supportedTypes.includes(compB.condition.type)) {
      unsupportedComparisonNotice =
        "Comparison condition identified, but the current prototype simulation engine does not yet support this comparison.";
    } else {
      const signalsA = identifyEntries(datasetToUse, compA.condition);
      const expA: ExperimentData = { ...experiment, condition: compA.condition };
      const tradesA = generateTrades(datasetToUse, signalsA, expA);
      const winRateA = calculateWinRate(tradesA);
      const avgA = calculateAverageReturn(tradesA);
      const medianA = calculateMedianReturn(tradesA);
      const cumA = calculateCumulativeReturn(tradesA);
      const recoveryA = computeRecoveryMetric(tradesA);

      const signalsB = identifyEntries(datasetToUse, compB.condition);
      const expB: ExperimentData = { ...experiment, condition: compB.condition };
      const tradesB = generateTrades(datasetToUse, signalsB, expB);
      const winRateB = calculateWinRate(tradesB);
      const avgB = calculateAverageReturn(tradesB);
      const medianB = calculateMedianReturn(tradesB);
      const cumB = calculateCumulativeReturn(tradesB);
      const recoveryB = computeRecoveryMetric(tradesB);

      const winRateDiff = Number((winRateA - winRateB).toFixed(1));
      const avgReturnDiff = Number((avgA - avgB).toFixed(2));
      const medianReturnDiff = Number((medianA - medianB).toFixed(2));
      const recoveryRateDiff = Number((recoveryA.recoveryRate - recoveryB.recoveryRate).toFixed(1));

      const metric = experiment.comparisonMetric || "5-day return";
      let verdict = "";
      if (metric.toLowerCase().includes("win rate")) {
        verdict =
          winRateA > winRateB
            ? `${compA.name} produced a higher win rate than ${compB.name} by +${winRateDiff} percentage points (${winRateA}% vs ${winRateB}%)`
            : winRateB > winRateA
            ? `${compB.name} produced a higher win rate than ${compA.name} by +${(-winRateDiff).toFixed(1)} percentage points (${winRateB}% vs ${winRateA}%)`
            : `Both conditions yielded identical win rates (${winRateA}%)`;
      } else {
        verdict =
          avgA > avgB
            ? `${compA.name} outperformed ${compB.name} by +${(avgA - avgB).toFixed(2)}% net average return`
            : avgB > avgA
            ? `${compB.name} outperformed ${compA.name} by +${(avgB - avgA).toFixed(2)}% net average return`
            : `Both conditions yielded identical net average returns (${avgA}%)`;
      }

      comparisonResults = {
        branchA: {
          name: compA.name,
          observations: signalsA.length,
          executedTrades: tradesA.length,
          winningTrades: tradesA.filter((t) => t.isWin).length,
          losingTrades: tradesA.length - tradesA.filter((t) => t.isWin).length,
          winRate: winRateA,
          averageReturn: avgA,
          medianReturn: medianA,
          cumulativeReturn: cumA,
          recoveryMetric: recoveryA,
        },
        branchB: {
          name: compB.name,
          observations: signalsB.length,
          executedTrades: tradesB.length,
          winningTrades: tradesB.filter((t) => t.isWin).length,
          losingTrades: tradesB.length - tradesB.filter((t) => t.isWin).length,
          winRate: winRateB,
          averageReturn: avgB,
          medianReturn: medianB,
          cumulativeReturn: cumB,
          recoveryMetric: recoveryB,
        },
        metric,
        difference: {
          winRateDiff,
          avgReturnDiff,
          medianReturnDiff,
          recoveryRateDiff,
        },
        verdict,
      };

      if (metric.toLowerCase().includes("recover")) {
        unsupportedComparisonNotice =
          "The prototype simulation engine evaluates fixed-horizon returns and win rates across the holding period; continuous time-to-recovery (drawdown duration to prior peak) was not calculated.";
      }
    }
  }

  const marketName = experiment.market || experiment.instrument || "NIFTY";
  const datasetDescription = `Simulated ${marketName} daily data (${datasetToUse.length.toLocaleString()} bars, ${lookbackYears}y synthetic model ${startYear}–2025)`;

  // Deterministically calculate robustness / sensitivity across holding periods
  const sensitivity = runSensitivityAnalysis(experiment, datasetToUse);

  const contract =
    experiment.contract ??
    (experiment.canonical ? buildExperimentContract(experiment.canonical) : undefined);

  const result: ExperimentResult = {
    id: `res-${Date.now()}`,
    experimentId: "",
    versionNumber: 1,
    observations: signalIndices.length,
    winningTrades,
    losingTrades,
    winRate,
    averageReturn,
    medianReturn,
    bestReturn,
    worstReturn,
    cumulativeReturn,
    datasetType: datasetDescription,
    trades,
    equityCurve,
    returnDistribution,
    comparisonResults,
    unsupportedComparisonNotice,
    frictionCostRoundTrip: experiment.costAssumption ?? experiment.friction ?? 0.001,
    sensitivity,
    contract,
    createdAt: new Date().toISOString(),
  };

  // Post-simulation validation: verify arithmetic consistency
  validateExperimentOutput(result);

  return result;
}

/**
 * Deterministically evaluates parameter sensitivity across controlled variations.
 * Uses the EXACT existing calculation engine logic. No fabricated numbers.
 */
export function runSensitivityAnalysis(
  experiment: ExperimentData,
  dataset?: MarketBar[]
): SensitivityAnalysisResult {
  const currentHolding = experiment.holdingPeriod ?? 5;
  const currentFriction = experiment.friction ?? experiment.costAssumption ?? 0.001;
  const lookbackYears = extractLookbackYears(experiment);

  const datasetToUse =
    dataset && dataset.length > 0 && dataset !== MOCK_NIFTY_DATA
      ? dataset
      : getDeterministicMarketData(lookbackYears);

  // Controlled holding period variations supported by the prototype engine: 3, 5, 10 days
  const candidateDays = [3, 5, 10];
  if (!candidateDays.includes(currentHolding)) {
    candidateDays.push(currentHolding);
    candidateDays.sort((a, b) => a - b);
  }

  const points: SensitivityPoint[] = [];

  for (const days of candidateDays) {
    const varExp: ExperimentData = {
      ...experiment,
      holdingPeriod: days,
      exit: {
        ...experiment.exit,
        days: days,
      },
    };

    const signalIndices = identifyEntries(datasetToUse, varExp.condition);
    const trades = generateTrades(datasetToUse, signalIndices, varExp);
    const avgReturn = calculateAverageReturn(trades);
    const winRate = calculateWinRate(trades);

    points.push({
      parameterName: "holdingPeriod",
      label: `${days}-day hold`,
      value: days,
      isCurrent: days === currentHolding,
      averageReturn: avgReturn,
      winRate: winRate,
      tradeCount: trades.length,
    });
  }

  const returns = points.map((p) => p.averageReturn);
  const allPositive = returns.every((r) => r > 0);
  const allNegative = returns.every((r) => r < 0);
  const isStable = allPositive || allNegative;

  let interpretation = "";
  if (isStable) {
    if (allPositive) {
      interpretation =
        "The direction of the result remains consistently positive across holding periods (3, 5, 10 days), indicating directional robustness across short-term holding horizons.";
    } else {
      interpretation =
        "The direction of the result remains consistently negative across holding periods (3, 5, 10 days), indicating persistent downward drift rather than immediate mean reversion.";
    }
  } else {
    interpretation =
      "The direction of the result changes across holding periods, so the conclusion is sensitive to the chosen evaluation window.";
  }

  return {
    parameterTested: "holdingPeriod",
    currentValueFormatted: `${currentHolding}-day hold (${(currentFriction * 100).toFixed(2)}% friction)`,
    points,
    interpretation,
    isStable,
  };
}
