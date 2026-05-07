import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateQuarterlyFundPreview,
  generateQuarterlyFundDistributions,
} from "@/lib/investor-distribution";

function isValidQuarter(q: number) {
  return Number.isInteger(q) && q >= 1 && q <= 4;
}

function isValidYear(y: number) {
  return Number.isInteger(y) && y >= 2000 && y <= 2100;
}

// GET /api/investors/distributions/quarterly-fund?quarter=1&year=2026
// Returns preview of quarterly fund distribution for all active regions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quarter = Number(searchParams.get("quarter"));
    const year = Number(searchParams.get("year"));

    if (!isValidQuarter(quarter) || !isValidYear(year)) {
      return NextResponse.json(
        { error: "quarter (1-4) e year são obrigatórios." },
        { status: 400 }
      );
    }

    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    const items = await Promise.all(
      regions.map(async (region) => {
        try {
          const preview = await calculateQuarterlyFundPreview(region.id, quarter, year);
          return {
            ...preview,
            regionName: region.name,
            hasData: preview.quarterlyFundTotalCents > 0,
          };
        } catch {
          return {
            regionId: region.id,
            regionName: region.name,
            quarter,
            year,
            quarterlyFundTotalCents: 0,
            activeQuotaCount: 0,
            investorQuotaCount: 0,
            valuePerQuotaCents: 0,
            anchorResultId: null,
            investors: [],
            hasData: false,
          };
        }
      })
    );

    return NextResponse.json({ quarter, year, items });
  } catch (error) {
    console.error("GET /api/investors/distributions/quarterly-fund error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar fundo trimestral." },
      { status: 500 }
    );
  }
}

// POST /api/investors/distributions/quarterly-fund
// Body: { regionId, quarter, year } OR { generateAllRegions: true, quarter, year }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quarter, year, generateAllRegions, regionId } = body as {
      quarter: number;
      year: number;
      generateAllRegions?: boolean;
      regionId?: string;
    };

    if (!isValidQuarter(quarter) || !isValidYear(year)) {
      return NextResponse.json(
        { error: "quarter (1-4) e year são obrigatórios." },
        { status: 400 }
      );
    }

    if (generateAllRegions) {
      const regions = await prisma.region.findMany({
        where: { active: true },
        select: { id: true, name: true },
      });

      const results = await Promise.all(
        regions.map(async (region) => {
          try {
            const data = await generateQuarterlyFundDistributions(region.id, quarter, year);
            return { regionId: region.id, regionName: region.name, success: true, data };
          } catch (err) {
            return {
              regionId: region.id,
              regionName: region.name,
              success: false,
              error: err instanceof Error ? err.message : "Erro desconhecido.",
            };
          }
        })
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;
      return NextResponse.json({ ok: true, successCount, errorCount, results });
    }

    if (!regionId) {
      return NextResponse.json({ error: "regionId é obrigatório." }, { status: 400 });
    }

    const data = await generateQuarterlyFundDistributions(regionId, quarter, year);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("POST /api/investors/distributions/quarterly-fund error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar fundo trimestral." },
      { status: 500 }
    );
  }
}

