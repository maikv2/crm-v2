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
        quotaValueCents: true,
        targetClients: true,
      },
    });

    const items = await Promise.all(
      regions.map(async (region) => {
        try {
          const [monthlyResult, activeShares, preview] = await Promise.all([
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
            prisma.share.findMany({
              where: {
                regionId: region.id,
                isActive: true,
              },
              orderBy: {
                quotaNumber: "asc",
              },
              select: {
                id: true,
                quotaNumber: true,
                amountCents: true,
                ownerType: true,
                investorId: true,
                investor: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            }),
            calculateInvestorDistributionPreview(region.id, month, year),
          ]);

          const activeQuotaCount = activeShares.length;

          const investorShares = activeShares.filter(
            (share) => share.ownerType === "INVESTOR" && share.investorId
          );

          const companyShares = activeShares.filter(
            (share) => share.ownerType === "COMPANY"
          );

          const investorQuotaCount = investorShares.length;
          const companyQuotaCount = companyShares.length;
          const availableQuotaCount = Math.max(
            0,
            region.maxQuotaCount - activeQuotaCount
          );

          const grossRevenueCents = monthlyResult?.grossRevenueCents ?? 0;
          const operatingProfitCents =
            (monthlyResult?.ebitdaCents ?? 0) + (monthlyResult?.reserveCents ?? 0);
          const ebitdaCents = monthlyResult?.ebitdaCents ?? preview.ebitdaCents ?? 0;
          const reserveCents = monthlyResult?.reserveCents ?? 0;

          const investorPoolCents = (preview.investors ?? []).reduce(
            (sum, investor) => sum + (investor.totalDistributionCents ?? 0),
            0
          );

          const companyPoolCents = Math.max(
            0,
            ebitdaCents + reserveCents - investorPoolCents
          );

          const investorsMap = new Map<
            string,
            {
              investorId: string;
              investorName: string;
              email: string | null;
              phone: string | null;
              quotaCount: number;
              quotaNumbers: number[];
              estimatedInvestedCents: number;
            }
          >();

          for (const share of investorShares) {
            if (!share.investorId || !share.investor) continue;

            const current = investorsMap.get(share.investorId);

            if (current) {
              current.quotaCount += 1;
              current.quotaNumbers.push(share.quotaNumber);
              current.estimatedInvestedCents += share.amountCents ?? region.quotaValueCents;
            } else {
              investorsMap.set(share.investorId, {
                investorId: share.investorId,
                investorName: share.investor.name,
                email: share.investor.email ?? null,
                phone: share.investor.phone ?? null,
                quotaCount: 1,
                quotaNumbers: [share.quotaNumber],
                estimatedInvestedCents: share.amountCents ?? region.quotaValueCents,
              });
            }
          }

          const investors = Array.from(investorsMap.values()).sort((a, b) =>
            a.investorName.localeCompare(b.investorName, "pt-BR")
          );

          return {
            regionId: region.id,
            regionName: region.name,
            maxQuotaCount: region.maxQuotaCount,
            quotaValueCents: region.quotaValueCents,
            targetClients: region.targetClients,
            activeQuotaCount,
            companyQuotaCount,
            investorQuotaCount,
            availableQuotaCount,
            grossRevenueCents,
            operatingProfitCents,
            ebitdaCents,
            reserveCents,
            investorPoolCents,
            companyPoolCents,
            valuePerQuotaCents: preview.valuePerQuotaCents ?? 0,
            hasMonthlyResult: !!monthlyResult,
            investors,
          };
        } catch (error) {
          console.error(
            `Erro ao montar resumo de cotas da região ${region.name}:`,
            error
          );

          return {
            regionId: region.id,
            regionName: region.name,
            maxQuotaCount: region.maxQuotaCount,
            quotaValueCents: region.quotaValueCents,
            targetClients: region.targetClients,
            activeQuotaCount: 0,
            companyQuotaCount: 0,
            investorQuotaCount: 0,
            availableQuotaCount: region.maxQuotaCount,
            grossRevenueCents: 0,
            operatingProfitCents: 0,
            ebitdaCents: 0,
            reserveCents: 0,
            investorPoolCents: 0,
            companyPoolCents: 0,
            valuePerQuotaCents: 0,
            hasMonthlyResult: false,
            investors: [],
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
    console.error("GET /api/investors/quotas/summary error:", error);

    return NextResponse.json(
      { error: "Erro ao gerar resumo de cotas." },
      { status: 500 }
    );
  }
}