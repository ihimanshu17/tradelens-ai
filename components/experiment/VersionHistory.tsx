"use client";

import { ExperimentVersion } from "@/types/experiment";
import { GitBranch, Calendar, Clock, Check } from "lucide-react";

interface VersionHistoryProps {
  versions: ExperimentVersion[];
  selectedVersionNumber?: number;
  onSelectVersion?: (version: ExperimentVersion) => void;
}

export function VersionHistory({
  versions,
  selectedVersionNumber,
  onSelectVersion,
}: VersionHistoryProps) {
  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500 text-center">
        No version history available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Research Thread Overview */}
      <div className="rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <GitBranch className="h-4 w-4" />
            <span>Research Thread</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {versions.length} {versions.length === 1 ? "iteration" : "iterations"}
          </span>
        </div>

        {/* Thread visual steps */}
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex items-start gap-2 text-slate-300">
            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400">
              Query
            </span>
            <span className="italic leading-relaxed text-slate-200">
              &ldquo;{versions[0]?.experimentData.originalQuestion || "Original trading query"}&rdquo;
            </span>
          </div>

          <div className="pl-4 text-slate-600 font-mono text-xs">↓</div>

          <div className="flex items-start gap-2 text-slate-300">
            <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-300 border border-teal-500/30">
              Initial Test
            </span>
            <span>
              v1: {versions[0]?.experimentData.condition.threshold}% decline → {versions[0]?.experimentData.holdingPeriod}-day holding
            </span>
          </div>

          {versions.length > 1 && (
            <>
              <div className="pl-4 text-slate-600 font-mono text-xs">↓</div>
              <div className="flex items-start gap-2 text-slate-300">
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-300 border border-purple-500/30">
                  Follow-up
                </span>
                <span>
                  v2: {versions[1]?.changeSummary || `${versions[1]?.experimentData.holdingPeriod}-day holding tweak`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
        <span>Experiment Version History</span>
      </div>

      <div className="relative border-l border-slate-800 ml-3 space-y-4 pl-4">
        {versions.map((ver) => {
          const isSelected = selectedVersionNumber === ver.versionNumber;
          return (
            <div
              key={ver.id}
              onClick={() => onSelectVersion && onSelectVersion(ver)}
              className={`relative rounded-lg border p-3.5 transition-all ${
                onSelectVersion ? "cursor-pointer hover:border-slate-700" : ""
              } ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-800/80 bg-slate-900/60"
              }`}
            >
              {/* Timeline marker */}
              <div
                className={`absolute -left-[23px] top-4.5 flex h-3 w-3 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-500"
                    : "border-slate-700 bg-slate-900"
                }`}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    v{ver.versionNumber}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {ver.changeSummary || `Version ${ver.versionNumber}`}
                  </span>
                </div>
                {isSelected && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              {/* Version parameters preview */}
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">
                  Hold: {ver.experimentData.holdingPeriod} days
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">
                  Drop: {ver.experimentData.condition.threshold}%
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 border border-slate-700">
                  Cost: {((ver.experimentData.costAssumption ?? 0) * 100).toFixed(2)}%
                </span>
              </div>

              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(ver.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
