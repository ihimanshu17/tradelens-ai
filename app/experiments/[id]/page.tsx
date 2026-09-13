"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Experiment, ExperimentVersion, ExperimentResult } from "@/types/experiment";
import { VersionHistory } from "@/components/experiment/VersionHistory";
import {
  ArrowLeft,
  Calendar,
  Database,
  FlaskConical,
  Percent,
  Play,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Activity,
  Loader2,
} from "lucide-react";

export default function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [versions, setVersions] = useState<ExperimentVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<ExperimentVersion | null>(null);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/experiments/${id}`);
        if (res.ok) {
          const data = await res.json();
          setExperiment(data.experiment);
          setVersions(data.versions || []);
          if (data.versions && data.versions.length > 0) {
            setActiveVersion(data.versions[0]);
          }
          setResult(data.latestResult || null);
        }
      } catch (err) {
        console.error("Failed to load experiment:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSelectVersion = async (ver: ExperimentVersion) => {
    setActiveVersion(ver);
    // Re-run simulation on this version's parameters to see exact results for this version
    setIsSimulating(true);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: id,
          experiment: ver.experimentData,
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        setResult(resData);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-xs">Loading experiment specifications...</span>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-200">Experiment Not Found</h2>
        <p className="mt-1 text-xs text-slate-400">
          The requested experiment record does not exist or has been removed.
        </p>
        <Link
          href="/experiments"
          className="mt-4 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Library</span>
        </Link>
      </div>
    );
  }

  const expData = activeVersion ? activeVersion.experimentData : experiment;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Back button */}
      <Link
        href="/experiments"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Experiments</span>
      </Link>

      {/* Header */}
      <div className="mt-4 border-b border-slate-800 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                {experiment.market}
              </span>
              <span className="text-xs text-slate-500">{experiment.timeframe}</span>
              {activeVersion && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                  Version {activeVersion.versionNumber}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
              {experiment.title}
            </h1>
            <p className="mt-1 text-xs italic text-slate-400">
              "{experiment.originalQuestion}"
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Fork Experiment</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Experiment Parameters & Results */}
        <div className="space-y-6 lg:col-span-2">
          {/* Active Specification */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Experiment Parameters</span>
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Market</span>
                <p className="mt-0.5 font-semibold text-slate-200">{expData.market}</p>
              </div>
              <div>
                <span className="text-slate-500">Condition</span>
                <p className="mt-0.5 font-semibold text-emerald-400">
                  {typeof expData.condition === "object"
                    ? expData.condition.description
                    : expData.condition}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Holding Period</span>
                <p className="mt-0.5 font-semibold text-slate-200">
                  {expData.holdingPeriod} trading days
                </p>
              </div>
              <div>
                <span className="text-slate-500">Round-Trip Cost</span>
                <p className="mt-0.5 font-mono font-semibold text-amber-400">
                  {((expData.costAssumption ?? 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-slate-500">Execution</span>
                <p className="mt-0.5 font-semibold text-slate-200">Next Open (t+1)</p>
              </div>
              <div>
                <span className="text-slate-500">Created</span>
                <p className="mt-0.5 font-semibold text-slate-400">
                  {new Date(experiment.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <span className="text-[11px] font-semibold text-slate-400">Hypothesis:</span>
              <p className="mt-0.5 text-xs italic text-slate-300">"{expData.hypothesis}"</p>
            </div>
          </div>

          {/* Results Summary if tested */}
          {result && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Empirical Findings</span>
                </h3>
                {isSimulating && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Recalculating...</span>
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Observations</span>
                  <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                    {result.observations}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Win Rate</span>
                  <div
                    className={`mt-1 font-mono text-lg font-bold ${
                      result.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {result.winRate}%
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Avg Return</span>
                  <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                    {result.averageReturn > 0 ? "+" : ""}
                    {result.averageReturn}%
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950/60 p-3">
                  <span className="text-[10px] text-slate-500 uppercase">Cumulative</span>
                  <div
                    className={`mt-1 font-mono text-lg font-bold ${
                      result.cumulativeReturn >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {result.cumulativeReturn >= 0 ? "+" : ""}
                    {result.cumulativeReturn}%
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-slate-400">
                Simulated research dataset � {result.winningTrades} winning trades vs{" "}
                {result.losingTrades} losing trades across sample period.
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Version History Timeline */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <VersionHistory
              versions={versions}
              selectedVersionNumber={activeVersion?.versionNumber}
              onSelectVersion={handleSelectVersion}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
