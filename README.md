# TradeLens AI

> **AI-Native Trading Research Assistant**  
> *Turn natural-language trading questions into structured, testable quantitative research experiments.*

TradeLens AI is an AI-native trading research assistant designed to convert informal, conversational trading questions into structured, testable research experiments. Rather than acting as a simple conversational bot or a black-box backtester, TradeLens explicitly surfaces semantic ambiguities, tracks assumption provenance, enforces a dedicated Research Integrity layer before simulation, executes bitwise-deterministic trade math in TypeScript, and strictly separates computed evidence from AI-assisted qualitative interpretation.

---

## 1. Problem

Traders and quantitative researchers frequently express market intuitions in natural language:
- *"Does NIFTY recover after a large decline?"*
- *"Does NIFTY perform better after two down days than after a 2% drop?"*
- *"What happens if I buy Reliance after a sharp morning gap-down?"*

While intuitive, these colloquial expressions are fundamentally **underspecified**:
- **Target Instrument:** Is the market index or an underlying cash instrument intended?
- **Decline Threshold:** What constitutes a "large decline"? (1%, 2%, 3%, or a statistical standard deviation?)
- **Timeframe:** Daily bars, hourly intervals, or multi-day trends?
- **Entry Timing:** Does execution happen on the day of the signal (at the close) or on the following morning (at the open)?
- **Holding Period:** How long is capital committed? (1 day, 5 days, 10 days?)
- **Exit Definition:** Fixed time stop, trailing stop-loss, or profit target?
- **Test Window:** What historical sample or lookback period is being examined?
- **Transaction Costs:** Are brokerage, STT/exchange turnover charges, and slippage accounted for?
- **Primary Metric:** How is success evaluated? (Win rate, average return, median return, or drawdown?)
- **Baseline / Comparison:** When a question says "perform better" or "recovers faster", what is the comparative baseline?

**Why Silently Inventing Parameters Produces Misleading Research:**  
Conventional financial chatbots routinely make a dangerous mistake: they silently choose arbitrary defaults (e.g., assuming a 2% drop, 5-day hold, zero transaction costs), run a script, and display an equity curve with unwarranted confidence. When an AI tool secretly invents parameters, it does not test the researcher's hypothesis—it tests its own uninspected defaults. In quantitative finance, hidden assumptions lead to false discovery, phantom alpha, and capital risk.

---

## 2. Solution

TradeLens AI replaces the naive chatbot pattern with a disciplined, 6-stage research pipeline:

$$\text{ASK} \longrightarrow \text{CLARIFY} \longrightarrow \mathbf{CHALLENGE} \longrightarrow \text{DEFINE} \longrightarrow \text{TEST} \longrightarrow \text{LEARN}$$

```
┌─────────┐     ┌───────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐
│ 1. ASK  │ ──> │ 2.CLARIFY │ ──> │ 3.CHALLENGE │ ──> │ 4.DEFINE │ ──> │ 5. TEST  │ ──> │ 6. LEARN  │
└─────────┘     └───────────┘     └─────────────┘     └──────────┘     └──────────┘     └───────────┘
 Plain-English    Ambiguity &        Research          Canonical        Deterministic    Evidence vs.
 Trading Idea     Assumptions        Integrity         Contract         Simulation       AI Synthesis
```

1. **ASK:** The researcher expresses an intuition in plain English.
2. **CLARIFY:** The system deconstructs the query, extracts candidate entities, flags ambiguous terms (e.g., "sharp fall", "recovery"), and presents structured choices to resolve unstated parameters.
3. **CHALLENGE (Key Differentiator):** Before running any code, the system audits the research design for methodological flaws, missing baselines, comparison asymmetry, look-ahead bias, and sample size feasibility.
4. **DEFINE:** The clarified, validated idea is compiled into an immutable, canonical **Experiment Contract** that locks all parameters to prevent parameter drift.
5. **TEST:** A pure deterministic TypeScript engine runs the simulation across market bars, computing empirical metrics, trade logs, equity curves, drawdown statistics, and parameter sensitivity scans.
6. **LEARN:** The system presents **Calculated Evidence** (immutable numbers) separately from **AI Interpretation** (qualitative caveats and context), followed by targeted follow-up research questions to falsify the hypothesis.

---

## 3. Research Integrity Layer

The **CHALLENGE (Research Integrity)** stage is the central product-thinking differentiator of TradeLens AI. **Before testing an idea, the system checks whether the proposed experiment is actually capable of answering the researcher's question.**

