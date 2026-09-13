import { NextResponse } from "next/server";
import { getExperiments } from "@/lib/db/repository";

export async function GET() {
  try {
    const list = await getExperiments();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("API /api/experiments error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve experiments", message: error.message },
      { status: 500 }
    );
  }
}
