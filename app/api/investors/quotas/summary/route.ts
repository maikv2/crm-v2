import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateInvestorDistributionPreview } from "@/lib/investor-distribution";
import { calculateDailyRegionSnapshot } from "@/lib/region-daily-engine";

export const dynamic = "force-dynamic";

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
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
    const year = Number(searchParams.get("year") ?? now.getFullYear());

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
        // PASSO 1: contar cotas — não depende de fechamento mensal e nunca pode zerar.
        let activeShares: Array<{
          id: string;
          quotaNumber: number;
          amountCents: number;
          ownerType: "COMPANY" | "INVESTOR";
          investorId: string | null;
          investor: {
            id: string;
            name: string;
            email: string | null;
            phone: string | null;
          } | null;
        }> = [];

        try {
          activeShares = await prisma.share.findMany({
            where: {
              regionId: region.id,
              OR: [{ isActive: true }, { investorId: { not: null } }],
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
          });
        } catch (sharesError) {
          console.error(
            `Erro ao carregar cotas da região ${region.name}:`,
            sharesError
          );
        }

        const activeQuotaCount = activeShares.length;

        const investorShares = activeShares.filter(
          (share) =>
            share.investorId &&
            (share.ownerType === "INVESTOR" || share.investorId !== null)
        );

        const companyShares = activeShares.filter(
          (share) => !share.investorId && share.ownerType === "COMPANY"
        );

        const investorQuotaCount = investorShares.length;
        const companyQuotaCount = companyShares.length;
        const availableQuotaCount = Math.max(
          0,
          region.maxQuotaCount - activeQuotaCount
        );

        // PASSO 2: cálculos financeiros. Se algum falhar (ex.: sem fechamento
        // mensal ainda), seguimos com 0 nos valores monetários — mas mantemos
        // a contagem correta de cotas calculada acima.
        let monthlyResult: {
          grossRevenueCents: number;
          ebitdaCents: number;
          reserveCents: number;
        } | null = null;

        try {
          monthlyResult = await prisma.regionMonthlyResult.findFirst({
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
          });
        } catch (monthlyError) {
          console.error(
            `Erro ao carregar resultado mensal da região ${region.name}:`,
            monthlyError
          );
        }

        let preview: Awaited<
          ReturnType<typeof calculateInvestorDistributionPreview>
        > | null = null;

        try {
          preview = await calculateInvestorDistributionPreview(
            region.id,
            month,
            year
          );
        } catch (previewError) {
          console.warn(
            `Preview de distribuição indisponível para ${region.name} (provavelmente sem fechamento mensal ${month}/${year}).`
          );
        }

        let dailySnapshot: Awaited<
          ReturnType<typeof calculateDailyRegionSnapshot>
        > | null = null;

        try {
          dailySnapshot = await calculateDailyRegionSnapshot(
            region.id,
            month,
            year
          );
        } catch (snapshotError) {
          console.warn(
            `Snapshot diário indisponível para ${region.name}.`
          );
        }

        try {
          const grossRevenueCents =
            dailySnapshot?.grossRevenueCents ??
            monthlyResult?.grossRevenueCents ??
            0;

          const operatingProfitCents =
            dailySnapshot?.operatingProfitCents ??
            ((monthlyResult?.ebitdaCents ?? 0) + (monthlyResult?.reserveCents ?? 0));

          const ebitdaCents =
            dailySnapshot?.ebitdaEstimatedCents ??
            monthlyResult?.ebitdaCents ??
            preview?.ebitdaCents ??
            0;

          const reserveCents =
            dailySnapshot?.reserveEstimatedCents ??
            monthlyResult?.reserveCents ??
            0;

          const investorPoolCents =
            dailySnapshot?.estimatedInvestorPoolCents ??
            (preview?.investors ?? []).reduce(
              (sum, investor) => sum + (investor.totalDistributionCents ?? 0),
              0
            );

          const companyPoolCents =
            dailySnapshot?.estimatedCompanyPoolCents ??
            Math.max(0, ebitdaCents + reserveCents - investorPoolCents);

          const valuePerQuotaCents =
            dailySnapshot?.estimatedValuePerInvestorQuotaCents ??
            preview?.valuePerQuotaCents ??
            0;

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
              current.estimatedInvestedCents +=
                share.amountCents ?? region.quotaValueCents;
            } else {
              investorsMap.set(share.investorId, {
                investorId: share.investorId,
                investorName: share.investor.name,
                email: share.investor.email ?? null,
                phone: share.investor.phone ?? null,
                quotaCount: 1,
                quotaNumbers: [share.quotaNumber],
                estimatedInvestedCents:
                  share.amountCents ?? region.quotaValueCents,
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
            valuePerQuotaCents,
            hasMonthlyResult: Boolean(monthlyResult),
            investors,
          };
        } catch (error) {
          console.error(
            `Erro ao montar resumo financeiro da região ${region.name}:`,
            error
          );

          // Mantém a contagem de cotas correta mesmo se os cálculos
          // financeiros falharem.
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