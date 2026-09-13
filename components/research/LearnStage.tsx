"use client";

import { ExperimentData, ExperimentResult } from "@/types/experiment";
import { InterpretationResult } from "@/types/research";
import {
  Brain,
  Database,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  CheckCircle,
  GitBranch,
} from "lucide-react";

interface LearnStageProps {
  experiment: ExperimentData;
  result: ExperimentResult;
  interpretation: InterpretationResult;
  onFollowUpClick: (question: string) => void;
  onNewVersion: () => void;
  onRestart: () => void;
}

export function LearnStage({
  experiment,
  result,
  interpretation,
  onFollowUpClick,
  onNewVersion,
  onRestart,
}: LearnStageProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Stage Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
            <Brain className="h-4 w-4" />
            <span>Stage 6: Synthesis & Next-Phase Discovery</span>
          </div>
          <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
            Evidence vs Interpretation
          </span>
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
          Research Synthesis & Learnings
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Comparing strict empirical observations against qualitative scientific hypotheses.
        </p>
      </div>

      {/* Research Integrity Notice for Context Conditions */}
      {experiment.contextConditions && experiment.contextConditions.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-amber-300">
                Research Integrity Notice: Context Condition Unmodeled
              </h4>
              <p className="mt-1 text-xs text-slate-200 leading-relaxed font-semibold">
                Context condition identified but not yet supported by the prototype simulation engine.
              </p>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                The research hypothesis specified evaluating drops occurring after <em>"{experiment.contextConditions[0].label} ({experiment.contextConditions[0].definition || 'weakness'})"</em>. Because the prototype simulation engine only tested unconditional daily drops &ge; {experiment.condition.threshold}%, the observations below reflect unconditional price rebounds. No empirical claim can be made regarding the impact of prior market weakness.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: WHAT THE DATA SHOWS (Deterministic) */}
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <Database className="h-4 w-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              1. What the Data Shows
            </h3>
          </div>
          <span className="rounded bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/40">
            Calculated from dataset
          </span>
        </div>

        <div className="mt-3 text-sm leading-relaxed text-slate-200">
          <p>{interpretation.dataSummary}</p>
        </div>

        {/* Comparative Data Grid (when comparison experiment) */}
        {result.comparisonResults ? (
          <div className="mt-4 border-t border-emerald-500/20 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
              <span>Empirical Metric Breakdown</span>
              <span className="font-mono text-[11px] text-slate-400">Condition A vs. Condition B</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-400">
                    <th className="pb-2 font-semibold">Metric</th>
                    <th className="pb-2 font-semibold text-purple-300">Condition A ({result.comparisonResults.branchA.name})</th>
                    <th className="pb-2 font-semibold text-slate-300">Condition B ({result.comparisonResults.branchB.name})</th>
                    <th className="pb-2 font-semibold text-emerald-400">Difference (A − B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr>
                    <td className="py-2 text-slate-300 font-sans">Qualifying Signals</td>
                    <td className="py-2 text-purple-200">{result.comparisonResults.branchA.observations}</td>
                    <td className="py-2 text-slate-300">{result.comparisonResults.branchB.observations}</td>
                    <td className="py-2 text-slate-400">
                      {result.comparisonResults.branchA.observations - result.comparisonResults.branchB.observations}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-300 font-sans">Win Rate</td>
                    <td className="py-2 text-purple-200">{result.comparisonResults.branchA.winRate}%</td>
                    <td className="py-2 text-slate-300">{result.comparisonResults.branchB.winRate}%</td>
                    <td className="py-2 text-emerald-400 font-bold">
                      {result.comparisonResults.difference ? `${result.comparisonResults.difference.winRateDiff >= 0 ? "+" : ""}${result.comparisonResults.difference.winRateDiff} pp` : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-300 font-sans">Average Return</td>
                    <td className="py-2 text-purple-200">{result.comparisonResults.branchA.averageReturn > 0 ? "+" : ""}{result.comparisonResults.branchA.averageReturn}%</td>
                    <td className="py-2 text-slate-300">{result.comparisonResults.branchB.averageReturn > 0 ? "+" : ""}{result.comparisonResults.branchB.averageReturn}%</td>
                    <td className="py-2 text-emerald-400 font-bold">
                      {result.comparisonResults.difference ? `${result.comparisonResults.difference.avgReturnDiff >= 0 ? "+" : ""}${result.comparisonResults.difference.avgReturnDiff}%` : "N/A"}
                    </td>
                  </tr>
                  {result.comparisonResults.branchA.medianReturn !== undefined && (
                    <tr>
                      <td className="py-2 text-slate-300 font-sans">Median Return</td>
                      <td className="py-2 text-purple-200">{result.comparisonResults.branchA.medianReturn >= 0 ? "+" : ""}{result.comparisonResults.branchA.medianReturn}%</td>
                      <td className="py-2 text-slate-300">{result.comparisonResults.branchB.medianReturn !== undefined && (result.comparisonResults.branchB.medianReturn >= 0 ? "+" : "")}{result.comparisonResults.branchB.medianReturn}%</td>
                      <td className="py-2 text-emerald-400 font-bold">
                        {result.comparisonResults.difference ? `${result.comparisonResults.difference.medianReturnDiff >= 0 ? "+" : ""}${result.comparisonResults.difference.medianReturnDiff}%` : "N/A"}
                      </td>
                    </tr>
                  )}
                  {result.comparisonResults.branchA.recoveryMetric && (
                    <tr>
                      <td className="py-2 text-slate-300 font-sans">
                        {experiment.comparisonMetric === "recovery speed" ? "Recovery Rate (% Pos)" : "Positive Exits (% Pos)"}
                      </td>
                      <td className="py-2 text-purple-200">{result.comparisonResults.branchA.recoveryMetric.recoveryRate}%</td>
                      <td className="py-2 text-slate-300">{result.comparisonResults.branchB.recoveryMetric?.recoveryRate ?? "N/A"}%</td>
                      <td className="py-2 text-emerald-400 font-bold">
                        {result.comparisonResults.difference ? `${result.comparisonResults.difference.recoveryRateDiff >= 0 ? "+" : ""}${result.comparisonResults.difference.recoveryRateDiff} pp` : "N/A"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Single Condition Fact Sheet Grid */
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-emerald-500/20 pt-4 sm:grid-cols-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Sample Size</span>
              <div className="font-mono text-base font-bold text-slate-100">
                {result.observations} occurrences
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Win Rate</span>
              <div className="font-mono text-base font-bold text-emerald-400">
                {result.winRate}% ({result.winningTrades}/{result.trades.length})
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Avg Return</span>
              <div className="font-mono text-base font-bold text-slate-100">
                {result.averageReturn > 0 ? "+" : ""}{result.averageReturn}% net
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Compounded Growth</span>
              <div className="font-mono text-base font-bold text-slate-100">
                {result.cumulativeReturn > 0 ? "+" : ""}{result.cumulativeReturn}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONCLUSION ROBUSTNESS (Deterministic Sensitivity Analysis) */}
      {result.sensitivity && (
        <div className="mt-6 rounded-xl border border-teal-500/30 bg-slate-900/80 p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-teal-400">
              <Database className="h-4 w-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Conclusion Robustness
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono text-teal-300 border border-teal-500/30">
                Calculated from Dataset
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                Simulated Research Data
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Current Experiment Baseline
              </span>
              <div className="mt-1 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="font-mono text-sm font-bold text-slate-100">
                  {result.sensitivity.currentValueFormatted}
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  Average net return:{" "}
                  <span className={`font-mono font-bold ${result.averageReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {result.averageReturn > 0 ? "+" : ""}{result.averageReturn}%
                  </span>{" "}
                  (Win rate: {result.winRate}%)
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Sensitivity Across Holding Periods
              </span>
              <div className="mt-1 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                      <th className="p-2 font-medium">Horizon</th>
                      <th className="p-2 font-medium">Avg Return</th>
                      <th className="p-2 font-medium">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {result.sensitivity.points.map((pt, idx) => (
                      <tr key={idx} className={pt.isCurrent ? "bg-teal-500/10 text-teal-300 font-semibold" : ""}>
                        <td className="p-2">
                          {pt.label} {pt.isCurrent && "(Current)"}
                        </td>
                        <td className={`p-2 ${pt.averageReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {pt.averageReturn > 0 ? "+" : ""}{pt.averageReturn}%
                        </td>
                        <td className="p-2 text-slate-300">{pt.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            <span className="font-bold text-slate-200">Interpretation: </span>
            <span>{result.sensitivity.interpretation}</span>
          </div>
        </div>
      )}

      {/* SECTION 2: WHAT WE CAN REASONABLY CONCLUDE (AI Interpretation) */}
      <div className="mt-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sky-400">
            <Sparkles className="h-4 w-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              2. What We Can Reasonably Conclude
            </h3>
          </div>
          <span className="rounded bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300 border border-sky-500/40">
            AI interpretation
          </span>
        </div>

        <div className="mt-3 text-sm leading-relaxed text-slate-200">
          <p>{interpretation.reasonableConclusions}</p>
        </div>

        {/* Methodological Caveats & Limitations */}
        <div className="mt-4 border-t border-sky-500/20 pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Methodological Risks & Uncertainty
          </span>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
            {interpretation.risksAndLimitations.map((lim, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-sky-400">•</span>
                <span>{lim}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* SECTION 3: WHAT WOULD CHANGE THIS CONCLUSION? */}
      <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-400">
            <HelpCircle className="h-4 w-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">
              3. What Would Change This Conclusion?
            </h3>
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            Evidence-based follow-up hypotheses
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          A rigorous conclusion must be stress-tested against contrary conditions. Click any follow-up hypothesis to branch the research thread:
        </p>

        <div className="mt-4 space-y-2">
          {interpretation.followUpQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onFollowUpClick(q)}
              className="group flex w-full items-center justify-between rounded-lg border border-purple-500/20 bg-slate-900/60 p-3.5 text-left text-xs text-slate-200 transition-all hover:border-purple-400/60 hover:bg-purple-500/10 hover:text-purple-200"
            >
              <div className="flex items-start gap-2.5">
                <span className="font-mono text-purple-400 font-semibold">{idx + 1}.</span>
                <span className="leading-relaxed">{q}</span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-purple-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Mock Data Transparency Notice */}
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-center text-[11px] text-slate-500">
        <span className="font-semibold text-slate-400">Simulated Research Data: </span>
        Illustrative prototype simulation — not live market data. Historical and simulated returns do not guarantee a live trading edge.
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800 sm:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>New Research Question</span>
        </button>

        <button
          type="button"
          onClick={onNewVersion}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition-all hover:bg-emerald-400 sm:w-auto"
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span>Fork as Version 2 (Parameter Tweak)</span>
        </button>
      </div>
    </div>
  );
}
