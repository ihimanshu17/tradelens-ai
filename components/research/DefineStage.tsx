"use client";

import { ExperimentData, validateAndEnforceHypothesisFidelity } from "@/types/experiment";
import { Play, Edit3, CheckCircle2, ShieldCheck, Database, Calendar, Tag, Percent, Clock, Loader2, GitCompare, Filter } from "lucide-react";

interface DefineStageProps {
  experiment: ExperimentData;
  onRunTest: () => void;
  onEdit: () => void;
  isLoading: boolean;
}

export function DefineStage({ experiment, onRunTest, onEdit, isLoading }: DefineStageProps) {
  const friction = experiment.friction ?? experiment.costAssumption ?? 0;
  const frictionDisplay = `${(friction * 100).toFixed(2)}% round trip`;
  const isComparison = experiment.experimentType === "comparison" && !!experiment.comparisons && experiment.comparisons.length >= 2;

  // Requirement 6: Development-time validation & enforcement before rendering
  // If there is any mismatch between the hypothesis and canonical experiment specification,
  // regenerate dynamically from the canonical experiment specification.
  const displayHypothesis = validateAndEnforceHypothesisFidelity(experiment);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Stage Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Stage 4: Authoritative Experiment Contract</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Research Integrity: READY</span>
          </div>
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Experiment Contract
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          This canonical contract is the single source of truth. The deterministic calculation engine will execute using exactly these verified parameters.
        </p>
      </div>

      {/* Authoritative Experiment Contract Box */}
      <div className="mt-6 rounded-xl border border-teal-500/40 bg-slate-900/90 p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-300">
              EXPERIMENT CONTRACT
            </span>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
            Status: READY
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Question</span>
            <p className="mt-0.5 text-slate-200 font-medium italic">&ldquo;{experiment.originalQuestion || "N/A"}&rdquo;</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Instrument</span>
            <p className="mt-0.5 text-slate-100 font-mono font-bold">{experiment.instrument || experiment.market}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Timeframe</span>
            <p className="mt-0.5 text-slate-200 font-mono">{experiment.timeframe.toUpperCase()} bars</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Trigger</span>
            <p className="mt-0.5 text-emerald-400 font-mono font-medium">
              {isComparison
                ? `${experiment.comparisons?.[0]?.name} vs. ${experiment.comparisons?.[1]?.name}`
                : experiment.condition.description}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Entry Timing</span>
            <p className="mt-0.5 text-slate-200 font-mono">{experiment.entry.description} (0 look-ahead bias)</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Holding Period</span>
            <p className="mt-0.5 text-emerald-400 font-mono font-bold">{experiment.holdingPeriod} trading days</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Exit Rule</span>
            <p className="mt-0.5 text-slate-200 font-mono">{experiment.exit.description}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Test Window</span>
            <p className="mt-0.5 text-slate-200 font-mono">{experiment.testPeriod.label}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Transaction Cost</span>
            <p className="mt-0.5 text-amber-400 font-mono font-bold">{frictionDisplay}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Primary Metric</span>
            <p className="mt-0.5 text-slate-200 font-mono">{experiment.comparisonMetric || "Average return"}</p>
          </div>
          {(experiment.baselineDescription || isComparison) && (
            <div className="sm:col-span-2 rounded bg-purple-950/20 border border-purple-500/30 p-2.5">
              <span className="text-[10px] uppercase tracking-wider text-purple-300 font-semibold">Comparison Baseline</span>
              <p className="mt-0.5 text-slate-200 font-mono text-xs">
                {experiment.baselineDescription || experiment.comparisons?.[1]?.name || "Standard benchmark"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Parameters Breakdown Card */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-2xl">
        {/* Card Header */}
        <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Detailed Parameter Set
              </span>
              <h3 className="text-lg font-bold text-slate-100">
                {isComparison
                  ? `${experiment.market} — Comparative Study (${experiment.comparisonMetric || "5-day return"}): ${experiment.comparisons?.[0]?.name ?? "Condition A"} vs. ${experiment.comparisons?.[1]?.name ?? "Condition B"}`
                  : `${experiment.market} — ${experiment.condition.description}`}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300 border border-slate-700">
                {experiment.timeframe.toUpperCase()}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/30">
                {experiment.testPeriod.label}
              </span>
            </div>
          </div>
        </div>

        {/* Specification Grid */}
        <div className="grid divide-y divide-slate-800/80 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
          {/* Left Column: Market & Conditions */}
          <div className="space-y-4 p-6">
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Database className="h-3.5 w-3.5" />
                Market & Instrument
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {experiment.market} ({experiment.timeframe} bar resolution)
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Tag className="h-3.5 w-3.5" />
                {isComparison ? "Comparative Entry Triggers" : "Primary Entry Trigger"}
              </span>
              <p className="mt-1 text-sm font-semibold text-emerald-400 font-mono">
                {isComparison
                  ? `${experiment.comparisons?.[0]?.name} vs. ${experiment.comparisons?.[1]?.name}`
                  : experiment.condition.description}
              </p>
              <p className="text-xs text-slate-400">
                {isComparison
                  ? "Both signal conditions evaluated independently on daily bar close."
                  : "Evaluated on daily bar close before order placement."}
              </p>
            </div>

            {/* Context / Filter Condition Card */}
            {experiment.contextConditions && experiment.contextConditions.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  <Filter className="h-3.5 w-3.5" />
                  Context / Filter Condition
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {experiment.contextConditions[0].label}
                </p>
                <div className="mt-1.5 flex flex-col gap-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Quantified Definition:</span>
                    <span className="font-mono text-amber-300 font-medium">
                      {experiment.contextConditions[0].definition || "Unresolved (pending definition)"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Source text: <em>"{experiment.contextConditions[0].rawPhrase}"</em>
                  </span>
                </div>
              </div>
            )}

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Play className="h-3.5 w-3.5" />
                Order Execution
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {experiment.entry.description}
              </p>
              <p className="text-xs text-slate-500">
                Prevents look-ahead bias by entering on market open of t+1.
              </p>
            </div>
          </div>

          {/* Right Column: Exit, Horizons, & Costs */}
          <div className="space-y-4 p-6">
            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                Holding Period & Exit
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {experiment.holdingPeriod} trading days
              </p>
              <p className="text-xs text-slate-400 font-medium">
                {experiment.exit.description}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Percent className="h-3.5 w-3.5" />
                Friction & Transaction Cost
              </span>
              <p className="mt-1 font-mono text-sm font-semibold text-amber-400">
                {frictionDisplay}
              </p>
              <p className="text-xs text-slate-500">
                Brokerage, exchange turnover charges, and expected slippage.
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                Test Window
              </span>
              <p className="mt-1 text-sm font-semibold text-slate-200 font-mono">
                {experiment.testPeriod.label}
              </p>
              <p className="text-xs text-slate-500">
                Deterministic sample window evaluation.
              </p>
            </div>
          </div>
        </div>

        {/* Comparative Research Conditions (if A vs B) */}
        {isComparison && experiment.comparisons && (
          <div className="border-t border-slate-800 bg-slate-950/40 p-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
              <GitCompare className="h-4 w-4" />
              <span>Comparative Research Design (Condition A vs. Condition B)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Both conditions will be independently simulated across the identical {experiment.testPeriod.label} test window, {experiment.holdingPeriod}-day holding horizon, and {frictionDisplay} friction assumption.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">Condition A</span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono text-purple-300">
                    Primary Branch
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {experiment.comparisons[0].name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 font-mono">
                  Trigger: {experiment.comparisons[0].condition.description} (≥{experiment.comparisons[0].condition.threshold}%)
                </p>
              </div>

              <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Condition B</span>
                  <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    Baseline Comparison
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  {experiment.comparisons[1].name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400 font-mono">
                  Trigger: {experiment.comparisons[1].condition.description} (≥{experiment.comparisons[1].condition.threshold}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hypothesis Statement */}
        <div className="border-t border-slate-800 bg-slate-950/60 p-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Formulated Hypothesis
          </span>
          <p className="mt-1.5 text-sm italic leading-relaxed text-slate-200 font-serif">
            "{displayHypothesis}"
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 sm:w-auto"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Edit Parameters</span>
        </button>

        <button
          type="button"
          onClick={onRunTest}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition-all hover:bg-emerald-400 disabled:opacity-50 sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>Run Experiment →</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}