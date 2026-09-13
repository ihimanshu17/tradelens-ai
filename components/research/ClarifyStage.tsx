import { useState, useEffect } from "react";
import { AnalysisResult } from "@/types/research";
import { CanonicalExperiment, ComparisonBranch, generateHypothesis } from "@/types/experiment";
import { AlertTriangle, Sparkles, Check, ArrowRight, ShieldAlert, Filter } from "lucide-react";

interface ClarifyStageProps {
  analysis: AnalysisResult;
  canonicalExperiment: CanonicalExperiment;
  onUpdateCanonical: (updates: Partial<CanonicalExperiment>) => void;
  onProceedToDefine: () => void;
  isLoading: boolean;
}

export function ClarifyStage({
  analysis,
  canonicalExperiment,
  onUpdateCanonical,
  onProceedToDefine,
  isLoading,
}: ClarifyStageProps) {
  const currentThreshold = canonicalExperiment.threshold ?? canonicalExperiment.conditionThreshold ?? 2.0;
  const isPresetThreshold = [1.0, 2.0, 3.0].includes(currentThreshold);
  const [customThreshold, setCustomThreshold] = useState<string>(
    isPresetThreshold ? "" : currentThreshold.toString()
  );
  const [isCustomThreshold, setIsCustomThreshold] = useState(!isPresetThreshold);
  const [customHolding, setCustomHolding] = useState<string>("");
  const [isCustomHolding, setIsCustomHolding] = useState(false);

  // Synchronize state on experiment changes to eliminate any stale state leakage
  useEffect(() => {
    const isPreset = [1.0, 2.0, 3.0].includes(currentThreshold);
    setIsCustomThreshold(!isPreset);
    setCustomThreshold(isPreset ? "" : currentThreshold.toString());
    const isPresetHold = [1, 3, 5, 10].includes(canonicalExperiment.holdingPeriod);
    setIsCustomHolding(!isPresetHold);
    setCustomHolding(isPresetHold ? "" : canonicalExperiment.holdingPeriod.toString());
  }, [canonicalExperiment.originalQuestion, currentThreshold, canonicalExperiment.holdingPeriod]);

  // Contextual condition (e.g. prior period weakness) state
  const weaknessContext = canonicalExperiment.contextConditions?.find(
    (c) => c.type === "prior_period_weakness"
  );
  const [customWeakness, setCustomWeakness] = useState<string>(weaknessContext?.customDefinition || "");
  const [isCustomWeakness, setIsCustomWeakness] = useState(weaknessContext?.selectedOptionId === "custom");

  const handleSelectThreshold = (val: number) => {
    setIsCustomThreshold(false);
    const updatedComparisons = canonicalExperiment.comparisons?.map((c) => ({
      ...c,
      condition: { ...c.condition, threshold: val },
    })) as [ComparisonBranch, ComparisonBranch] | undefined;

    onUpdateCanonical({
      conditionThreshold: val,
      threshold: val,
      comparisons: updatedComparisons,
      hypothesis: generateHypothesis({
        instrument: canonicalExperiment.instrument,
        conditionThreshold: val,
        threshold: val,
        holdingPeriod: canonicalExperiment.holdingPeriod,
        experimentType: canonicalExperiment.experimentType,
        comparisons: updatedComparisons,
        contextConditions: canonicalExperiment.contextConditions,
        comparisonMetric: canonicalExperiment.comparisonMetric,
      }),
    });
  };

  const handleCustomThresholdChange = (valStr: string) => {
    setCustomThreshold(valStr);
    setIsCustomThreshold(true);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      const updatedComparisons = canonicalExperiment.comparisons?.map((c) => ({
        ...c,
        condition: { ...c.condition, threshold: parsed },
      })) as [ComparisonBranch, ComparisonBranch] | undefined;

      onUpdateCanonical({
        conditionThreshold: parsed,
        threshold: parsed,
        comparisons: updatedComparisons,
        hypothesis: generateHypothesis({
          instrument: canonicalExperiment.instrument,
          conditionThreshold: parsed,
          threshold: parsed,
          holdingPeriod: canonicalExperiment.holdingPeriod,
          experimentType: canonicalExperiment.experimentType,
          comparisons: updatedComparisons,
          contextConditions: canonicalExperiment.contextConditions,
          comparisonMetric: canonicalExperiment.comparisonMetric,
        }),
      });
    }
  };

  const handleSelectWeakness = (optId: string, label: string) => {
    setIsCustomWeakness(false);
    const updatedContexts = canonicalExperiment.contextConditions?.map((c) =>
      c.type === "prior_period_weakness"
        ? { ...c, isResolved: true, definition: label, selectedOptionId: optId, customDefinition: undefined }
        : c
    );
    onUpdateCanonical({
      contextConditions: updatedContexts,
      hypothesis: generateHypothesis({
        instrument: canonicalExperiment.instrument,
        conditionThreshold: currentThreshold,
        threshold: currentThreshold,
        holdingPeriod: canonicalExperiment.holdingPeriod,
        experimentType: canonicalExperiment.experimentType,
        comparisons: canonicalExperiment.comparisons,
        contextConditions: updatedContexts,
        comparisonMetric: canonicalExperiment.comparisonMetric,
      }),
    });
  };

  const handleCustomWeaknessChange = (valStr: string) => {
    setCustomWeakness(valStr);
    setIsCustomWeakness(true);
    const updatedContexts = canonicalExperiment.contextConditions?.map((c) =>
      c.type === "prior_period_weakness"
        ? {
            ...c,
            isResolved: valStr.trim().length > 0,
            definition: valStr.trim() || undefined,
            selectedOptionId: "custom",
            customDefinition: valStr,
          }
        : c
    );
    onUpdateCanonical({
      contextConditions: updatedContexts,
      hypothesis: generateHypothesis({
        instrument: canonicalExperiment.instrument,
        conditionThreshold: currentThreshold,
        threshold: currentThreshold,
        holdingPeriod: canonicalExperiment.holdingPeriod,
        experimentType: canonicalExperiment.experimentType,
        comparisons: canonicalExperiment.comparisons,
        contextConditions: updatedContexts,
        comparisonMetric: canonicalExperiment.comparisonMetric,
      }),
    });
  };

  const handleSelectHolding = (val: number) => {
    setIsCustomHolding(false);
    onUpdateCanonical({
      holdingPeriod: val,
      hypothesis: generateHypothesis({
        instrument: canonicalExperiment.instrument,
        conditionThreshold: currentThreshold,
        threshold: currentThreshold,
        holdingPeriod: val,
        experimentType: canonicalExperiment.experimentType,
        comparisons: canonicalExperiment.comparisons,
        contextConditions: canonicalExperiment.contextConditions,
        comparisonMetric: canonicalExperiment.comparisonMetric,
      }),
    });
  };

  const handleCustomHoldingChange = (valStr: string) => {
    setCustomHolding(valStr);
    setIsCustomHolding(true);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateCanonical({
        holdingPeriod: parsed,
        hypothesis: generateHypothesis({
          instrument: canonicalExperiment.instrument,
          conditionThreshold: currentThreshold,
          threshold: currentThreshold,
          holdingPeriod: parsed,
          experimentType: canonicalExperiment.experimentType,
          comparisons: canonicalExperiment.comparisons,
          contextConditions: canonicalExperiment.contextConditions,
          comparisonMetric: canonicalExperiment.comparisonMetric,
        }),
      });
    }
  };

  const handleSelectExit = (rule: "holding_period" | "stop_loss" | "profit_target") => {
    onUpdateCanonical({ exitRule: rule });
  };

  const handleSelectLookback = (years: number) => {
    onUpdateCanonical({ lookbackPeriod: years });
  };

  const handleFrictionChange = (val: number) => {
    onUpdateCanonical({ friction: val });
  };

  // Filter missing information to avoid self-contradictions
  const visibleMissingInfo = (analysis.missingInformation || []).filter((item) => {
    const it = item.toLowerCase();
    // If threshold is already defined or extracted from query, never display "Missing threshold"
    if (it.includes("threshold") || it.includes("down day")) {
      return !analysis.hasExplicitThreshold && !canonicalExperiment.threshold;
    }
    // If holding period is set and positive, never display "Missing holding duration"
    if (it.includes("holding") || it.includes("horizon")) {
      return !canonicalExperiment.holdingPeriod || canonicalExperiment.holdingPeriod <= 0;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          <span>Stage 2: Ambiguity Resolution & Assumption Framing</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Clarifying the Research Hypothesis
        </h2>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 border border-slate-800">
          <span className="font-semibold text-slate-400">Original Question:</span>
          <span className="italic text-emerald-300">"{canonicalExperiment.originalQuestion}"</span>
        </div>
      </div>

      {/* Ambiguity & Parameter Requirements Banner */}
      <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="w-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-300">
                {canonicalExperiment.experimentType === "comparison"
                  ? "Comparative Research Design: Resolving Ambiguities"
                  : analysis.hasExplicitThreshold
                  ? "Experiment Specification: Additional Parameters Required"
                  : "Explicit Quantitative Parameters Required"}
              </h3>
              <div className="flex items-center gap-2">
                {canonicalExperiment.experimentType === "comparison" && (
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-mono font-medium text-purple-300 border border-purple-500/30">
                    Condition A vs. Condition B
                  </span>
                )}
                {analysis.hasExplicitThreshold ? (
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                    Threshold defined: {canonicalExperiment.conditionThreshold}% (Extracted from query)
                  </span>
                ) : (
                  <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">
                    Threshold defined: {canonicalExperiment.conditionThreshold}% (User defined)
                  </span>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {analysis.ambiguitySummary}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {canonicalExperiment.experimentType === "comparison" && (
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-200 border border-purple-500/30">
                  Comparative alignment: Identical threshold, horizon, and friction applied to both branches
                </span>
              )}
              {analysis.hasExplicitThreshold ? (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">
                  ✓ Drop threshold: {canonicalExperiment.conditionThreshold}% (Extracted from query)
                </span>
              ) : (
                <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">
                  ✓ Drop threshold: {canonicalExperiment.conditionThreshold}% (User confirmed)
                </span>
              )}
              {visibleMissingInfo.map((item, i) => (
                <span
                  key={i}
                  className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200 border border-amber-500/30"
                >
                  Missing: {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Clarification Modules */}
      <div className="mt-8 space-y-6">
        {/* 1. Condition Threshold */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">
                {canonicalExperiment.experimentType === "comparison"
                  ? `1. Qualifying Decline Threshold for "Down Day" (Applies to both conditions: ${canonicalExperiment.conditionThreshold}%)`
                  : analysis.hasExplicitThreshold
                  ? `1. Entry Condition Threshold (Defined in question: ${canonicalExperiment.conditionThreshold}%)`
                  : analysis.detectedAmbiguousPhrase
                  ? `1. We need to define "${analysis.detectedAmbiguousPhrase}"`
                  : "1. Entry Condition Threshold"}
              </h3>
              {analysis.hasExplicitThreshold && (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/30">
                  Extracted from query
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">Condition Threshold</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {analysis.hasExplicitThreshold
              ? `Your question specified a ${canonicalExperiment.conditionThreshold}% single-day decline. You may confirm or customize this threshold below:`
              : analysis.detectedAmbiguousPhrase
              ? `What daily percentage decline should qualify as a "${analysis.detectedAmbiguousPhrase}"?`
              : "What daily percentage decline should trigger an entry signal?"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "1% or more in one day", val: 1.0 },
              { label: "2% or more in one day", val: 2.0 },
              { label: "3% or more in one day", val: 3.0 },
            ].map((opt) => {
              const isSelected = !isCustomThreshold && canonicalExperiment.conditionThreshold === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleSelectThreshold(opt.val)}
                  className={`relative flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xs font-medium">{opt.label}</span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom option */}
            <div
              className={`flex flex-col justify-between rounded-lg border p-2.5 transition-all ${
                isCustomThreshold
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-slate-800 bg-slate-900/80"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCustomThreshold(true)}
                className="text-left text-xs font-medium text-slate-300"
              >
                Custom Drop %
              </button>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={customThreshold}
                placeholder="e.g. 2.5"
                onFocus={() => setIsCustomThreshold(true)}
                onChange={(e) => handleCustomThresholdChange(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 1B. Context / Filter Condition: Market Weakness Definition */}
        {weaknessContext && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  1B. Context / Filter: Define "Weak" during Previous {weaknessContext.period ?? 5} Trading Days
                </h3>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                  weaknessContext.isResolved
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                }`}
              >
                {weaknessContext.isResolved ? "Resolved" : "Requires Definition"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              The phrase <em>"{weaknessContext.rawPhrase}"</em> is ambiguous. How should "weakness" over the prior {weaknessContext.period ?? 5} trading days be quantified?
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                {
                  id: "w_ret",
                  label: `Net return over previous ${weaknessContext.period ?? 5} days <= -2%`,
                  desc: `Cumulative return over previous ${weaknessContext.period ?? 5} trading sessions is <= -2.0%`,
                },
                {
                  id: "w_count",
                  label: `At least ${Math.ceil((weaknessContext.period ?? 5) * 0.6)} of previous ${weaknessContext.period ?? 5} days were negative`,
                  desc: `Majority of the previous ${weaknessContext.period ?? 5} days closed lower`,
                },
                {
                  id: "w_trend",
                  label: `Previous ${weaknessContext.period ?? 5}-day trend was negative`,
                  desc: `Price was trading below its ${weaknessContext.period ?? 5}-day moving trend before trigger`,
                },
              ].map((opt) => {
                const isSelected =
                  !isCustomWeakness &&
                  (weaknessContext.selectedOptionId === opt.id || weaknessContext.definition === opt.label);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectWeakness(opt.id, opt.label)}
                    className={`relative flex flex-col items-start justify-between rounded-lg border p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/50"
                        : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="pr-6">
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <p className="mt-1 text-[11px] text-slate-400">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <span className="absolute top-3 right-3 text-emerald-400">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Custom definition option */}
              <div
                className={`flex flex-col justify-between rounded-lg border p-3 transition-all ${
                  isCustomWeakness
                    ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                    : "border-slate-800 bg-slate-900/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsCustomWeakness(true)}
                    className="text-left text-xs font-semibold text-slate-200"
                  >
                    Custom Definition
                  </button>
                  {isCustomWeakness && customWeakness.trim().length > 0 && (
                    <span className="text-emerald-400">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">Specify your own quantitative rule</p>
                <input
                  type="text"
                  value={customWeakness}
                  placeholder="e.g. Previous 5 days RSI < 35"
                  onFocus={() => setIsCustomWeakness(true)}
                  onChange={(e) => handleCustomWeaknessChange(e.target.value)}
                  className="mt-2 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Holding Period */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              {canonicalExperiment.experimentType === "comparison"
                ? `2. How Should Recovery Speed Be Measured? (Evaluation Horizon: ${canonicalExperiment.holdingPeriod} Days)`
                : "2. Holding Period"}
            </h3>
            <span className="text-xs text-slate-500">Evaluation Window</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {canonicalExperiment.experimentType === "comparison"
              ? "Across how many trading days should post-signal returns and recovery trajectory be compared for both Condition A and Condition B?"
              : "How many trading days should the position be maintained?"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              { label: "1 trading day", val: 1 },
              { label: "3 trading days", val: 3 },
              { label: "5 trading days (1 week)", val: 5 },
              { label: "10 trading days (2 weeks)", val: 10 },
            ].map((opt) => {
              const isSelected = !isCustomHolding && canonicalExperiment.holdingPeriod === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => handleSelectHolding(opt.val)}
                  className={`relative flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-all ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <span className="text-xs font-medium">{opt.label}</span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Custom holding */}
            <div
              className={`flex flex-col justify-between rounded-lg border p-2.5 transition-all ${
                isCustomHolding
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50"
                  : "border-slate-800 bg-slate-900/80"
              }`}
            >
              <button
                type="button"
                onClick={() => setIsCustomHolding(true)}
                className="text-left text-xs font-medium text-slate-300"
              >
                Custom Days
              </button>
              <input
                type="number"
                min="1"
                max="60"
                value={customHolding}
                placeholder="e.g. 7"
                onFocus={() => setIsCustomHolding(true)}
                onChange={(e) => handleCustomHoldingChange(e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Exit Rule & Friction */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Exit Rule */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200">3. Exit Rule</h3>
            <p className="mt-1 text-xs text-slate-400">
              When should profits or losses be realized?
            </p>
            <div className="mt-3 space-y-2">
              {[
                { id: "holding_period", label: "After holding period (time-based)" },
                { id: "stop_loss", label: "Stop loss (2.0% maximum risk cap)" },
                { id: "profit_target", label: "Profit target (3.0% upside target)" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectExit(opt.id as any)}
                  className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition-all ${
                    canonicalExperiment.exitRule === opt.id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span>{opt.label}</span>
                  {canonicalExperiment.exitRule === opt.id && (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Test Window & Friction */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200">4. Test Window & Cost</h3>
            <p className="mt-1 text-xs text-slate-400">
              Sample period and execution friction
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400">
                  Sample Lookback Period:
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => handleSelectLookback(yrs)}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-all ${
                        canonicalExperiment.lookbackPeriod === yrs
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/50"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {yrs} Years
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Round-Trip Friction:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {(canonicalExperiment.friction * 100).toFixed(2)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.003"
                  step="0.0005"
                  value={canonicalExperiment.friction}
                  onChange={(e) => handleFrictionChange(parseFloat(e.target.value))}
                  className="mt-2 w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (Frictionless)</span>
                  <span>0.10% (Retail)</span>
                  <span>0.30% (High Slippage)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proposed Assumptions Section (Reflects current active parameters) */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-sky-200">Active Experiment Assumptions</h3>
            </div>
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/30">
              User Confirmed
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            These assumptions form your canonical experiment specification. User selections explicitly override AI suggestions.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-medium">
                <span>Drop threshold = {canonicalExperiment.conditionThreshold}%</span>
                <span className="text-[10px] text-emerald-400 font-mono">Authoritative</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Trigger condition evaluated on daily close.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-medium">
                <span>Holding period = {canonicalExperiment.holdingPeriod} trading days</span>
                <span className="text-[10px] text-emerald-400 font-mono">Authoritative</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Position evaluated at market close on day {canonicalExperiment.holdingPeriod}.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-medium">
                <span>Entry = next trading day's open</span>
                <span className="text-[10px] text-sky-400 font-mono">AI suggested</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Prevents look-ahead bias by entering on market open of t+1.
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-medium">
                <span>Friction = {(canonicalExperiment.friction * 100).toFixed(2)}% round trip</span>
                <span className="text-[10px] text-emerald-400 font-mono">Authoritative</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Round-trip transaction costs and execution slippage.
              </p>
            </div>

            {weaknessContext && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs sm:col-span-2">
                <div className="flex items-center justify-between text-amber-200 font-medium">
                  <span>Context / Filter: Previous {weaknessContext.period ?? 5} trading days market weakness</span>
                  <span className={`text-[10px] font-mono ${weaknessContext.isResolved ? "text-emerald-400" : "text-amber-400 font-bold"}`}>
                    {weaknessContext.isResolved ? "User Defined" : "Requires Definition"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300 font-mono">
                  {weaknessContext.definition
                    ? `Rule: ${weaknessContext.definition}`
                    : "Unresolved: select an assumption in section 1B to define weakness"}
                </p>
              </div>
            )}

            {canonicalExperiment.experimentType === "comparison" && canonicalExperiment.comparisons && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3 text-xs sm:col-span-2">
                <div className="flex items-center justify-between text-purple-200 font-medium">
                  <span>Comparative Structure: Condition A ({canonicalExperiment.comparisons[0].name}) VS Condition B ({canonicalExperiment.comparisons[1].name})</span>
                  <span className="text-[10px] text-purple-400 font-mono">Comparative</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Both branches will be tested concurrently under the exact same {canonicalExperiment.conditionThreshold}% threshold, {canonicalExperiment.holdingPeriod}-day hold, and {(canonicalExperiment.friction * 100).toFixed(2)}% cost rules.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stage Actions */}
      <div className="mt-8 flex flex-col-reverse items-center justify-between gap-3 border-t border-slate-800 pt-5 sm:flex-row">
        <div className="text-xs text-slate-400 font-mono">
          Selected: <span className="text-emerald-400 font-bold">{canonicalExperiment.conditionThreshold}% drop</span>,{" "}
          {weaknessContext && (
            <>
              <span className="text-amber-400 font-bold">
                {weaknessContext.isResolved ? "weakness defined" : "weakness unresolved"}
              </span>
              ,{" "}
            </>
          )}
          <span className="text-emerald-400 font-bold">{canonicalExperiment.holdingPeriod}-day hold</span>,{" "}
          <span className="text-emerald-400 font-bold">{(canonicalExperiment.friction * 100).toFixed(2)}% cost</span>,{" "}
          <span className="text-emerald-400 font-bold">{canonicalExperiment.lookbackPeriod}y lookback</span>
        </div>

        <button
          type="button"
          onClick={onProceedToDefine}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50 sm:w-auto shadow-md"
        >
          <span>Challenge the Experiment →</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}