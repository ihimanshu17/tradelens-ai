import { NextRequest, NextResponse } from "next/server";
import { ClarifyRequestSchema } from "@/lib/validation/schemas";
import { ExperimentData, generateHypothesis } from "@/types/experiment";
import { saveExperiment } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ClarifyRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid clarification choices",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    const isComparison =
      data.experimentType === "comparison" &&
      data.comparisons &&
      data.comparisons.length >= 2;

    let conditionDescription = isComparison
      ? `${data.comparisons[0].name} VS ${data.comparisons[1].name}`
      : data.threshold > 0
      ? `Daily decline >= ${data.threshold}%`
      : `Daily decline >= 2%`;

    if (data.contextConditions && Array.isArray(data.contextConditions) && data.contextConditions.length > 0) {
      const ctxLabel = data.contextConditions[0].period
        ? `prior ${data.contextConditions[0].period}-day weakness`
        : data.contextConditions[0].label;
      conditionDescription = `${conditionDescription} after ${ctxLabel}`;
    }

    const primaryCondition = isComparison
      ? data.comparisons[0].condition
      : {
          type: "daily_decline" as const,
          threshold: data.threshold,
          description: conditionDescription,
        };

    const exitDescription =
      data.exitType === "stop_loss"
        ? `Stop loss at 2% risk cap or close after ${data.holdingDays} days`
        : data.exitType === "profit_target"
        ? `Profit target at 3% or close after ${data.holdingDays} days`
        : `Close after ${data.holdingDays} trading days`;

    const hypothesis = generateHypothesis({
      instrument: data.instrument,
      threshold: data.threshold,
      conditionThreshold: data.threshold,
      holdingPeriod: data.holdingDays,
      experimentType: data.experimentType,
      comparisons: data.comparisons,
      contextConditions: data.contextConditions,
    });

    const experimentData: ExperimentData = {
      market: data.instrument,
      instrument: data.instrument,
      timeframe: data.timeframe,
      condition: primaryCondition,
      entry: {
        type: "next_open",
        description: "Buy at next trading day's open",
      },
      exit: {
        type: data.exitType,
        days: data.holdingDays,
        stopLossPercent: data.exitType === "stop_loss" ? 2.0 : undefined,
        takeProfitPercent: data.exitType === "profit_target" ? 3.0 : undefined,
        description: exitDescription,
      },
      holdingPeriod: data.holdingDays,
      testPeriod: {
        start: `${2025 - data.testYears}-01-01`,
        end: "2025-01-01",
        label: `Last ${data.testYears} years`,
      },
      costAssumption: data.costAssumption,
      hypothesis,
      filters: ["Single position execution", "Round-trip friction included"],
      experimentType: data.experimentType,
      comparisons: data.comparisons,
      comparisonMetric: data.comparisonMetric,
      comparison: isComparison
        ? {
            enabled: true,
            conditionA: data.comparisons[0].condition,
            conditionB: data.comparisons[1].condition,
            metric: data.comparisonMetric || "5-day return",
          }
        : undefined,
      contextConditions: data.contextConditions,
      unsupportedContextNotice:
        data.contextConditions && data.contextConditions.length > 0
          ? "Context condition identified but not yet supported by the prototype simulation engine."
          : undefined,
      threshold: data.threshold,
      lookbackPeriod: data.testYears,
      friction: data.costAssumption,
      originalQuestion: data.originalQuestion,
    };

    const experiment = await saveExperiment(
      experimentData,
      data.originalQuestion,
      `${data.instrument} - ${conditionDescription}`
    );

    return NextResponse.json({
      experiment,
      experimentData,
    });
  } catch (error: any) {
    console.error("API /api/clarify error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate experiment from clarification",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
