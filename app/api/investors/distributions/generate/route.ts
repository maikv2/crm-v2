import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvestorDistributions } from "@/lib/investor-distribution";

function isValidMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const regionId =
      typeof body.regionId === "string" && body.regionId.trim()
        ? body.regionId.trim()
        : undefined;

    const generateAllRegions = Boolean(body.generateAllRegions);
    const month = Number(body.month);
    const year = Number(body.year);

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

    if (!regionId && !generateAllRegions) {
      return NextResponse.json(
        { error: "Informe regionId ou generateAllRegions=true." },
        { status: 400 }
      );
    }

    if (regionId && generateAllRegions) {
      return NextResponse.json(
        { error: "Use apenas regionId ou generateAllRegions, não ambos." },
        { status: 400 }
      );
    }

    if (generateAllRegions) {
      const regions = await prisma.region.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      if (regions.length === 0) {
        return NextResponse.json(
          { error: "Nenhuma região ativa encontrada." },
          { status: 404 }
        );
      }

      const results: {
        regionId: string;
        regionName: string;
        success: boolean;
        data?: unknown;
        error?: string;
      }[] = [];

      for (const region of regions) {
        try {
          const data = await generateInvestorDistributions(region.id, month, year);

          results.push({
            regionId: region.id,
            regionName: region.name,
            success: true,
            data,
          });
        } catch (error) {
          console.error(
            `Erro ao gerar distribuição da região ${region.name}:`,
            error
          );

          results.push({
            regionId: region.id,
            regionName: region.name,
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Erro interno ao gerar distribuição.",
          });
        }
      }

      const successCount = results.filter((item) => item.success).length;
      const errorCount = results.length - successCount;

      return NextResponse.json({
        success: errorCount === 0,
        month,
        year,
        generateAllRegions: true,
        totalRegions: results.length,
        successCount,
        errorCount,
        results,
      });
    }

    const region = await prisma.region.findUnique({
      where: { id: regionId! },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada." },
        { status: 404 }
      );
    }

    if (!region.active) {
      return NextResponse.json(
        { error: "A região informada está inativa." },
        { status: 400 }
      );
    }

    const data = await generateInvestorDistributions(region.id, month, year);

    return NextResponse.json({
      success: true,
      month,
      year,
      regionId: region.id,
      regionName: region.name,
      data,
    });
  } catch (error) {
    console.error("POST /api/investors/distributions/generate error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno do servidor.",
      },
      { status: 500 }
    );
  }
}