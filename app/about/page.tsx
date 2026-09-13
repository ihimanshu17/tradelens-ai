import Link from "next/link";
import { Compass, ShieldCheck, Database, Brain, Sparkles, ArrowRight, Layers } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <div className="border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <Compass className="h-3.5 w-3.5" />
          <span>Research Methodology</span>
        </div>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          TradeLens AI: Research Philosophy & Architecture
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:text-base">
          TradeLens AI is an AI-native quantitative trading research platform built for the AI Full-Stack Developer Intern assignment at SUAS Enterprises.
        </p>
      </div>

      {/* Core Workflow */}
      <div className="mt-10 space-y-8">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            The 5-Stage Research Framework
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Traders frequently make claims based on anecdotal intuition. TradeLens AI formalizes those intuitions into testable hypotheses without confusing simulated samples for guaranteed edges.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {[
              { num: "01", stage: "ASK", desc: "User expresses a natural-language trading idea or market observation." },
              { num: "02", stage: "CLARIFY", desc: "System isolates vague terms (e.g. 'sharp fall'), reveals unstated assumptions, and prompts explicit choices." },
              { num: "03", stage: "DEFINE", desc: "Hypothesis, condition, entry, exit, holding horizon, and friction are locked into an immutable experiment schema." },
              { num: "04", stage: "TEST", desc: "Deterministic research engine runs simulations across sample market bars, computing empirical metrics." },
              { num: "05", stage: "LEARN", desc: "AI interprets empirical findings cautiously, identifying risks and generating targeted follow-up research questions." },
            ].map((s) => (
              <div key={s.num} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="font-mono text-xs font-bold text-emerald-400">{s.num}</span>
                <h3 className="mt-1 text-sm font-bold text-slate-200">{s.stage}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Core Principles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Database className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-slate-200">
                Separation of AI vs Determinism
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              LLMs are used exclusively for natural-language understanding, ambiguity detection, hypothesis drafting, and qualitative synthesis.
              All statistical metrics (win rate, mean return, median, equity progression) are calculated deterministically by application code.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <div className="flex items-center gap-2 text-sky-400">
              <ShieldCheck className="h-4 w-4" />
              <h3 className="text-sm font-semibold text-slate-200">
                Research Integrity
              </h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              TradeLens AI strictly avoids claiming "the strategy works". Financial markets are non-stationary with severe regime shifts, sample limitations, and slippage frictions. All conclusions are framed as preliminary observations.
            </p>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span>Architecture & Technology Stack</span>
          </h3>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            <div>
              <span className="text-slate-500">Frontend</span>
              <p className="mt-0.5 font-medium text-slate-200">Next.js 15 (App Router)</p>
              <p className="text-[11px] text-slate-500">React 19, Tailwind CSS</p>
            </div>
            <div>
              <span className="text-slate-500">Language</span>
              <p className="mt-0.5 font-medium text-slate-200">TypeScript (Strict)</p>
              <p className="text-[11px] text-slate-500">Zod schemas</p>
            </div>
            <div>
              <span className="text-slate-500">AI / LLM</span>
              <p className="mt-0.5 font-medium text-slate-200">Google Gemini API</p>
              <p className="text-[11px] text-slate-500">Structured outputs via @google/genai</p>
            </div>
            <div>
              <span className="text-slate-500">Storage</span>
              <p className="mt-0.5 font-medium text-slate-200">Drizzle ORM & Postgres</p>
              <p className="text-[11px] text-slate-500">With memory fallback</p>
            </div>
          </div>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-slate-950 transition-all hover:bg-emerald-400"
          >
            <span>Launch Research Experiment</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
