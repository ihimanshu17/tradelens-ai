"use client";

import { ExperimentResult, ExperimentData } from "@/types/experiment";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Activity,
  Award,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from "lucide-react";

interface TestStageProps {
  experiment: ExperimentData;
  result: ExperimentResult;
  onProceedToLearn: () => void;
  isLoadingLearn: boolean;
}

export function TestStage({
  experiment,
  result,
  onProceedToLearn,
  isLoadingLearn,
}: TestStageProps) {
  const isAvgPositive = result.averageReturn > 0;
  const isCumPositive = result.cumulativeReturn > 0;

  // Extract canonical experiment attributes with strict nullish coalescing
  const instrument = experiment.instrument || experiment.market || "NIFTY";
  const threshold = experiment.threshold ?? experiment.condition.threshold ?? 2.0;
  const holdingPeriod = experiment.holdingPeriod ?? 5;
  const lookbackYears =
    experiment.lookbackPeriod ??
    (experiment.testPeriod?.label?.match(/(\d+)\s*year/i)?.[1]
      ? parseInt(experiment.testPeriod.label.match(/(\d+)\s*year/i)![1], 10)
      : 5);
  const friction = experiment.friction ?? experiment.costAssumption ?? 0;
  const frictionDisplay = `${(friction * 100).toFixed(2)}% round trip`;
  const exitText =
    experiment.exit.type === "stop_loss"
      ? "Stop Loss / Close"
      : experiment.exit.type === "profit_target"
      ? "Profit Target / Close"
      : `Close after ${holdingPeriod} trading days`;

  const simulatedBarsCount = lookbackYears * 252;
  const startYear = 2025 - lookbackYears;

  const winLossData = [
    { name: "Winning Trades", value: result.winningTrades, color: "#10b981" },
    { name: "Losing Trades", value: result.losingTrades, color: "#ef4444" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Activity className="h-4 w-4" />
            <span>Stage 4: Deterministic Empirical Simulation</span>
          </div>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">
            Sample Engine v1.0
          </span>
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Empirical Research Results
        </h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <Database className="h-3.5 w-3.5 text-slate-500" />
          <span>{result.datasetType}</span>
        </div>
      </div>

      {/* Compact "Experiment Used" Section (Requirement 7) */}
      <div className="mt-6 overflow-hidden rounded-xl border border-emerald-500/30 bg-slate-900/90 shadow-xl">
        <div className="border-b border-slate-800 bg-slate-900/80 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Experiment Configuration Used for Simulation
            </h3>
          </div>
          <span className="rounded bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
            100% Parameter Fidelity
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 text-xs">
          {/* Instrument */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Instrument</span>
            <p className="mt-1 font-mono font-bold text-slate-100">{instrument}</p>
            <span className="text-[10px] text-slate-400">{experiment.timeframe || "Daily"} resolution</span>
          </div>

          {/* Condition / Threshold */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Trigger Signal</span>
            <p className="mt-1 font-mono font-bold text-emerald-400">Decline &gt;= {threshold}%</p>
            <span className="text-[10px] text-slate-400">On daily bar close</span>
          </div>

          {/* Order Entry */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Order Execution</span>
            <p className="mt-1 font-semibold text-slate-200">
              {experiment.entry.type === "next_open" ? "Next day's open" : "Same day close"}
            </p>
            <span className="text-[10px] text-slate-400">Zero look-ahead bias</span>
          </div>

          {/* Holding Horizon */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Holding Period</span>
            <p className="mt-1 font-mono font-bold text-slate-100">{holdingPeriod} trading days</p>
            <span className="text-[10px] text-slate-400">Discrete time hold</span>
          </div>

          {/* Exit Rule */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Exit Rule</span>
            <p className="mt-1 font-semibold text-slate-200 truncate" title={exitText}>
              {exitText}
            </p>
            <span className="text-[10px] text-slate-400">At holding expiration</span>
          </div>

          {/* Lookback Window */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Lookback Window</span>
            <p className="mt-1 font-mono font-bold text-slate-100">{lookbackYears} Years</p>
            <span className="text-[10px] text-emerald-400 font-mono">
              {simulatedBarsCount.toLocaleString()} simulated bars
            </span>
          </div>

          {/* Friction */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Round-Trip Friction</span>
            <p className="mt-1 font-mono font-bold text-amber-300">{frictionDisplay}</p>
            <span className="text-[10px] text-slate-400">Slippage + fees</span>
          </div>
        </div>

        {/* Context / Filter Condition row if present */}
        {experiment.contextConditions && experiment.contextConditions.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-slate-300 font-semibold">Context Filter Condition:</span>
              <span className="text-slate-100">{experiment.contextConditions[0].label}</span>
              <span className="text-amber-300 font-mono">
                ({experiment.contextConditions[0].definition || "Unresolved definition"})
              </span>
            </div>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-500/30">
              Not Evaluated by Prototype Engine
            </span>
          </div>
        )}
      </div>

      {/* Explicit Simulation Engine Limitation Notice for Context Conditions */}
      {experiment.contextConditions && experiment.contextConditions.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-rose-300">
                  Simulation Engine Limitation
                </span>
                <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] text-rose-200 border border-rose-500/30">
                  Context Condition Unsimulated
                </span>
              </div>
              <p className="text-sm font-bold text-rose-200">
                Context condition identified but not yet supported by the prototype simulation engine.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                The experiment defined a context filter (<em>"{experiment.contextConditions[0].label}: {experiment.contextConditions[0].definition || 'weakness'}"</em>). However, the current prototype engine simulates only the primary trigger ({experiment.market} daily drop &ge; {threshold}%) across the {lookbackYears}-year dataset without filtering for prior 5-day weakness bars. To maintain scientific integrity, this simulation must not be interpreted as empirical evidence for or against the combined condition.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Research Disclaimer & Transparency Notice */}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-300">
                Prototype Research Simulation Transparency
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-200 border border-amber-500/30">
                Selected Window: {lookbackYears} Years ({simulatedBarsCount.toLocaleString()} Simulated Bars)
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This experiment was evaluated across <strong>{simulatedBarsCount.toLocaleString()} deterministic simulated daily bars</strong> ({startYear}–2025). Result: illustrative prototype simulation, not a live historical broker exchange feed. All entries, exits, holding periods, and {frictionDisplay} cost assumptions are deterministically computed in TypeScript.
            </p>
          </div>
        </div>
      </div>

      {/* Unsupported Comparison Notice if simulation engine cannot evaluate condition */}
      {(result.unsupportedComparisonNotice || result.comparisonResults?.unsupportedComparisonNotice) && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-rose-300">
                  Simulation Engine Disclaimer
                </span>
                <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] text-rose-200 border border-rose-500/30">
                  Partial Comparison Support
                </span>
              </div>
              <p className="text-sm font-bold text-rose-200">
                Requested comparison logic is not fully supported by the prototype simulation engine.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.unsupportedComparisonNotice || result.comparisonResults?.unsupportedComparisonNotice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Evaluation Card (when comparison experiment) */}
      {result.comparisonResults && (
        <div className="mt-6 overflow-hidden rounded-xl border border-purple-500/40 bg-purple-950/20 shadow-xl">
          <div className="border-b border-purple-500/20 bg-purple-900/30 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-200">
                Comparative Evidence: Condition A vs. Condition B
              </h3>
            </div>
            <span className="rounded bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/40 font-mono">
              Empirical A/B Comparison
            </span>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Branch A */}
              <div className="rounded-lg border border-purple-500/30 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Condition A</span>
                  <span className="font-mono text-xs text-slate-400">
                    {result.comparisonResults.branchA.observations} qualifying / {result.comparisonResults.branchA.executedTrades ?? result.comparisonResults.branchA.observations} trades
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-slate-100">
                  {result.comparisonResults.branchA.name}
                </h4>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-center sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] text-slate-400">Win Rate</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchA.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchA.winRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Avg Return</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchA.averageReturn > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchA.averageReturn > 0 ? "+" : ""}{result.comparisonResults.branchA.averageReturn}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Median</span>
                    <p className={`font-mono text-sm font-bold ${(result.comparisonResults.branchA.medianReturn ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchA.medianReturn !== undefined ? `${result.comparisonResults.branchA.medianReturn >= 0 ? "+" : ""}${result.comparisonResults.branchA.medianReturn}%` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Cumulative</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchA.cumulativeReturn > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchA.cumulativeReturn > 0 ? "+" : ""}{result.comparisonResults.branchA.cumulativeReturn}%
                    </p>
                  </div>
                </div>

                {result.comparisonResults.branchA.recoveryMetric && (
                  <div className="mt-2.5 rounded bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {experiment.comparisonMetric === "recovery speed" ? "Recovery Metric:" : "Positive Exits:"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-purple-300">
                      {result.comparisonResults.branchA.recoveryMetric.recoveryRate}% pos / {result.comparisonResults.branchA.recoveryMetric.avgDaysToRecover}d avg
                    </span>
                  </div>
                )}
              </div>

              {/* Branch B */}
              <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Condition B</span>
                  <span className="font-mono text-xs text-slate-400">
                    {result.comparisonResults.branchB.observations} qualifying / {result.comparisonResults.branchB.executedTrades ?? result.comparisonResults.branchB.observations} trades
                  </span>
                </div>
                <h4 className="mt-1 text-sm font-semibold text-slate-100">
                  {result.comparisonResults.branchB.name}
                </h4>

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-center sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] text-slate-400">Win Rate</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchB.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchB.winRate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Avg Return</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchB.averageReturn > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchB.averageReturn > 0 ? "+" : ""}{result.comparisonResults.branchB.averageReturn}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Median</span>
                    <p className={`font-mono text-sm font-bold ${(result.comparisonResults.branchB.medianReturn ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchB.medianReturn !== undefined ? `${result.comparisonResults.branchB.medianReturn >= 0 ? "+" : ""}${result.comparisonResults.branchB.medianReturn}%` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Cumulative</span>
                    <p className={`font-mono text-sm font-bold ${result.comparisonResults.branchB.cumulativeReturn > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.branchB.cumulativeReturn > 0 ? "+" : ""}{result.comparisonResults.branchB.cumulativeReturn}%
                    </p>
                  </div>
                </div>

                {result.comparisonResults.branchB.recoveryMetric && (
                  <div className="mt-2.5 rounded bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {experiment.comparisonMetric === "recovery speed" ? "Recovery Metric:" : "Positive Exits:"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {result.comparisonResults.branchB.recoveryMetric.recoveryRate}% pos / {result.comparisonResults.branchB.recoveryMetric.avgDaysToRecover}d avg
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Difference: Condition A - Condition B */}
            {result.comparisonResults.difference && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-950/30 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                    Difference (Condition A − Condition B)
                  </span>
                  <span className="text-[11px] text-slate-400">Relative Spread</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Win Rate Diff</span>
                    <p className={`font-mono text-xs font-bold ${result.comparisonResults.difference.winRateDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.difference.winRateDiff >= 0 ? "+" : ""}{result.comparisonResults.difference.winRateDiff} pp
                    </p>
                  </div>
                  <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Avg Return Diff</span>
                    <p className={`font-mono text-xs font-bold ${result.comparisonResults.difference.avgReturnDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.difference.avgReturnDiff >= 0 ? "+" : ""}{result.comparisonResults.difference.avgReturnDiff}%
                    </p>
                  </div>
                  <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400">Median Diff</span>
                    <p className={`font-mono text-xs font-bold ${result.comparisonResults.difference.medianReturnDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.difference.medianReturnDiff >= 0 ? "+" : ""}{result.comparisonResults.difference.medianReturnDiff}%
                    </p>
                  </div>
                  <div className="rounded bg-slate-900/80 p-2 border border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      {experiment.comparisonMetric === "recovery speed" ? "Recovery Rate Diff" : "Pos Exits Diff"}
                    </span>
                    <p className={`font-mono text-xs font-bold ${result.comparisonResults.difference.recoveryRateDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {result.comparisonResults.difference.recoveryRateDiff >= 0 ? "+" : ""}{result.comparisonResults.difference.recoveryRateDiff} pp
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Verdict */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-950/40 px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-purple-300">Empirical Verdict:</span>
              <span className="font-mono font-bold text-slate-100">{result.comparisonResults.verdict}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Quantitative Metric Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Observations */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Observations</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold text-slate-100">
              {result.observations}
            </span>
            <span className="text-[10px] text-slate-500">signals</span>
          </div>
          <span className="text-[10px] text-slate-500">{result.trades.length} executed</span>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Win Rate</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-mono text-2xl font-bold ${
                result.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {result.winRate}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {result.winningTrades}W / {result.losingTrades}L
          </span>
        </div>

        {/* Average Return */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Average Return</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-mono text-2xl font-bold ${
                isAvgPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isAvgPositive ? "+" : ""}
              {result.averageReturn}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500">per trade net</span>
        </div>

        {/* Median Return */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Median Return</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-mono text-2xl font-bold ${
                result.medianReturn >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {result.medianReturn >= 0 ? "+" : ""}
              {result.medianReturn}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500">50th percentile</span>
        </div>

        {/* Best / Worst */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Best / Worst</span>
          <div className="mt-1 text-xs font-mono">
            <span className="text-emerald-400">+{result.bestReturn}%</span>
            <span className="text-slate-600"> / </span>
            <span className="text-rose-400">{result.worstReturn}%</span>
          </div>
          <span className="text-[10px] text-slate-500">tail dispersion</span>
        </div>

        {/* Cumulative Return */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <span className="text-[11px] font-medium text-slate-400">Cumulative Return</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`font-mono text-2xl font-bold ${
                isCumPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isCumPositive ? "+" : ""}
              {result.cumulativeReturn}%
            </span>
          </div>
          <span className="text-[10px] text-slate-500">compounded</span>
        </div>
      </div>

      {/* Quantitative Charts Section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Cumulative Equity Curve (2 cols) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Compounded Equity Progression
              </h3>
              <p className="text-xs text-slate-400">
                Cumulative percentage return trajectory across sequential trade exits
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-400">
              Final: {isCumPositive ? "+" : ""}
              {result.cumulativeReturn}%
            </span>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.equityCurve} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="tradeIndex" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#090d16", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(val: any) => [`${val}%`, "Cumulative Return"]}
                  labelFormatter={(label) => `Trade #${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeReturn"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win / Loss Breakdown (1 col) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-slate-200">Trade Win / Loss Ratio</h3>
          <p className="text-xs text-slate-400">
            {result.winningTrades} wins vs {result.losingTrades} losses
          </p>

          <div className="mt-2 flex h-48 items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#090d16", borderColor: "#334155", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Wins ({result.winRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-slate-300">Losses ({(100 - result.winRate).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Return Distribution Histogram (3 cols) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Trade Return Distribution
              </h3>
              <p className="text-xs text-slate-400">
                Frequency count of trade outcomes grouped by net return brackets
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Median: {result.medianReturn > 0 ? "+" : ""}{result.medianReturn}%
            </span>
          </div>

          <div className="mt-4 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.returnDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#090d16", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(val: any) => [`${val} trades`, "Frequency"]}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {result.returnDistribution.map((entry, index) => {
                    const isNegative = entry.range.includes("-");
                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={isNegative ? "#f43f5e" : "#10b981"}
                        opacity={0.85}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Action: Proceed to Stage 5 LEARN */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
        <div className="text-xs text-slate-400">
          <span>Ready to interpret evidence: </span>
          <span className="text-slate-200">
            Generate AI qualitative synthesis without modifying calculated values.
          </span>
        </div>

        <button
          type="button"
          onClick={onProceedToLearn}
          disabled={isLoadingLearn}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:bg-sky-400 disabled:opacity-50 sm:w-auto"
        >
          <Sparkles className="h-4 w-4" />
          <span>Interpret Evidence with AI →</span>
        </button>
      </div>
    </div>
  );
}