### Core Integrity Checks
- **Missing Baseline Detection:** If the user uses comparative terms (*"better"*, *"faster"*, *"superior"*, *"outperform"*), the system flags that an explicit comparison baseline (Condition B) is logically required.
- **Missing Experiment Parameters:** Checks that threshold, timeframe, holding period, and entry rules are fully specified.
- **Assumption Provenance Audit:** Displays an inventory of which parameters were provided by the user versus suggested by AI.
- **Contradictory Inputs:** Catches logical conflicts (e.g., negative holding periods or impossible threshold combinations).
- **Look-Ahead Risk:** Warns when entry is configured for the same day's close ($t$), which assumes execution before the bar's closing price is officially established.
- **Data Support Check:** Verifies that the requested instrument is supported in the research dataset.
- **Comparison Symmetry Requirements:** For comparative questions, verifies that Condition A and Condition B share identical test periods, holding horizons, entry mechanics, and friction assumptions to avoid confounding variables.
- **Sample Size Feasibility:** Evaluates whether the threshold will produce enough trade occurrences ($N \ge 10$) for meaningful observation.

### Integrity Statuses
- **`READY`:** All checks passed. The experiment is well-defined, symmetric, and ready for contract compilation.
- **`NEEDS_REVIEW`:** The experiment contains non-fatal warnings (e.g., low sample size or reliance on AI-suggested assumptions). The user can review and proceed with acknowledgement.
- **`BLOCKED`:** Methodological flaws detected (e.g., missing comparison baseline, unsupported asset, or missing critical fields). Simulation cannot proceed until resolved.

> *Disclaimer: The Research Integrity Layer audits experiment design and consistency; it does NOT claim to guarantee statistical validity or live market profitability.*

---

## 4. Canonical Experiment Contract

To prevent **parameter drift**—a subtle failure mode where parameters discussed during clarification mutate across subsequent steps—TradeLens compiles the experiment into a single authoritative **Canonical Experiment Contract**.

The contract explicitly specifies:
- **Original Research Question:** The exact prompt submitted by the user.
- **Target Instrument & Market:** Asset identifier (e.g., `NIFTY`).
- **Timeframe:** Bar resolution (e.g., `daily`).
- **Trigger Condition (Condition A):** Type (`daily_decline`, `consecutive_down`, etc.), numerical threshold, and parameters.
- **Comparison Baseline (Condition B):** Baseline trigger for comparative experiments (e.g., single down day vs. two consecutive down days).
- **Entry Timing:** Execution rule (e.g., `next_open` at $t+1$ vs. `same_close` at $t$).
- **Holding Period:** Exact duration in trading days.
- **Exit Rule:** Time-based holding period, stop-loss cap, or profit target.
- **Test Window:** Lookback period (e.g., 5 years, start and end dates).
- **Transaction Costs / Friction:** Round-trip friction in basis points (default: 10 bps / 0.10%).
- **Primary Metric:** Target quantitative outcome (`win_rate`, `median_return`, etc.).
- **Falsifiable Hypothesis:** Auto-formulated formal hypothesis statement.
- **Integrity Status:** Verification state (`READY`, `NEEDS_REVIEW`, `BLOCKED`).

Once locked, the Contract is passed verbatim to the simulation engine and synthesis layer. Having one canonical contract guarantees complete parameter fidelity across the entire lifecycle.

---

## 5. Assumption Provenance

In TradeLens AI, assumptions are never hidden. Every parameter in the research workflow carries an explicit provenance tier:

| Provenance Badge | Meaning | System Behavior |
| :--- | :--- | :--- |
| **`USER PROVIDED`** | Parameter was stated directly by the user in the initial prompt. | Preserved as immutable user intent. |
| **`CLARIFIED` / `USER CONFIRMED`** | Parameter was explicitly selected or confirmed by the user during Clarify/Challenge. | User took ownership of the value. |
| **`AI SUGGESTED`** | Parameter was proposed by the AI to fill an unstated requirement. | Visually badged; user has one-click agency to accept, edit, or override. |
| **`SYSTEM REQUIRED`** | Operational parameter mandatory for simulation execution (e.g., data resolution). | Enforced by the engine with rationale displayed. |

**Why Provenance Matters:**  
Tagging assumptions prevents the illusion that the AI "knows" the optimal parameters. AI suggestions are treated as starting points, never as unquestioned authority.

