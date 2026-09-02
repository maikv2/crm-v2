import { prisma } from "@/lib/prisma";
import { calculateRegionFinancialSnapshot, recalculateRegionMonthlyResult } from "@/lib/region-financial-engine";

// Regra vigente (definitiva, sem período de payback):
// 60% do valor distribuível de cada cota vai para o investidor, 40% fica com a empresa.
const INVESTOR_SPLIT_RATE_BPS = 6000;

type InvestorPreviewItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  totalDistributionCents: number;
  quotaNumbers: number[];
};

function safeDivideInt(total: number, divisor: number) {
  if (!divisor || divisor <= 0) return 0;
  return Math.floor(total / divisor);
}

export async function calculateInvestorDistributionPreview(
  regionId: string,
  month: number,
  year: number
) {
  const monthlyResult = await prisma.regionMonthlyResult.findUnique({
    where: {
      regionId_month_year: {
        regionId,
        month,
        year,
      },
    },
  });

  // Fall back to live calculation when no saved result exists yet
  const liveSnapshot = monthlyResult
    ? null
    : await calculateRegionFinancialSnapshot(regionId, month, year).catch(() => null);

  const grossRevenueCents = monthlyResult?.grossRevenueCents ?? liveSnapshot?.grossRevenueCents ?? 0;
  const cmvCents = monthlyResult?.cmvCents ?? liveSnapshot?.cmvCents ?? 0;
  const logisticsCents = monthlyResult?.logisticsCents ?? liveSnapshot?.logisticsCents ?? 0;
  const commissionCents = monthlyResult?.commissionCents ?? liveSnapshot?.commissionCents ?? 0;
  const taxesCents = monthlyResult?.taxesCents ?? liveSnapshot?.taxesCents ?? 0;
  const administrativeCents = monthlyResult?.administrativeCents ?? liveSnapshot?.administrativeCents ?? 0;

  const operatingProfitCents =
    grossRevenueCents - cmvCents - logisticsCents - commissionCents - taxesCents - administrativeCents;

  const stockReplenishmentCents =
    liveSnapshot?.stockReplenishmentCents ?? monthlyResult?.reserveCents ?? 0;

  const distributableCents = Math.max(0, operatingProfitCents) - stockReplenishmentCents;

  const [region, shares] = await Promise.all([
    prisma.region.findUnique({
      where: { id: regionId },
      select: { maxQuotaCount: true },
    }),
    prisma.share.findMany({
      where: {
        regionId,
        isActive: true,
      },
      include: {
        investor: true,
      },
      orderBy: {
        quotaNumber: "asc",
      },
    }),
  ]);

  const activeQuotaCount = shares.length;
  const companyShares = shares.filter((s) => s.ownerType === "COMPANY");
  const investorShares = shares.filter((s) => s.ownerType === "INVESTOR" && s.investorId);

  // A região sempre representa 100% do lucro em `maxQuotaCount` cotas (10, por
  // padrão) — mesmo que nem todas tenham sido emitidas/vendidas ainda. Cotas
  // não emitidas ficam implicitamente com a empresa (não entram no pool do
  // investidor). Por isso o divisor é a capacidade total da região, não o
  // número de cotas já cadastradas como Share.
  const totalQuotaCount = region?.maxQuotaCount || activeQuotaCount || 1;

  // Cada cota recebe uma fatia igual do valor distribuível; o investidor da cota
  // fica com 60% dessa fatia (o restante, 40%, entra no pool da empresa).
  const perQuotaCents = safeDivideInt(distributableCents, totalQuotaCount);
  const valuePerQuotaCents = Math.floor((perQuotaCents * INVESTOR_SPLIT_RATE_BPS) / 10000);

  const grouped = new Map<string, InvestorPreviewItem>();

  for (const share of investorShares) {
    if (!share.investorId || !share.investor) continue;

    const existing = grouped.get(share.investorId);

    if (!existing) {
      grouped.set(share.investorId, {
        investorId: share.investorId,
        investorName: share.investor.name,
        investorEmail: share.investor.email ?? null,
        quotaCount: 1,
        totalDistributionCents: valuePerQuotaCents,
        quotaNumbers: [share.quotaNumber],
      });
      continue;
    }

    existing.quotaCount += 1;
    existing.totalDistributionCents += valuePerQuotaCents;
    existing.quotaNumbers.push(share.quotaNumber);
  }

  const investorPoolCents = Array.from(grouped.values()).reduce(
    (sum, item) => sum + item.totalDistributionCents,
    0
  );
  const companyPoolCents = distributableCents - investorPoolCents;

  return {
    regionId,
    month,
    year,
    grossRevenueCents,
    operatingProfitCents,
    stockReplenishmentCents,
    distributableCents,
    activeQuotaCount,
    totalQuotaCount,
    companyQuotaCount: companyShares.length,
    investorQuotaCount: investorShares.length,
    valuePerQuotaCents,
    investorPoolCents,
    companyPoolCents,
    investors: Array.from(grouped.values()).sort((a, b) =>
      a.investorName.localeCompare(b.investorName, "pt-BR")
    ),
  };
}

export async function generateInvestorDistributions(
  regionId: string,
  month: number,
  year: number
) {
  const preview = await calculateInvestorDistributionPreview(regionId, month, year);

  let monthlyResult = await prisma.regionMonthlyResult.findUnique({
    where: { regionId_month_year: { regionId, month, year } },
  });

  // Auto-calculate and save the monthly result if not yet recorded
  if (!monthlyResult) {
    await recalculateRegionMonthlyResult(regionId, month, year);
    monthlyResult = await prisma.regionMonthlyResult.findUnique({
      where: { regionId_month_year: { regionId, month, year } },
    });
    if (!monthlyResult) {
      throw new Error("Resultado mensal não encontrado e não pôde ser calculado.");
    }
  }

  const results = [];

  for (const investor of preview.investors) {
    const record = await prisma.investorDistribution.upsert({
      where: {
        regionId_investorId_month_year: {
          regionId,
          investorId: investor.investorId,
          month,
          year,
        },
      },
      update: {
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        // Não há mais fase de payback: toda cota é definitiva, mantido como
        // RECURRING só para compatibilidade com o schema/histórico.
        payoutPhase: "RECURRING",
        status: "PENDING",
      },
      create: {
        regionMonthlyResultId: monthlyResult.id,
        investorId: investor.investorId,
        regionId,
        month,
        year,
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        payoutPhase: "RECURRING",
        status: "PENDING",
      },
    });

    results.push(record);
  }

  return {
    ...preview,
    generatedCount: results.length,
  };
}
