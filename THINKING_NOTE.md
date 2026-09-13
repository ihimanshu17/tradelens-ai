# TradeLens AI — Thinking Note
**Option 2 Assignment Submission | Candidate Thinking Note**

---

### 1. Problem Interpretation

When a trader asks, *"Does NIFTY perform better after two down days than after a 2% decline?"*, they are expressing an intuitive hypothesis in colloquial language. Such questions are fundamentally underspecified:
- **Missing thresholds:** "Down day" leaves magnitude undefined (is -0.05% a down day?).
- **Missing baselines & horizons:** "Perform better" lacks a comparison benchmark, holding period, and primary metric.
- **Hidden execution rules:** When is capital committed? On the signal close or the next open? What friction is assumed?

Most AI financial tools make a critical mistake: they silently inject arbitrary defaults, execute a backtest, and present a performance curve with false precision. Simply converting natural language into code is dangerous; if the engine invents parameters without consent, it tests its own hidden assumptions rather than the researcher's hypothesis.

My objective was to build a system that respects researcher intent by refusing to make silent decisions. TradeLens unpacks colloquial queries, isolates unstated assumptions, enforces methodological integrity before simulation, and keeps empirical facts strictly separated from AI interpretation.

---

### 2. How I Approached the Problem

The assignment outlines: **ASK → CLARIFY → DEFINE → TEST → LEARN**.  
I extended this workflow by introducing a critical product-thinking differentiator:

$$\text{ASK} \longrightarrow \text{CLARIFY} \longrightarrow \mathbf{CHALLENGE} \longrightarrow \text{DEFINE} \longrightarrow \text{TEST} \longrightarrow \text{LEARN}$$

#### Why I Added the CHALLENGE Stage
In quantitative research, executing an ill-posed experiment produces misleading confidence. **Before testing an idea, the system checks whether the proposed experiment is actually capable of answering the researcher's question.**