---

## 6. Architecture

TradeLens AI is structured into five distinct operational layers:

```
                                  USER BROWSER
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ 1. PRESENTATION LAYER (Next.js 15 App Router / React 19 / Tailwind) │
    │    Stage 1: AskStage        Stage 2: ClarifyStage                   │
    │    Stage 3: ChallengeStage  Stage 4: DefineStage                    │
    │    Stage 5: TestStage       Stage 6: LearnStage                     │
    └──────────────────────────────────┬──────────────────────────────────┘
                                       │ HTTP / JSON
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ 2. APPLICATION & API LAYER (Next.js Route Handlers / Zod Schemas)   │
    │    /api/analyze    /api/clarify    /api/experiment                  │
    │    /api/test       /api/learn      /api/experiments                 │
    └──────────────┬───────────────────────────────────┬──────────────────┘
                   │                                   │
      Prompt & JSON│                      Contract &   │
      Extraction   │                      Parameters   │
                   ▼                                   ▼
    ┌──────────────────────────────┐    ┌─────────────────────────────────┐
    │ 3. AI / INTERPRETATION LAYER │    │ 4. DETERMINISTIC RESEARCH ENGINE│
    │    Google Gemini API         │    │    TypeScript Simulation Engine │
    │    - Natural Language Parsing│    │    - Signal Identification      │
    │    - Ambiguity Identification│    │    - Trade Matching & Timing    │
    │    - Hypothesis Formulation  │    │    - Cost Deduction (Friction)  │
    │    - Qualitative Synthesis   │    │    - Returns, Win Rate, Drawdown│
    │    (Intelligent Mock Fallback│    │    - Parameter Sensitivity Scan │
    │     active if key omitted)   │    │    (Bitwise Deterministic Math) │
    └──────────────┬───────────────┘    └────────────────┬────────────────┘
                   │                                     │
                   └───────────────────┬─────────────────┘
                                       │
                                       ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │ 5. DATA & PERSISTENCE LAYER (Drizzle ORM / PostgreSQL / Neon)       │
    │    - experiments (Canonical contracts)                             │
    │    - experiment_versions (Version history & parameter diffs)        │
    │    - experiment_results (Computed empirical outputs)                │
    │    (Automatic in-memory fallback if DATABASE_URL is omitted)        │
    └─────────────────────────────────────────────────────────────────────┘
```

### Core Architectural Principle
- **AI** handles interpretation, language understanding, entity extraction, and qualitative reasoning.
- **Deterministic Code** handles signal matching, prices, friction, win rate, median, drawdown, and sensitivity.
- **The LLM never performs numerical simulation or financial calculations.**

---

## 7. Technology Stack

All technologies listed below are actively used in the codebase:

### Frontend
- **Next.js 15.1.7** (App Router architecture, React Server Components)
- **React 19.0.0** (Concurrent mode, modern hooks)
- **TypeScript 5.7.3** (Strict type safety across components and contracts)
- **Tailwind CSS 3.4.17** (Utility-first dark-mode design system)
- **Recharts 2.15.1** (Interactive equity curves and trade return histograms)
- **Lucide React 0.475.0** (Icons for UI status and integrity badges)
- **Framer Motion 12.4.7** (Micro-animations between research stages)
- **clsx & tailwind-merge** (Conditional class utilities)

### Backend & API
- **Next.js Route Handlers** (REST API endpoints under `app/api/`)
- **Zod 3.24.2** (Schema validation for experiment contracts and API payloads)

### AI Integration
- **Google Gemini API** (`@google/genai` v2.22.0, default: `gemini-2.5-flash`)
- Server-side structured generation with resilient heuristic mock fallback

### Database & Persistence
- **Drizzle ORM 0.38.3** & **drizzle-kit 0.30.4**
- **Neon Serverless PostgreSQL** (`@neondatabase/serverless` v0.10.4)
- Zero-config in-memory repository fallback for instant local evaluation

### Testing & Tooling
- **Vitest 3.0.5** (Unit and integration test runner)
- **PostCSS 8.5.2** & **Autoprefixer 10.4.20**

---

## 8. API / Application Flow

The application exposes the following REST route handlers:

