"use client";

import { useState, useEffect } from "react";
import { Search, Sparkles, ArrowRight, Loader2, Compass, AlertCircle } from "lucide-react";

interface AskStageProps {
  onSubmitQuestion: (question: string) => void;
  isLoading: boolean;
  error?: string | null;
}

const EXAMPLE_QUESTIONS = [
  "Does buying NIFTY after a sharp fall work?",
  "Does buying NIFTY after a 2% fall have an edge?",
  "Does momentum work better during high volatility?",
  "What happens after three consecutive down days?",
  "Does buying after a large gap-down produce positive returns?",
];

const LOADING_STEPS = [
  "Understanding your research question...",
  "Checking for missing assumptions...",
  "Detecting ambiguous conditions...",
  "Synthesizing quantitative parameters...",
];

export function AskStage({ onSubmitQuestion, isLoading, error }: AskStageProps) {
  const [question, setQuestion] = useState("");
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIdx(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmitQuestion(question.trim());
  };

  const handleSelectExample = (q: string) => {
    setQuestion(q);
    onSubmitQuestion(q);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Stage 1: Research Ideation & Question Framing</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-5xl">
          Turn a trading idea into a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            research experiment.
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base">
          Ask a question in plain English. TradeLens AI will help define what needs to be tested, isolate unstated assumptions, and translate intuition into empirical parameters.
        </p>
      </div>

      {/* Main Research Input */}
      <div className="mt-8 sm:mt-10">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-900/90 shadow-2xl transition-all focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <div className="pl-4 text-slate-500">
              <Search className="h-5 w-5" />
            </div>

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              placeholder="Does buying NIFTY after a sharp fall work?"
              className="w-full bg-transparent px-4 py-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none sm:text-base"
            />

            <div className="pr-2">
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Investigate</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Loading status progress indicator */}
        {isLoading && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-400 font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{LOADING_STEPS[loadingStepIdx]}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Parsing natural language, identifying market conditions, and checking for missing assumptions
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Example prompts */}
        <div className="mt-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Compass className="h-3.5 w-3.5" />
            <span>Example Research Questions</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXAMPLE_QUESTIONS.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectExample(example)}
                disabled={isLoading}
                className="group flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 text-left text-xs text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800/60 hover:text-slate-100 disabled:opacity-50"
              >
                <span className="mt-0.5 text-slate-500 group-hover:text-emerald-400">→</span>
                <span className="leading-relaxed">{example}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
