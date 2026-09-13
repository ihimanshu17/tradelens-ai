"use client";

import { useMemo } from "react";
import { CanonicalExperiment } from "@/types/experiment";
import {
  evaluateResearchIntegrity,
  applyBaselineSelection,
  COMPARISON_BASELINE_OPTIONS,
} from "@/lib/research/integrity";
import { ComparisonBaselineOptionId } from "@/types/research";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Info,
  Clock,
  Check,
  Edit2,
  GitCompare,
} from "lucide-react";

interface ChallengeStageProps {
  canonicalExperiment: CanonicalExperiment;
  onUpdateCanonical: (updates: Partial<CanonicalExperiment>) => void;
  onProceedToDefine: () => void;
  onBackToClarify: () => void;
  isLoading?: boolean;
}

export function ChallengeStage({
  canonicalExperiment,
  onUpdateCanonical,
  onProceedToDefine,
  onBackToClarify,
  isLoading = false,
}: ChallengeStageProps) {
  // Purely derive assumption confirmation states from the canonical experiment specification
  const isTimingConfirmed = canonicalExperiment.assumptionProvenance?.timing === "USER CONFIRMED";
  const isFrictionConfirmed = canonicalExperiment.assumptionProvenance?.friction === "USER CONFIRMED";

  const isComparison =
    canonicalExperiment.experimentType === "comparison" &&
    !!canonicalExperiment.comparisons &&
    canonicalExperiment.comparisons.length >= 2;

  // Evaluate integrity against the canonical experiment specification - PURE with NO side effects
  const integrityResult = useMemo(() => {
    return evaluateResearchIntegrity(
      canonicalExperiment,
      canonicalExperiment.originalQuestion
    );
  }, [canonicalExperiment]);

  const isBaselineResolved =
    isComparison ||
    (!!canonicalExperiment.baselineType && canonicalExperiment.baselineType !== "absolute_return") ||
    canonicalExperiment.baselineType === "absolute_return" ||
    !integrityResult.missingComparisonBaseline;

  const baselineDisplayLabel = isComparison
    ? `Condition B: ${canonicalExperiment.comparisons![1].name}`
    : canonicalExperiment.baselineDescription ||
      (canonicalExperiment.baselineType
        ? canonicalExperiment.baselineType.replace(/_/g, " ")
        : integrityResult.missingComparisonBaseline
        ? "Pending user selection"
        : "Absolute return (no comparison baseline)");

  const baselineProvenanceTag: "USER PROVIDED" | "USER CONFIRMED" | "SYSTEM REQUIRED" = isComparison
    ? "USER PROVIDED"
    : canonicalExperiment.baselineType
    ? "USER CONFIRMED"
    : integrityResult.missingComparisonBaseline
    ? "SYSTEM REQUIRED"
    : "USER CONFIRMED";

  const handleSelectBaseline = (optionId: ComparisonBaselineOptionId) => {
    const updates = applyBaselineSelection(canonicalExperiment, optionId);
    onUpdateCanonical(updates);
  };

  const handleToggleConfirmAssumption = (key: "timing" | "friction") => {
    const isCurrentlyConfirmed = canonicalExperiment.assumptionProvenance?.[key] === "USER CONFIRMED";
    const nextProvenance: "USER CONFIRMED" | "AI SUGGESTED" = isCurrentlyConfirmed
      ? "AI SUGGESTED"
      : "USER CONFIRMED";

    const updatedProvenance = {
      ...canonicalExperiment.assumptionProvenance,
      [key]: nextProvenance,
    };
    onUpdateCanonical({ assumptionProvenance: updatedProvenance });
  };

  const handleConfirmAndProceed = () => {
    if (!integrityResult.canProceed) return;
    onProceedToDefine();
  };

  const currentThreshold = canonicalExperiment.threshold ?? canonicalExperiment.conditionThreshold ?? 2.0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Stage Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Stage 3: Research Integrity Check</span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {integrityResult.status === "READY" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>✓ READY</span>
              </span>
            )}
            {integrityResult.status === "NEEDS_REVIEW" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>⚠ NEEDS REVIEW</span>
              </span>
            )}
            {integrityResult.status === "BLOCKED" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400">
                <XCircle className="h-3.5 w-3.5" />
                <span>❌ BLOCKED</span>
              </span>
            )}
          </div>
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Challenge the Experiment
        </h2>
        <p className="mt-1 text-xs text-slate-400 max-w-2xl">
          Before we test the idea, let&apos;s check whether the proposed experiment is actually capable of answering the researcher&apos;s question.
        </p>
      </div>

      {/* COMPARISON EXPERIMENT ARCHITECTURE BANNER */}
      {isComparison && canonicalExperiment.comparisons && (
        <div className="mt-6 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-5 shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
            <GitCompare className="h-4 w-4" />
            <span>Comparison Experiment</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">
            This experiment tests two distinct market conditions under identical holding and execution rules to evaluate relative performance.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {/* Condition A Card */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-indigo-300">
                  Condition A
                </span>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/40">
                  PRIMARY
                </span>
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-100">
                {canonicalExperiment.comparisons[0].name}
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                {canonicalExperiment.comparisons[0].condition.description || canonicalExperiment.comparisons[0].name}
              </p>
            </div>

            {/* Condition B Card */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase text-amber-300">
                  Condition B
                </span>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/40">
                  REFERENCE
                </span>
              </div>
              <h4 className="mt-2 text-sm font-bold text-slate-100">
                {canonicalExperiment.comparisons[1].name}
              </h4>
              <p className="mt-1 text-xs text-slate-400">
                {canonicalExperiment.comparisons[1].condition.description || canonicalExperiment.comparisons[1].name}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
            <span className="font-semibold text-slate-300">Shared Parameters:</span>
            <span>Asset: <strong className="text-slate-200">{canonicalExperiment.instrument}</strong></span>
            <span>Holding: <strong className="text-slate-200">{canonicalExperiment.holdingPeriod} days</strong></span>
            <span>Entry: <strong className="text-slate-200">Next-day open</strong></span>
            <span>Exit: <strong className="text-slate-200">After holding period</strong></span>
            <span>Friction: <strong className="text-slate-200">{((canonicalExperiment.friction ?? 0.001) * 100).toFixed(2)}%</strong></span>
            <span>Lookback: <strong className="text-slate-200">{canonicalExperiment.lookbackPeriod ?? 5}y</strong></span>
          </div>
        </div>
      )}

      {/* COMPARISON BASELINE REQUIRED BANNER */}
      {integrityResult.missingComparisonBaseline && (
        <div className="mt-6 rounded-xl border border-amber-500/50 bg-amber-500/10 p-5 shadow-lg animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-amber-300 border border-amber-500/40">
                  ⚠ Comparison Baseline Missing
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-100">
                &ldquo;Your question asks whether returns are higher, but higher than what?&rdquo;
              </h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Evaluating whether an outcome is superior requires an authoritative comparison baseline. TradeLens will not silently invent a baseline. Select your intended reference below:
              </p>

              {/* Baseline Option Buttons */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {integrityResult.comparisonBaselineOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectBaseline(opt.id)}
                    className="group relative flex flex-col items-start rounded-lg border border-amber-500/30 bg-slate-900/90 p-3 text-left transition-all hover:border-amber-400 hover:bg-amber-950/20"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100">
                        {opt.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-amber-400 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                    </div>
                    <span className="mt-1 text-[11px] text-slate-400 leading-normal">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOCKING REASONS ALERT */}
      {integrityResult.status === "BLOCKED" && (
        <div className="mt-6 rounded-xl border border-rose-500/50 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Experiment Blocked: Logical Issue Detected
              </h4>
              <ul className="mt-1.5 list-disc list-inside space-y-1 text-xs text-slate-200">
                {integrityResult.blockingReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-rose-300/90">
                Please return to the Clarify stage to resolve contradictory or invalid parameters.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: RESEARCH INTEGRITY CHECKLIST */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Research Integrity Checklist ({integrityResult.score.passed}/{integrityResult.score.total} Passed)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {integrityResult.score.warnings > 0 && `${integrityResult.score.warnings} review`}
            {integrityResult.score.blocked > 0 && `, ${integrityResult.score.blocked} blocked`}
          </span>
        </div>

        <div className="mt-3 divide-y divide-slate-800/60">
          {integrityResult.checks.map((chk) => (
            <div
              key={chk.id}
              className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5">
                  {chk.status === "pass" && (
                    <Check className="h-4 w-4 text-emerald-400 stroke-[2.5]" />
                  )}
                  {chk.status === "warn" && (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  {chk.status === "block" && (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{chk.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      — {chk.currentValue}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{chk.message}</p>
                </div>
              </div>

              {chk.whyItMatters && (
                <div className="mt-1 pl-6.5 text-[10px] text-slate-500 italic sm:mt-0 sm:pl-0 sm:text-right max-w-xs">
                  {chk.whyItMatters}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: ASSUMPTION TRANSPARENCY & IMPACT */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Assumption Transparency & Impact
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Audit of AI vs User assumptions
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {/* Card 1: Entry Timing */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Entry Timing</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isTimingConfirmed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                }`}
              >
                {isTimingConfirmed ? "USER CONFIRMED" : "AI SUGGESTED"}
              </span>
            </div>
            <p className="text-xs font-mono text-emerald-400 font-semibold">
              Next trading day&apos;s open
            </p>
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Why it matters: </span>
              The trigger is determined from the previous trading day&apos;s close. Using that close for entry could introduce look-ahead bias. Next-day open execution ensures realistic simulation.
            </div>
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleConfirmAssumption("timing")}
                className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                {isTimingConfirmed ? "Undo Confirmation" : "Accept Assumption"}
              </button>
            </div>
          </div>

          {/* Card 2: Transaction Friction */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Transaction Costs</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isFrictionConfirmed
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                }`}
              >
                {isFrictionConfirmed ? "USER CONFIRMED" : "AI SUGGESTED"}
              </span>
            </div>
            <p className="text-xs font-mono text-amber-400 font-semibold">
              {((canonicalExperiment.friction ?? 0.001) * 100).toFixed(2)}% round trip
            </p>
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Why it matters: </span>
              Retail execution includes brokerage, STT/exchange fees, and slippage. Zero-cost assumptions produce deceptive illusions of edge.
            </div>
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleToggleConfirmAssumption("friction")}
                className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-slate-100"
              >
                {isFrictionConfirmed ? "Undo Confirmation" : "Accept Assumption"}
              </button>
            </div>
          </div>

          {/* Card 3: Holding Period */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Holding Period</span>
              <span className="rounded px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                USER CONFIRMED
              </span>
            </div>
            <p className="text-xs font-mono text-emerald-400 font-semibold">
              {canonicalExperiment.holdingPeriod} trading days
            </p>
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Why it matters: </span>
              A 3–5 day window captures short-term mean reversion while minimizing macro drift from earnings or monetary cycles.
            </div>
          </div>

          {/* Card 4: Baseline Specification */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Comparison Baseline</span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold ${
                  baselineProvenanceTag === "USER PROVIDED" || baselineProvenanceTag === "USER CONFIRMED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {baselineProvenanceTag}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-200 font-semibold">
              {baselineDisplayLabel}
            </p>
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Why it matters: </span>
              {isComparison
                ? "Condition B serves as the explicit comparison benchmark requested in your research question."
                : "Comparing against normal trading days prevents mistaking broad market drift for a strategy-specific edge."}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Actions */}
      <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-800 pt-5 sm:flex-row">
        <button
          type="button"
          onClick={onBackToClarify}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 sm:w-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>← Back to Clarify</span>
        </button>

        <button
          type="button"
          onClick={handleConfirmAndProceed}
          disabled={!integrityResult.canProceed || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto shadow-lg"
        >
          <span>Confirm Experiment Contract & Proceed →</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
