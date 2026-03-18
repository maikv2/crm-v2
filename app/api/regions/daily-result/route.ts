import { NextRequest, NextResponse } from "next/server";
import {
  calculateAllRegionsDailySnapshots,
  calculateDailyRegionSnapshot,
} from "@/lib/region-daily-engine";

function isValidMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();

    const regionId =
      typeof searchParams.get("regionId") === "string" &&
      searchParams.get("regionId")?.trim()
        ? String(searchParams.get("regionId")).trim()
        : undefined;

    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
    const year = Number(searchParams.get("year") ?? now.getFullYear());

    if (!isValidMonth(month)) {
      return NextResponse.json(
        { error: "month deve ser um número entre 1 e 12." },
        { status: 400 }
      );
    }

    if (!isValidYear(year)) {
      return NextResponse.json(
        { error: "year deve ser um ano válido." },
        { status: 400 }
      );
    }

    if (regionId) {
      const data = await calculateDailyRegionSnapshot(regionId, month, year);

      return NextResponse.json({
        success: true,
        month,
        year,
        regionId,
        data,
      });
    }

    const results = await calculateAllRegionsDailySnapshots(month, year);

    return NextResponse.json({
      success: true,
      month,
      year,
      items: results,
    });
  } catch (error) {
    console.error("GET /api/regions/daily-result error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao calcular resultado diário.",
      },
      { status: 500 }
    );
  }
}