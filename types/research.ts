export type ResearchStage = "ask" | "clarify" | "challenge" | "define" | "test" | "learn";

export type IntegrityStatus = "READY" | "NEEDS_REVIEW" | "BLOCKED";

export interface IntegrityCheckItem {
  id: string;
  name: string;
  category: "specification" | "validity" | "baseline" | "dataset";
  status: "pass" | "warn" | "block";
  currentValue: string;
  message: string;
  whyItMatters: string;
}

export type ComparisonBaselineOptionId =
  | "normal_days"
  | "non_trigger_days"
  | "another_condition"
  | "absolute_return";

export interface ComparisonBaselineOption {
  id: ComparisonBaselineOptionId;
  label: string;
  description: string;
}

export interface ResearchIntegrityResult {
  status: IntegrityStatus;
  canProceed: boolean;
  score: {
    passed: number;
    warnings: number;
    blocked: number;
    total: number;
  };
  checks: IntegrityCheckItem[];
  missingComparisonBaseline: boolean;
  comparisonBaselineExplanation?: string;
  comparisonBaselineOptions: ComparisonBaselineOption[];
  blockingReasons: string[];
  warningReasons: string[];
}

export interface ClarificationOption {
  id: string;
  label: string;
  value: any;
  isDefault?: boolean;
  description?: string;
}

export interface ClarificationQuestion {
  id: string;
  category: "threshold" | "holding_period" | "test_period" | "exit_rule" | "market";
  title: string;
  prompt: string;
  options: ClarificationOption[];
  allowCustom?: boolean;
  selectedOptionId?: string;
  customValue?: string;
}

export interface ProposedAssumption {
  id: string;
  label: string;
  rationale: string;
  source: "USER PROVIDED" | "AI SUGGESTED" | "SYSTEM REQUIRED" | "USER CONFIRMED" | "AI suggested";
  category?: string;
  whyItMatters?: string;
  isConfirmed?: boolean;
}

import { ComparisonBranch, ContextCondition } from "./experiment";

export interface SemanticIntent {
  instrument: string;
  primaryEvent: string;
  contextConditionPhrases: string[];
  evaluationIntent?: string;
}

export interface AnalysisResult {
  originalQuestion: string;
  instrument: string;
  timeframe: string;
  detectedCondition: string;
  isAmbiguous: boolean;
  ambiguitySummary: string;
  missingInformation: string[];
  clarificationQuestions: ClarificationQuestion[];
  proposedAssumptions: ProposedAssumption[];
  preliminaryHypothesis: string;
  proposedThreshold?: number;
  proposedHoldingDays?: number;
  confidence: "low" | "medium" | "high";
  experimentType?: "single" | "comparison";
  comparisons?: [ComparisonBranch, ComparisonBranch];
  comparisonMetric?: string;
  comparisonDirection?: string;
  hasExplicitThreshold?: boolean;
  detectedAmbiguousPhrase?: string;
  contextConditions?: ContextCondition[];
  semanticIntent?: SemanticIntent;
}

export interface InterpretationResult {
  dataSummary: string; // Deterministic calculation summary
  reasonableConclusions: string; // AI interpretation with scientific caveats
  risksAndLimitations: string[]; // Research risks & sample limitations
  followUpQuestions: string[]; // 3-5 targeted next research questions
}