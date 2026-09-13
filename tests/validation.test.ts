import { describe, it, expect } from "vitest";
import {
  AnalyzeRequestSchema,
  ClarifyRequestSchema,
  ExperimentDataSchema,
} from "@/lib/validation/schemas";

describe("Validation Schemas", () => {
  it("validates research question correctly", () => {
    const valid = AnalyzeRequestSchema.safeParse({
      question: "Does buying NIFTY after a sharp fall work?",
    });
    expect(valid.success).toBe(true);

    const invalid = AnalyzeRequestSchema.safeParse({ question: "  " });
    expect(invalid.success).toBe(false);
  });

  it("validates clarification selections correctly", () => {
    const valid = ClarifyRequestSchema.safeParse({
      originalQuestion: "Does buying NIFTY after a sharp fall work?",
      instrument: "NIFTY",
      timeframe: "daily",
      threshold: 2.0,
      holdingDays: 5,
      testYears: 5,
      exitType: "holding_period",
      costAssumption: 0.001,
    });
    expect(valid.success).toBe(true);

    // Negative threshold or excessive cost rejected
    const invalidCost = ClarifyRequestSchema.safeParse({
      originalQuestion: "Does buying NIFTY work?",
      threshold: 2.0,
      holdingDays: 5,
      costAssumption: 0.15, // > 5% round trip is unreasonable
    });
    expect(invalidCost.success).toBe(false);
  });

  it("validates structured experiment schema", () => {
    const validExp = ExperimentDataSchema.safeParse({
      market: "NIFTY",
      timeframe: "daily",
      condition: {
        type: "daily_decline",
        threshold: 2.5,
        description: "Daily decline >= 2.5%",
      },
      entry: {
        type: "next_open",
        description: "Buy at next open",
      },
      exit: {
        type: "holding_period",
        days: 5,
        description: "Close after 5 days",
      },
      holdingPeriod: 5,
      testPeriod: {
        start: "2020-01-01",
        end: "2025-01-01",
        label: "Last 5 years",
      },
      costAssumption: 0.001,
      hypothesis: "Test hypothesis",
    });
    expect(validExp.success).toBe(true);
  });
});
