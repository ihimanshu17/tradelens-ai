import { NextRequest, NextResponse } from "next/server";
import { getExperimentById } from "@/lib/db/repository";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await getExperimentById(id);

    if (!data.experiment) {
      return NextResponse.json(
        { error: "Experiment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API /api/experiments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve experiment details", message: error.message },
      { status: 500 }
    );
  }
}
