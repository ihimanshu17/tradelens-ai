import { NextRequest, NextResponse } from "next/server";
import { LearnRequestSchema } from "@/lib/validation/schemas";
import { interpretResults } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = LearnRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid learning request",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { experiment, resultSummary } = validation.data;

    // AI qualitative interpretation
    const interpretation = await interpretResults(experiment, {
      observations: resultSummary.observations,
      winningTrades: resultSummary.winningTrades,
      losingTrades: resultSummary.losingTrades,
      winRate: resultSummary.winRate,
      averageReturn: resultSummary.averageReturn,
      medianReturn: resultSummary.medianReturn,
      bestReturn: resultSummary.bestReturn,
      worstReturn: resultSummary.worstReturn,
      cumulativeReturn: resultSummary.cumulativeReturn,
      comparisonResults: (resultSummary as any).comparisonResults,
    });

    return NextResponse.json(interpretation);
  } catch (error: any) {
    console.error("API /api/learn error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI interpretation",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
