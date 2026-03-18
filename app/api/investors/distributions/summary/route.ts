import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateInvestorDistributionPreview } from "@/lib/investor-distribution";

function isValidMonth(month: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!isValidMonth(month) || !isValidYear(year)) {
      return NextResponse.json(
        { error: "month e year são obrigatórios e válidos." },
        { status: 400 }
      );
    }

    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        maxQuotaCount: true,
      },
    });

    const items = await Promise.all(
      regions.map(async (region) => {
        try {
          const [monthlyResult, preview] = await Promise.all([
            prisma.regionMonthlyResult.findFirst({
              where: {
                regionId: region.id,
                month,
                year,
              },
              select: {
                grossRevenueCents: true,
                ebitdaCents: true,
                reserveCents: true,
              },
            }),
            calculateInvestorDistributionPreview(region.id, month, year),
          ]);

          const grossRevenueCents = monthlyResult?.grossRevenueCents ?? 0;
          const ebitdaCents = monthlyResult?.ebitdaCents ?? preview.ebitdaCents ?? 0;
          const reserveCents = monthlyResult?.reserveCents ?? 0;
          const operatingProfitCents = ebitdaCents + reserveCents;

          const investorPoolCents = (preview.investors ?? []).reduce(
            (sum, investor) => sum + (investor.totalDistributionCents ?? 0),
            0
          );

          const companyPoolCents = Math.max(
            0,
            ebitdaCents + reserveCents - investorPoolCents
          );

          return {
            regionId: region.id,
            regionName: region.name,
            month,
            year,
            grossRevenueCents,
            operatingProfitCents,
            ebitdaCents,
            reserveCents,
            totalBaseCents: ebitdaCents + reserveCents,
            investorPoolCents,
            companyPoolCents,
            activeQuotaCount: preview.activeQuotaCount,
            companyQuotaCount: preview.companyQuotaCount,
            investorQuotaCount: preview.investorQuotaCount,
            availableQuotaCount: Math.max(
              0,
              region.maxQuotaCount - preview.activeQuotaCount
            ),
            valuePerQuotaCents: preview.valuePerQuotaCents,
            investors: preview.investors,
            hasMonthlyResult: !!monthlyResult,
          };
        } catch (error) {
          console.error(
            `Erro ao montar resumo de distribuição da região ${region.name}:`,
            error
          );

          return {
            regionId: region.id,
            regionName: region.name,
            month,
            year,
            grossRevenueCents: 0,
            operatingProfitCents: 0,
            ebitdaCents: 0,
            reserveCents: 0,
            totalBaseCents: 0,
            investorPoolCents: 0,
            companyPoolCents: 0,
            activeQuotaCount: 0,
            companyQuotaCount: 0,
            investorQuotaCount: 0,
            availableQuotaCount: region.maxQuotaCount,
            valuePerQuotaCents: 0,
            investors: [],
            hasMonthlyResult: false,
          };
        }
      })
    );

    return NextResponse.json({
      month,
      year,
      items,
    });
  } catch (error) {
    console.error("GET /api/investors/distributions/summary error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar resumo de distribuição." },
      { status: 500 }
    );
  }
}