import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  question: z.string().trim().min(3, "Research question must be at least 3 characters long"),
});

export const ClarifyRequestSchema = z.object({
  originalQuestion: z.string().min(3),
  instrument: z.string().default("NIFTY"),
  timeframe: z.string().default("daily"),
  threshold: z.number().min(0.1).max(50),
  holdingDays: z.number().int().min(1).max(120),
  testYears: z.number().int().min(1).max(20).default(5),
  exitType: z.enum(["holding_period", "stop_loss", "profit_target"]).default("holding_period"),
  costAssumption: z.number().min(0).max(0.05).default(0.001), // 0.10%
  customNotes: z.string().optional(),
  experimentType: z.enum(["single", "comparison"]).optional(),
  comparisons: z.any().optional(),
  comparisonMetric: z.string().optional(),
  contextConditions: z.any().optional(),
});

export const ExperimentConditionSchema = z.object({
  type: z.enum(["daily_decline", "daily_gain", "gap_down", "consecutive_down", "volatility_spike"]),
  threshold: z.number().positive(),
  consecutiveDays: z.number().int().positive().optional(),
  description: z.string(),
});

export const ExperimentEntrySchema = z.object({
  type: z.enum(["next_open", "same_close"]),
  description: z.string(),
});

export const ExperimentExitSchema = z.object({
  type: z.enum(["holding_period", "stop_loss", "profit_target"]),
  days: z.number().int().positive(),
  stopLossPercent: z.number().optional(),
  takeProfitPercent: z.number().optional(),
  description: z.string(),
});

export const TestPeriodSchema = z.object({
  start: z.string(),
  end: z.string(),
  label: z.string(),
});

export const ExperimentDataSchema = z.object({
  market: z.string(),
  instrument: z.string().optional(),
  timeframe: z.string(),
  condition: ExperimentConditionSchema,
  entry: ExperimentEntrySchema,
  exit: ExperimentExitSchema,
  holdingPeriod: z.number().int().positive(),
  testPeriod: TestPeriodSchema,
  costAssumption: z.number().min(0).max(0.05),
  hypothesis: z.string(),
  filters: z.array(z.string()).optional(),
  experimentType: z.enum(["single", "comparison"]).optional(),
  comparisons: z.any().optional(),
  comparisonMetric: z.string().optional(),
  threshold: z.number().optional(),
  lookbackPeriod: z.number().int().positive().optional(),
  friction: z.number().min(0).max(0.05).optional(),
  entryRule: z.enum(["next_open", "same_close"]).optional(),
  exitRule: z.enum(["holding_period", "stop_loss", "profit_target"]).optional(),
  originalQuestion: z.string().optional(),
  canonical: z.any().optional(),
  contextConditions: z.any().optional(),
  unsupportedContextNotice: z.string().optional(),
  unsupportedComparisonNotice: z.string().optional(),
});

export const RunExperimentRequestSchema = z.object({
  experimentId: z.string().optional(),
  experiment: ExperimentDataSchema,
});

export const LearnRequestSchema = z.object({
  experiment: ExperimentDataSchema,
  resultSummary: z.object({
    observations: z.number(),
    winningTrades: z.number(),
    losingTrades: z.number(),
    winRate: z.number(),
    averageReturn: z.number(),
    medianReturn: z.number(),
    bestReturn: z.number(),
    worstReturn: z.number(),
    cumulativeReturn: z.number(),
    comparisonResults: z.any().optional(),
  }),
});

export const AIStructuredAnalysisSchema = z.object({
  instrument: z.string(),
  timeframe: z.string(),
  detectedCondition: z.string(),
  isAmbiguous: z.boolean(),
  ambiguitySummary: z.string(),
  missingInformation: z.array(z.string()),
  proposedThreshold: z.number().optional(),
  proposedHoldingDays: z.number().optional(),
  hypothesis: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});
