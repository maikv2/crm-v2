import { NextRequest, NextResponse } from "next/server";
import { calculateInvestorDistributionPreview } from "@/lib/investor-distribution";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const regionId = searchParams.get("regionId");
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!regionId) {
      return NextResponse.json(
        { error: "regionId é obrigatório." },
        { status: 400 }
      );
    }

    if (!month || !year) {
      return NextResponse.json(
        { error: "month e year são obrigatórios." },
        { status: 400 }
      );
    }

    const data = await calculateInvestorDistributionPreview(
      regionId,
      month,
      year
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/investors/distributions/preview error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor.",
      },
      { status: 500 }
    );
  }
}