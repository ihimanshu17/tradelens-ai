"use client";

import { ResearchStage } from "@/types/research";
import { Check, ArrowRight } from "lucide-react";

interface PipelineProps {
  currentStage: ResearchStage;
  onSelectStage?: (stage: ResearchStage) => void;
  completedStages: ResearchStage[];
}

const STAGES: { id: ResearchStage; label: string; stepNumber: number; sub: string }[] = [
  { id: "ask", label: "ASK", stepNumber: 1, sub: "Idea" },
  { id: "clarify", label: "CLARIFY", stepNumber: 2, sub: "Ambiguity" },
  { id: "challenge", label: "CHALLENGE", stepNumber: 3, sub: "Integrity" },
  { id: "define", label: "DEFINE", stepNumber: 4, sub: "Contract" },
  { id: "test", label: "TEST", stepNumber: 5, sub: "Simulation" },
  { id: "learn", label: "LEARN", stepNumber: 6, sub: "Evidence" },
];

export function PipelineIndicator({ currentStage, onSelectStage, completedStages }: PipelineProps) {
  return (
    <div className="w-full border-b border-slate-800 bg-slate-900/40 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
        {STAGES.map((s, idx) => {
          const isCurrent = currentStage === s.id;
          const isCompleted = completedStages.includes(s.id);
          const isClickable = isCompleted && onSelectStage;

          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable && !isCurrent}
                onClick={() => isClickable && onSelectStage(s.id)}
                className={`group flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-all ${
                  isClickable ? "cursor-pointer hover:bg-slate-800/60" : "cursor-default"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    isCurrent
                      ? "border border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/30"
                      : isCompleted
                      ? "border border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                      : "border border-slate-800 bg-slate-900 text-slate-500"
                  }`}
                >
                  {isCompleted && !isCurrent ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.stepNumber}
                </div>

                <div className="hidden sm:block">
                  <div
                    className={`text-xs font-semibold tracking-wider transition-colors ${
                      isCurrent ? "text-emerald-300" : isCompleted ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10px] text-slate-500">{s.sub}</div>
                </div>
              </button>

              {idx < STAGES.length - 1 && (
                <div className="mx-1 text-slate-700 sm:mx-3">
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
