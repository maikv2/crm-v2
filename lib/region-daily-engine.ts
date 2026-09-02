import { prisma } from "@/lib/prisma";
import { calculateCashBasisOrderTotals } from "@/lib/region-financial-engine";

// Mesma regra do motor mensal oficial (region-financial-engine.ts), aplicada
// "ao vivo" para projeção do mês em andamento: 30% de reposição de estoque
// sobre o lucro operacional, e o restante dividido fixo 60% investidor / 40%
// empresa, sem período de payback.
const STOCK_REPLENISHMENT_RATE_BPS = 3000; // 30%
const INVESTOR_SPLIT_RATE_BPS = 6000; // 60%

type DailyRegionInvestorItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  estimatedDistributionCents: number;
  quotaNumbers: number[];
};

export type DailyRegionSnapshot = {
  regionId: string;
  regionName: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  cmvCents: number;
  logisticsCents: number;
  commissionCents: number;
  taxesCents: number;
  administrativeCents: number;
  operatingProfitCents: number;
  stockReplenishmentEstimatedCents: number;
  activePdvs: number;
  activeClients: number;
  activeQuotaCount: number;
  investorQuotaCount: number;
  companyQuotaCount: number;
  availableQuotaCount: number;
  estimatedInvestorPoolCents: number;
  estimatedCompanyPoolCents: number;
  estimatedValuePerInvestorQuotaCents: number;
  investors: DailyRegionInvestorItem[];
};

function startOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfPeriod(month: number, year: number) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (month === currentMonth && year === currentYear) {
    return now;
  }

  return new Date(year, month, 0, 23, 59, 59, 999);
}

function toCents(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.trunc(value as number) : 0;
}

function mapExpenseToBucket(category: string | null | undefined) {
  switch (String(category ?? "").toUpperCase()) {
    case "LOGISTICS":
      return "logisticsCents";
    case "COMMISSION":
      return "commissionCents";
    case "TAX":
      return "taxesCents";
    case "ADMINISTRATIVE":
    case "PAYROLL":
    case "RENT":
    case "EXHIBITOR":
    case "UNIFORM":
    case "MARKETING":
    case "ACCOUNTING":
    case "OTHER":
    default:
      return "administrativeCents";
  }
}

function safeDivideInt(total: number, divisor: number) {
  if (!divisor || divisor <= 0) return 0;
  return Math.floor(total / divisor);
}

