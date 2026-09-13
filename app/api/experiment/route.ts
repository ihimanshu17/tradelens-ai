import { NextRequest, NextResponse } from "next/server";
import { ExperimentDataSchema } from "@/lib/validation/schemas";
import { saveExperiment, addExperimentVersion } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { experimentId, experimentData, originalQuestion, changeSummary } = body;

    const validation = ExperimentDataSchema.safeParse(experimentData);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid experiment data",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    if (experimentId) {
      // Create new version for existing experiment
      const newVersion = await addExperimentVersion(
        experimentId,
        validation.data,
        changeSummary || `Updated parameters (Holding: ${validation.data.holdingPeriod}d)`
      );
      return NextResponse.json({
        success: true,
        version: newVersion,
      });
    }

    // New experiment
    const experiment = await saveExperiment(
      validation.data,
      originalQuestion || `Research on ${validation.data.market}`,
      `${validation.data.market} — ${validation.data.condition.description}`
    );

    return NextResponse.json({
      success: true,
      experiment,
    });
  } catch (error: any) {
    console.error("API /api/experiment error:", error);
    return NextResponse.json(
      { error: "Failed to persist experiment", message: error.message },
      { status: 500 }
    );
  }
}
