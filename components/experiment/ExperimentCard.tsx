"use client";

import Link from "next/link";
import { Experiment } from "@/types/experiment";
import { ArrowRight, Calendar, Tag, ShieldCheck } from "lucide-react";

interface ExperimentCardProps {
  experiment: Experiment;
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  const isTested = experiment.status === "tested";

  return (
    <div className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/90 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            {experiment.market}
          </span>
          <span className="text-xs text-slate-500">{experiment.timeframe}</span>
        </div>

        <span
          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isTested
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
          }`}
        >
          {experiment.status}
        </span>
      </div>

      <h3 className="mt-3 text-base font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
        {experiment.title}
      </h3>

      <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
        "{experiment.originalQuestion}"
      </p>

      {/* Badges */}
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700">
          Condition: {experiment.condition.description}
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700">
          Hold: {experiment.holdingPeriod}d
        </span>
        <span className="rounded bg-slate-800 px-2 py-0.5 border border-slate-700">
          Cost: {((experiment.costAssumption ?? 0) * 100).toFixed(2)}%
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{new Date(experiment.createdAt).toLocaleDateString()}</span>
        </div>

        <Link
          href={`/experiments/${experiment.id}`}
          className="flex items-center gap-1 font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span>View Research</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