export async function calculateDailyRegionSnapshot(
  regionId: string,
  month: number,
  year: number
): Promise<DailyRegionSnapshot> {
  const periodStart = startOfMonth(month, year);
  const periodEnd = endOfPeriod(month, year);

  const [region, cashBasisTotals, manualExpenses, activePdvs, activeClients, shares] =
    await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          maxQuotaCount: true,
        },
      }),

      calculateCashBasisOrderTotals(regionId, periodStart, periodEnd),

      prisma.financeTransaction.findMany({
        where: {
          regionId,
          scope: "REGION",
          type: "EXPENSE",
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: {
            not: "CANCELLED",
          },
          isSystemGenerated: false,
        },
        select: {
          amountCents: true,
          category: true,
        },
      }),

      prisma.exhibitor.count({
        where: {
          regionId,
          status: "ACTIVE",
        },
      }),

      prisma.client.count({
        where: {
          regionId,
          active: true,
          roleClient: true,
        },
      }),

      prisma.share.findMany({
        where: {
          regionId,
          isActive: true,
        },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          quotaNumber: "asc",
        },
      }),
    ]);

  if (!region) {
    throw new Error("Região não encontrada.");
  }

  let grossRevenueCents = cashBasisTotals.grossRevenueCents;
  let cmvCents = cashBasisTotals.cmvCents;
  let commissionCents = cashBasisTotals.commissionCents;
  let logisticsCents = 0;
  let taxesCents = 0;
  let administrativeCents = 0;

  for (const expense of manualExpenses) {
    const bucket = mapExpenseToBucket(expense.category);
    const amount = toCents(expense.amountCents);

    if (bucket === "logisticsCents") logisticsCents += amount;
    if (bucket === "commissionCents") commissionCents += amount;
    if (bucket === "taxesCents") taxesCents += amount;
    if (bucket === "administrativeCents") administrativeCents += amount;
  }

  const operatingProfitCents =
    grossRevenueCents -
    cmvCents -
    logisticsCents -
    commissionCents -
    taxesCents -
    administrativeCents;

  const stockReplenishmentEstimatedCents = Math.max(
    0,
    Math.floor((Math.max(0, operatingProfitCents) * STOCK_REPLENISHMENT_RATE_BPS) / 10000)
  );

  const distributableEstimatedCents =
    Math.max(0, operatingProfitCents) - stockReplenishmentEstimatedCents;

  const activeQuotaCount = shares.length;
  const companyShares = shares.filter((share) => share.ownerType === "COMPANY");
  const investorShares = shares.filter(
    (share) =>
      share.ownerType === "INVESTOR" && share.investorId && share.investor
  );

  let estimatedInvestorPoolCents = 0;

  // A região sempre representa 100% do lucro em `maxQuotaCount` cotas — cotas
  // ainda não emitidas ficam implicitamente com a empresa. Ver mesma regra em
  // investor-distribution.ts.
  const totalQuotaCount = region.maxQuotaCount || activeQuotaCount || 1;
  const perQuotaEstimatedCents = safeDivideInt(distributableEstimatedCents, totalQuotaCount);
  const investorQuotaValueCents = Math.floor(
    (perQuotaEstimatedCents * INVESTOR_SPLIT_RATE_BPS) / 10000
  );

  const investorGrouped = new Map<string, DailyRegionInvestorItem>();

  for (const share of investorShares) {
    estimatedInvestorPoolCents += investorQuotaValueCents;

    const investorId = share.investorId!;
    const investorName = share.investor!.name;
    const investorEmail = share.investor!.email ?? null;

    const existing = investorGrouped.get(investorId);

    if (!existing) {
      investorGrouped.set(investorId, {
        investorId,
        investorName,
        investorEmail,
        quotaCount: 1,
        estimatedDistributionCents: investorQuotaValueCents,
        quotaNumbers: [share.quotaNumber],
      });
      continue;
    }

    existing.quotaCount += 1;
    existing.estimatedDistributionCents += investorQuotaValueCents;
    existing.quotaNumbers.push(share.quotaNumber);
  }

  const estimatedValuePerInvestorQuotaCents = safeDivideInt(
    estimatedInvestorPoolCents,
    investorShares.length
  );

  const estimatedCompanyPoolCents = distributableEstimatedCents - estimatedInvestorPoolCents;

  return {
    regionId: region.id,
    regionName: region.name,
    month,
    year,
    grossRevenueCents,
    cmvCents,
    logisticsCents,
    commissionCents,
    taxesCents,
    administrativeCents,
    operatingProfitCents,
    stockReplenishmentEstimatedCents,
    activePdvs,
    activeClients,
    activeQuotaCount,
    investorQuotaCount: investorShares.length,
    companyQuotaCount: companyShares.length,
    availableQuotaCount: Math.max(0, region.maxQuotaCount - activeQuotaCount),
    estimatedInvestorPoolCents,
    estimatedCompanyPoolCents,
    estimatedValuePerInvestorQuotaCents,
    investors: Array.from(investorGrouped.values()).sort((a, b) =>
      a.investorName.localeCompare(b.investorName, "pt-BR")
    ),
  };
}

export async function calculateAllRegionsDailySnapshots(
  month: number,
  year: number
) {
  const regions = await prisma.region.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const results: Array<{
    regionId: string;
    regionName: string;
    success: boolean;
    data?: DailyRegionSnapshot;
    error?: string;
  }> = [];

  for (const region of regions) {
    try {
      const data = await calculateDailyRegionSnapshot(region.id, month, year);

      results.push({
        regionId: region.id,
        regionName: region.name,
        success: true,
        data,
      });
    } catch (error) {
      results.push({
        regionId: region.id,
        regionName: region.name,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao calcular resultado diário da região.",
      });
    }
  }

  return results;
}