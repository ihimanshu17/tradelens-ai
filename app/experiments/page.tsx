"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Experiment } from "@/types/experiment";
import { ExperimentCard } from "@/components/experiment/ExperimentCard";
import { Search, FlaskConical, PlusCircle, Loader2 } from "lucide-react";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/experiments");
        if (res.ok) {
          const data = await res.json();
          setExperiments(data);
        }
      } catch (err) {
        console.error("Failed to load experiments:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markets = ["ALL", ...Array.from(new Set(experiments.map((e) => e.market)))];

  const filtered = experiments.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.originalQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMarket = marketFilter === "ALL" || e.market === marketFilter;
    return matchesSearch && matchesMarket;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <FlaskConical className="h-4 w-4" />
            <span>Research Repository</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 sm:text-3xl">
            Experiment Library & Version History
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Past quantitative experiments, parameter evolutions, and empirical findings.
          </p>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-all hover:bg-emerald-400 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Experiment</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search experiments or original questions..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {markets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarketFilter(m)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                marketFilter === m
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:border-slate-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          <span className="text-xs">Loading experiment repository...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-16 rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <FlaskConical className="mx-auto h-8 w-8 text-slate-600" />
          <h3 className="mt-2 text-sm font-semibold text-slate-300">No experiments found</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query or launch a new research question.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((exp) => (
            <ExperimentCard key={exp.id} experiment={exp} />
          ))}
        </div>
      )}
    </div>
  );
}
