import { NextRequest, NextResponse } from "next/server";
import { AnalyzeRequestSchema } from "@/lib/validation/schemas";
import { analyzeQuestion } from "@/lib/ai/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = AnalyzeRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validation.error.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const { question } = validation.data;
    const analysis = await analyzeQuestion(question);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("API /api/analyze error:", error);
    const isValidationOrScope =
      error.message?.includes("I need more information") ||
      error.message?.includes("appears to be an off-topic") ||
      error.message?.includes("appears to be a general") ||
      error.message?.includes("Contradictory parameter") ||
      error.message?.includes("Please provide");
    const status = isValidationOrScope ? 400 : 500;
    return NextResponse.json(
      {
        error: isValidationOrScope ? "Unsupported research input" : "AI analysis encountered an issue",
        message: error.message || "Failed to analyze research question",
      },
      { status }
    );
  }
}
