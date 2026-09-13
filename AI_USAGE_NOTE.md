# TradeLens AI — AI Usage Note
**Option 2 Assignment Submission | Candidate AI Reflection**

---

### 1. AI Tools Used
During the development of TradeLens AI, I utilized three primary AI tools:
- **Google Gemini API (`@google/genai` / Gemini 2.5):** Integrated directly into the running application to power natural language parsing, ambiguity identification, and qualitative synthesis.
- **ChatGPT (OpenAI):** Used during initial ideation for brainstorming research schemas and framing quantitative edge cases.
- **AI Coding Assistance (Antigravity IDE):** Used as an interactive pair programmer for boilerplate scaffolding, TypeScript type definitions, UI layouts, and test suite generation.

---

### 2. How I Used AI
I leveraged AI as an accelerator and development sounding board across specific phases:
- **Workflow Exploration:** Brainstorming the translation of informal trading questions into structured experiment parameters.
- **Ambiguity Modeling:** Exploring diverse linguistic variations of underspecified terms (e.g., "sharp fall", "recovery speed", "bounce").
- **Code & Test Scaffolding:** Accelerating routine React components, Tailwind styling, Drizzle schemas, and drafting initial Vitest test cases.
- **Debugging Assistance:** Investigating complex framework interactions, such as Next.js streaming behaviors and React state update timing during component lifecycle transitions.

---

### 3. Important Decisions I Made Myself
The core intellectual property, architectural integrity, and product direction were entirely driven by my own judgment:
- **Selecting Option 2:** I chose Option 2 and embraced the *"Build less. Think more."* philosophy, prioritizing research integrity over feature sprawl.
- **Inventing the CHALLENGE Stage:** I extended the standard 5-stage pipeline into a 6-stage workflow by creating the **CHALLENGE (Research Integrity)** stage, ensuring experiments are methodologically sound before execution.
- **Strict Separation of Math and AI:** I mandated that no financial arithmetic or trade logic be handled by the LLM. All calculations (returns, win rates, drawdowns, sensitivity) run in a pure deterministic TypeScript engine.
- **The Experiment Contract:** I designed the immutable canonical contract as the single source of truth between stages to eliminate parameter drift.
- **Visible Parameter Provenance:** I insisted that every parameter display its origin (`USER_EXPLICIT`, `AI_SUGGESTED`, or `SYSTEM_DEFAULT`), refusing to let the system silently invent defaults.
- **Simulated Data Scope:** I intentionally used calibrated synthetic daily price series to focus the project on research methodology rather than live market data plumbing.

---

### 4. AI Suggestions I Rejected or Modified
I treated AI suggestions with continuous scrutiny, rejecting and modifying multiple proposals:
- **Rejected LLM Return Calculations:** Early AI prompts attempted to calculate trade outcomes inside LLM text generation. I rejected this entirely due to arithmetic hallucination risks, delegating all math to TypeScript.
- **Corrected Comparison Branch Collapses:** When handling comparative prompts (*"two down days vs. 2% drop"*), AI models frequently collapsed the query into a single condition. I redesigned the extraction schema to enforce symmetric Condition A and Condition B branches.
- **Healed Parameter Drift:** When AI-generated hypotheses drifted from user-clarified values (e.g., altering 2% to 3%), I did not rely on prompt obedience; I built a deterministic Hypothesis Fidelity Enforcer to heal discrepancies.
- **Rejected Real-Market Overclaiming:** I modified qualitative synthesis prompts that attempted to declare real-world trading edges from simulated data, enforcing a strict visual boundary between **Calculated Evidence** and **AI Interpretation**.

---

### 5. What I Am Most Proud Of
The strongest aspect of TradeLens AI is not the fact that it calls an LLM, but the **disciplined research architecture surrounding the LLM**. The system actively resists being an agreeable chatbot: it deconstructs colloquial questions, highlights hidden assumptions, audits experimental symmetry in the CHALLENGE stage, executes bitwise reproducible math, and prompts the researcher to consider what could invalidate their conclusions.

---

### 6. Human Review and Validation
I validated the system manually against diverse question categories:
- **Clean Quantitative:** Precise parameters (*"Buy NIFTY after 2% drop, hold 5 days"*).
- **Ambiguous & Underspecified:** Subjective phrasing (*"Does buying a sharp crash work?"*).
- **Comparative:** Multi-branch queries (*"Two consecutive down days vs. 2% decline"*).
- **Missing Baseline & Contradictory:** Queries missing comparison benchmarks or containing impossible constraints.

Whenever errors arose during testing—such as parent state updates during child renders or parameter synchronization bugs—I investigated the underlying logic, implemented deterministic safeguards, and validated them with an 82-test automated regression suite.