| Route | Method | Purpose |
| :--- | :--- | :--- |
| **`/api/analyze`** | `POST` | Parses natural-language trading input, extracts structured entities (market, condition, threshold, holding period), and flags subjective ambiguities. |
| **`/api/clarify`** | `POST` | Generates targeted multiple-choice clarification questions to resolve missing or ambiguous parameters. |
| **`/api/experiment`** | `POST` | Compiles clarified parameters into a formal hypothesis and structured experiment contract. |
| **`/api/test`** | `POST` | Executes deterministic simulation on the experiment contract across market bars, returning trades, aggregate metrics, equity points, and sensitivity data. |
| **`/api/learn`** | `POST` | Synthesizes calculated results, providing qualitative AI interpretation, caveats, and 3 targeted follow-up research questions. |
| **`/api/experiments`** | `GET` / `POST` | Lists all saved experiments or persists a new experiment record. |
| **`/api/experiments/[id]`** | `GET` | Retrieves a specific experiment by ID, including its version history and stored execution results. |

---

## 9. Data & Experiment Model

The persistence layer is modeled in `lib/db/schema.ts` using Drizzle ORM:

### 1. `experiments`
Stores the canonical experiment specification:
- `id` (text, primary key)
- `title` & `originalQuestion` (user prompt)
- `market` & `timeframe` (asset and bar resolution)
- `condition` (JSONB trigger specification)
- `entryCondition` & `exitCondition` (JSONB execution rules)
- `holdingPeriod` (integer trading days)
- `testPeriod` (JSONB date window)
- `costAssumption` (double precision round-trip friction)
- `hypothesis` (text formal hypothesis)
- `status` (`ready`, `tested`, `completed`)
- `createdAt` & `updatedAt` (timestamps)

### 2. `experiment_versions`
Tracks parameter iteration history across research cycles:
- `id` (text, primary key)
- `experimentId` (foreign key → `experiments.id`)
- `versionNumber` (integer sequence, e.g., v1, v2)
- `experimentData` (JSONB snapshot of canonical contract at that version)
- `createdAt` (timestamp)

### 3. `experiment_results`
Stores the deterministic quantitative output of a simulation run:
- `id` (text, primary key)
- `experimentId` (foreign key → `experiments.id`)
- `observations` (total signal count)
- `winningTrades` & `losingTrades` (integer counts)
- `winRate` (percentage)
- `averageReturn`, `medianReturn`, `bestReturn`, `worstReturn`, `cumulativeReturn` (percentages)
- `datasetType` (e.g., `simulated_daily_nifty`)
- `createdAt` (timestamp)

*Note: If `DATABASE_URL` is unconfigured, the application seamlessly activates an in-memory repository fallback that persists experiments in memory for the duration of the session.*

---

## 10. Deterministic Experiment Engine

The core simulation logic resides in `lib/research/engine.ts`. It executes without any LLM dependencies, ensuring bitwise reproducibility:

### Supported Quantitative Outputs
- **Qualifying Signals:** Exact bar indices satisfying trigger conditions (`daily_decline`, `consecutive_down`, `gap_down`, `volatility_spike`).
- **Executed Trades:** Non-overlapping trade positions with entry date, exit date, entry price, exit price, holding days, gross return, and net return.
- **Win Rate (%):** Percentage of closed positions with net return $> 0\%$.
- **Average & Median Return (%):** Arithmetic mean and median percentage return per trade.
- **Cumulative Return (%):** Compounded growth of capital across the trade sequence.
- **Best & Worst Result (%):** Maximum single-trade gain and maximum single-trade loss.
- **Maximum Drawdown (%):** Peak-to-trough decline across the simulated equity curve.
- **Recovery Rate & Avg Days to Recover:** Proportion of trades reaching recovery within the holding window and average duration.
- **Return Distribution:** Histogram bucketing trade returns into 6 discrete bins ($< -3\%$, $-3\text{ to }-1\%$, $-1\text{ to }0\%$, $0\text{ to }+1\%$, $+1\text{ to }+3\%$, $> +3\%$).
- **Parameter Sensitivity Sweep:** Automated grid scan varying thresholds ($\pm 0.5\%$) and holding periods ($\pm 2$ days) to evaluate parameter stability and curve-fitting risk.

---

## 11. Data Limitations

To maintain scientific integrity, the limitations of this prototype are explicitly disclosed:

