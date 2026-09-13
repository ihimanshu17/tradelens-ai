import { NextRequest, NextResponse } from "next/server";
import { RunExperimentRequestSchema } from "@/lib/validation/schemas";
import { runExperiment } from "@/lib/research/engine";
import { saveResult } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = RunExperimentRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid experiment payload for testing",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { experiment, experimentId } = validation.data;

    // Run deterministic research engine
    const result = runExperiment(experiment);

    if (experimentId) {
      result.experimentId = experimentId;
      await saveResult(experimentId, result);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/test error:", error);
    return NextResponse.json(
      {
        error: "Research engine execution failed",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