The **CHALLENGE (Research Integrity)** stage acts as an automated methodology gatekeeper:
1. **Enforces Comparison Symmetry:** For comparative questions, it verifies that both branches share identical test windows, entry rules, holding periods, and friction assumptions.
2. **Flags Methodological Traps:** It warns against look-ahead bias (e.g., executing on the signal day's close) and small sample sizes that undermine statistical power.
3. **Offers Remediation:** It provides one-click corrective actions (e.g., *"Align holding periods to 5 days"*, *"Enforce next-day open entry"*) rather than passively executing a flawed design.

---

### 3. Ambiguity and Assumptions

In TradeLens, ambiguity is treated as a first-class citizen. I classified parameters into three clear categories:
- **User Explicit:** Parameters stated directly in the prompt (e.g., instrument: NIFTY, drop: 2%).
- **Clarified:** Underspecified parameters resolved interactively with the user (e.g., selecting a 5-day holding period).
- **System Required:** Operational assumptions needed to run a simulation (e.g., 0.10% round-trip friction, next-day open entry).

Every parameter retains visible provenance (`USER_EXPLICIT`, `AI_SUGGESTED`, or `SYSTEM_DEFAULT`). If a user mentions a "large decline," TradeLens does not silently assign 2.0%; it highlights the ambiguity during Clarification and lets the user choose. Key assumptions like entry timing, exit rules, and transaction costs are made explicit and traceable rather than buried in code.

---

### 4. Experiment Design & The Experiment Contract

To prevent **parameter drift**—where parameters discussed during clarification subtly mutate before testing—TradeLens introduces an immutable **Experiment Contract**.

Created in the DEFINE stage, this contract serves as the authoritative single source of truth, locking:
- Research question and formal hypothesis
- Target instrument and historical window
- Condition A trigger and Condition B baseline (for comparisons)
- Entry timing (Next-Day Open vs. Same-Day Close)
- Exit rule (Fixed holding period, stop-loss, or target)
- Round-trip transaction cost (in basis points)
- Primary evaluation metric

This canonical contract is passed verbatim to the simulation engine and synthesis layer. Having one locked contract guarantees complete parameter fidelity across the entire lifecycle.

---

### 5. AI vs. Deterministic Computation

A foundational architectural decision in TradeLens is the strict boundary between generative AI and deterministic computation:

- **AI Responsibility:** Natural language parsing, intent structuring, ambiguity detection, hypothesis formulation, qualitative interpretation, and proposing follow-up research questions.
- **Deterministic Responsibility:** Trade matching, signal detection, entry/exit price lookup, transaction friction deduction, win rates, median returns, cumulative P&L, drawdowns, and parameter sensitivity sweeps.

**Why numerical calculations remain strictly deterministic:**  
LLMs cannot be trusted with arithmetic, state tracking, or index lookups. Permitting an LLM to compute win rates or drawdowns introduces hallucinations into empirical research. In TradeLens, all metrics in the TEST and LEARN stages come from deterministic TypeScript functions. The LLM receives calculated evidence to interpret qualitatively; it never invents numbers.

---

### 6. Risks and Failure Modes Considered

During development, I designed specific safeguards against major quantitative research risks:
- **Look-Ahead Bias:** Entering on the signal close assumes execution before knowing the official close. TradeLens defaults to entering on the *next day's open* ($t+1$) once the bar is confirmed.
- **Frictionless Alpha:** Strategies often appear profitable only because friction is ignored. TradeLens applies a default 10 bps (0.10%) round-trip cost and tests sensitivity to higher slippage.
- **Comparison Drift & Missing Baselines:** Comparative questions often fail because conditions are tested on asymmetric timelines. The Challenge stage verifies synchronized baselines.
- **Overfitting & Parameter Brittleness:** An edge at 2.0% might vanish at 2.1%. TradeLens runs a sensitivity sweep ($\pm 0.5\%$, $\pm 2$ days) to show whether results are robust or overfitted.
- **AI Overclaiming:** In the LEARN stage, **Calculated Evidence** is visually separated from **AI Interpretation**, preventing the model from framing speculative observations as established facts.

---

### 7. Data and Experiment Limitations

To maintain research honesty, the prototype's boundaries are explicit:
- **Simulated Research Data:** The prototype utilizes a deterministic synthetic daily price series with calibrated drift and volatility. It does not connect to live exchange feeds.
- **Illustrative Results:** Simulated trade logs demonstrate the workflow and hypothesis methodology; they do not prove a live trading edge.
- **Scope:** TradeLens is an AI research assistant, not a production-grade broker-connected backtester.

This scope reflects the assignment's mandate: *"Build less. Think more."* Prioritizing hypothesis integrity and transparent assumptions was far more valuable than integrating external market APIs.

---

### 8. Key Trade-offs

- **Methodological Friction vs. Instant Answers:** Requiring clarification and integrity checks adds steps, but prevents false confidence from unexamined assumptions.
- **Focused Research Engine vs. Full Trading Platform:** Rather than building multi-asset portfolio accounting or order routing, I built a focused single- and comparative-condition engine with high fidelity.
- **Deterministic Engine vs. End-to-End LLM Generation:** Relying on TypeScript for all calculations increased integration complexity, but was the only acceptable choice for mathematical integrity.
- **Research Integrity vs. Blind Execution:** The system actively challenges ill-posed questions rather than passively executing every user prompt.

---

### 9. What I Would Improve with More Time

Given additional development time, my priorities would be:
- **Historical Market Feeds:** Ingesting verified OHLCV historical data for Indian and global indices.
- **Statistical Significance Testing:** Incorporating Monte Carlo permutation tests, bootstrap p-values, and confidence intervals.
- **Regime Analysis:** Testing performance segmented by volatility regimes (e.g., India VIX levels) and macroeconomic cycles.
- **Experiment Branching:** Enabling researchers to branch an experiment contract, modify one variable, and view side-by-side comparative diffs.

---

### 10. What I Am Most Proud Of

TradeLens does not simply answer a trading question—it interrogates it.

I am most proud that the system resists being an agreeable, hallucinating chatbot. By introducing the **CHALLENGE** stage and the **Experiment Contract**, TradeLens protects researchers from their own blind spots. It insists on clarity, exposes hidden assumptions, verifies methodology before execution, enforces bitwise mathematical truth, and encourages the researcher to ask: *"What could prove this wrong?"*