1. **Simulated Research Data:** The prototype runs on a deterministic, synthetic daily price series (260 bars calibrated to NIFTY daily drift and volatility characteristics). It does **not** connect to live market data feeds.
2. **Not a Production Backtesting Platform:** It does not model Level 2 order books, intraday queuing, auction mechanics, or borrowing costs for short positions.
3. **Not a Broker or Execution System:** No real-money trading, order routing, or brokerage APIs are integrated.
4. **Not Investment Advice:** Simulated performance is illustrative; it does not demonstrate an actual market edge or constitute a recommendation to trade.
5. **Assignment Scope:** The purpose of the project is to demonstrate **research workflow discipline, ambiguity handling, assumption transparency, experiment design, and the AI/deterministic boundary** in accordance with the *"Build less. Think more."* philosophy.

---

## 12. AI vs. Deterministic Computation

| Responsibility Domain | Generative AI (Gemini) | Deterministic Code (TypeScript) | Rationale |
| :--- | :---: | :---: | :--- |
| **Natural-Language Understanding** | **Yes** | No | LLMs excel at parsing informal intent and extracting semantic concepts. |
| **Ambiguity Detection** | **Yes** | No | AI flags subjective terminology (*"sharp"*, *"crash"*, *"recover"*). |
| **Clarification Question Framing** | **Yes** | No | Dynamically constructs context-relevant multiple-choice options. |
| **Hypothesis Formulation** | **Yes** | No | Synthesizes falsifiable academic hypothesis statements. |
| **Research Integrity Checks** | No | **Yes** | Rule-based deterministic logic checks symmetry, ranges, and look-ahead risk. |
| **Trade Signal Matching** | No | **Yes** | Requires exact mathematical comparison ($R_{\text{daily}} \le -\text{threshold}$). |
| **Execution Timing & Friction** | No | **Yes** | Next-day open indexing and basis-point deduction must be exact. |
| **Returns, Win Rate & Drawdown** | No | **Yes** | LLMs hallucinate arithmetic; quantitative metrics must be reproducible. |
| **Parameter Sensitivity Sweeps** | No | **Yes** | Grid evaluation across thresholds and holding periods is purely numeric. |
| **Qualitative Synthesis & Discovery**| **Yes** | No | Interprets computed tables, contextualizes risks, and suggests next experiments. |

---

## 13. Key Product Decisions & Trade-offs

1. **Research Assistant vs. Full Trading Terminal:**  
   *Decision:* Focused on the intellectual lifecycle of a trading idea (Ask → Clarify → Challenge → Define → Test → Learn) rather than building multi-asset portfolio accounting or order routing.  
   *Trade-off:* Avoided feature bloat to achieve deep methodological rigor.

2. **The CHALLENGE Stage as a Gatekeeper:**  
   *Decision:* Added a dedicated Research Integrity step between Clarification and Definition.  
   *Trade-off:* Introduces slight user friction, but prevents researchers from wasting computational resources or gaining false confidence from flawed experiment designs.

3. **Deterministic Math over End-to-End LLM Generation:**  
   *Decision:* Kept all numerical simulation in TypeScript, strictly feeding computed data to the LLM for qualitative synthesis.  
   *Trade-off:* Required writing custom simulation and sensitivity functions, but eliminated financial math hallucinations.

4. **Transparent Assumption Provenance vs. Hidden Defaults:**  
   *Decision:* Labeled every parameter with its origin (`USER_PROVIDED`, `AI_SUGGESTED`, `SYSTEM_REQUIRED`, `USER_CONFIRMED`).  
   *Trade-off:* Increases UI complexity, but gives the user full visibility and agency over assumptions.

5. **Canonical Contract to Eliminate Parameter Drift:**  
   *Decision:* Locked parameters into an immutable contract in Stage 4.  
   *Trade-off:* Prevents mid-stream mutations, ensuring Stage 5 and Stage 6 evaluate the exact idea agreed upon in Stage 3.

---

## 14. Key Assumptions

- **Simulated Data Characteristics:** Daily price series generated with a fixed seed (`Mulberry32`), calibrated to 12% annualized drift and 16% annualized volatility.
- **Entry Execution Timing:** Defaults to the **next trading day's open** ($t+1$). Same-day close ($t$) entry is flagged as a look-ahead risk because the signal condition requires knowing the day's close.
- **Holding Period Baseline:** Baseline of 5 trading days reflects short-term mean-reversion horizons without drifting into multi-week macroeconomic trends.
- **Transaction Friction:** Default 10 bps (0.10%) round-trip cost reflects realistic execution friction (brokerage, STT, exchange fees, and half-tick spread) for index derivatives.
- **Single-Lot Non-Overlapping Position Allocation:** The simulation skips new signals while a trade is active to prevent artificial compounding during cascading market drawdowns.
- **Comparison Symmetry:** Comparative experiments enforce identical test windows, holding periods, and friction across Condition A and Condition B.

---

## 15. Getting Started

### Prerequisites
- **Node.js**: `v18.18+` or `v20+` (Tested on Node `v22` and `v24`)
- **npm**: `v9+` or `v10+`

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd tradelens-ai

# Install dependencies
npm install
```

### Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Inside `.env.local`:
```env
# Google Gemini API Key (Optional: if omitted, intelligent heuristic fallback reasoning is used)
GEMINI_API_KEY=your_gemini_api_key_here

# Preferred Gemini Model
GEMINI_MODEL=gemini-2.5-flash

# PostgreSQL Connection String (Optional: if omitted, in-memory repository is used)
DATABASE_URL=postgresql://user:password@ep-sample.neon.tech/neondb?sslmode=require
```

> **Zero-Config Evaluation:**  
> TradeLens AI includes intelligent mock AI reasoning and an in-memory repository. Evaluators can run and test the complete application immediately without configuring API keys or databases.

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 16. Testing

The project includes an automated test suite powered by Vitest:

```bash
npm test
```

### Verified Test Coverage (82 Tests Passing Across 6 Suites)
- `tests/ambiguity.test.ts`: Ambiguity detection, comparative word extraction, off-topic question filtering.
- `tests/integrityAndChallenge.test.ts`: Research integrity checks, baseline requirement enforcement, symmetry validation.
- `tests/researchEngine.test.ts`: Deterministic trade generation, win rate, median, drawdown, and compounding arithmetic.
- `tests/statePropagation.test.ts`: Parameter fidelity across Ask → Clarify → Challenge → Define → Test → Learn.
- `tests/goldenRegression.test.ts`: Master regression suite verifying parameter overrides and hypothesis healing.
- `tests/validation.test.ts`: Zod validation schemas for experiment contracts and API payloads.

---

## 17. Deployment

The application is built for seamless deployment on Vercel or any standard Node.js server:

1. **Production Build:**
   ```bash
   npm run build
   ```
2. **Start Production Server:**
   ```bash
   npm start
   ```
3. **Vercel Deployment:**
   - Import the repository in Vercel.
   - Configure optional environment variables (`GEMINI_API_KEY`, `DATABASE_URL`).
   - Framework preset: **Next.js**.
   - Deploy.

---

## 18. Project Structure

```
tradelens-ai/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts        # Stage 1: NL parsing & ambiguity detection
│   │   ├── clarify/route.ts        # Stage 2: Clarification question generation
│   │   ├── experiment/route.ts     # Stage 3/4: Experiment contract & hypothesis
│   │   ├── experiments/
│   │   │   ├── [id]/route.ts       # Experiment retrieval by ID
│   │   │   └── route.ts            # Experiment listing & persistence
│   │   ├── learn/route.ts          # Stage 6: Qualitative AI synthesis
│   │   └── test/route.ts           # Stage 5: Deterministic simulation execution
│   ├── globals.css                 # Global Tailwind styles & design tokens
│   ├── layout.tsx                  # Root Next.js layout
│   └── page.tsx                    # Main 6-stage research application page
├── components/
│   ├── experiment/                 # Contract display & version comparison components
│   ├── layout/                     # Header, navigation, and container wrappers
│   ├── research/
│   │   ├── AskStage.tsx            # Stage 1 UI
│   │   ├── ClarifyStage.tsx        # Stage 2 UI
│   │   ├── ChallengeStage.tsx      # Stage 3 UI (Research Integrity Gatekeeper)
│   │   ├── DefineStage.tsx         # Stage 4 UI (Canonical Contract Viewer)
│   │   ├── TestStage.tsx           # Stage 5 UI (Deterministic Results & Charts)
│   │   └── LearnStage.tsx          # Stage 6 UI (Evidence vs. AI Synthesis)
│   └── ui/                         # Badges, buttons, modals, cards
├── data/
│   └── mockMarketData.ts           # Deterministic seeded synthetic market bars
├── docs/
│   ├── AI_USAGE_NOTE.md            # Final AI Usage Note (1 page)
│   └── THINKING_NOTE.md            # Final Thinking Note (2 pages)
├── lib/
│   ├── ai/
│   │   ├── gemini.ts               # Google Gemini client integration
│   │   ├── mockAi.ts               # Resilient heuristic mock reasoning fallback
│   │   └── prompts.ts              # Structured system prompts
│   ├── db/
│   │   ├── index.ts                # Drizzle ORM client & in-memory fallback
│   │   └── schema.ts               # PostgreSQL database schema tables
│   ├── research/
│   │   ├── engine.ts               # Deterministic quantitative simulation engine
│   │   └── integrity.ts            # Research integrity audit rules & checks
│   └── validation/
│       └── schemas.ts              # Zod validation schemas
├── tests/                          # 6 Vitest test suites (82 passing tests)
├── types/
│   ├── experiment.ts               # Canonical Experiment Contract & Trade types
│   └── research.ts                 # Research Integrity & Clarification types
├── AI_USAGE_NOTE.md                # Root copy of AI Usage Note
├── THINKING_NOTE.md                # Root copy of Thinking Note
├── drizzle.config.ts               # Drizzle Kit configuration
├── next.config.mjs                 # Next.js build configuration
├── package.json                    # Project dependencies & scripts
├── tailwind.config.ts              # Tailwind CSS configuration
└── vitest.config.ts                # Vitest test runner configuration
```

---

## 19. Future Improvements

The following improvements are planned for future versions beyond the assignment prototype:
1. **Live & Historical Exchange Data:** Ingesting verified daily and tick-level OHLCV data for NSE, BSE, and US equities via formal market data feeds.
2. **Statistical Significance Testing:** Incorporating Monte Carlo permutation tests, bootstrap p-values, and Sharpe ratio confidence intervals to quantify whether observed performance exceeds random noise.
3. **Advanced Slippage & Market Impact Modeling:** Simulating non-linear liquidity degradation during market shock events.
4. **Volatility Regime Conditioning:** Segmenting performance by macroeconomic regimes and implied volatility indicators (e.g., India VIX $> 20$).
5. **Out-of-Sample & Walk-Forward Optimization:** Automated in-sample calibration and out-of-sample stress testing to evaluate curve-fitting.
6. **Experiment Branching & Visual Diffing:** Allowing researchers to branch from a parent experiment contract, alter a single parameter, and visually compare both paths.

---

## 20. AI Tools Used

AI tools were utilized as an accelerator and development partner under strict human oversight:
- **Google Gemini API (`@google/genai` / Gemini 2.5):** Integrated in the application for natural-language parsing, ambiguity detection, and qualitative synthesis.
- **ChatGPT (OpenAI):** Used during initial ideation for brainstorming research schemas and framing quantitative edge cases.
- **AI Coding Assistance (Antigravity IDE):** Used for boilerplate code scaffolding, TypeScript type definitions, UI layouts, and test suite generation.

**Engineering Oversight:**  
All AI suggestions were reviewed, challenged, and modified. When AI models attempted to perform financial arithmetic in text prompts, collapsed comparative questions, or drifted parameters, deterministic TypeScript code and enforcers were implemented to guarantee mathematical and methodological integrity. (See [AI_USAGE_NOTE.md](file:///c:/Users/amihi/.gemini/antigravity/scratch/tradelens-ai/AI_USAGE_NOTE.md) for full reflection).

---

## 21. Assignment Deliverables

- **Working Prototype:** Fully functional Next.js application with 6-stage research workflow.
- **GitHub Repository:** Complete source code with strict TypeScript, tests, and documentation.
- **Thinking Note:** 2-page document on reasoning, trade-offs, and product thinking ([THINKING_NOTE.md](file:///c:/Users/amihi/.gemini/antigravity/scratch/tradelens-ai/THINKING_NOTE.md)).
- **AI Usage Note:** 1-page transparent reflection on AI tooling and human decisions ([AI_USAGE_NOTE.md](file:///c:/Users/amihi/.gemini/antigravity/scratch/tradelens-ai/AI_USAGE_NOTE.md)).
- **Automated Regression Suite:** 82 passing tests verifying research engine determinism and state fidelity.

---

## 22. Disclaimer

TradeLens AI is an educational research prototype. It does not provide financial advice, guarantee trading performance, or execute real-money trades. Quantitative observations are derived from simulated research data for methodology demonstration purposes only.

---

## 23. Author

**Himanshu Upadhyay**  
Candidate for AI Full-Stack Developer Intern | Technical Assignment Submission