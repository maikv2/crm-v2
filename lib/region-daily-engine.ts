import { prisma } from "@/lib/prisma";

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
  ebitdaEstimatedCents: number;
  reserveEstimatedCents: number;
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

function getProductUnitCostCents(product: {
  purchaseCostCents: number;
  taxCostCents: number;
  packagingCostCents: number;
  freightCostCents: number;
  extraCostCents: number;
}) {
  return (
    toCents(product.purchaseCostCents) +
    toCents(product.taxCostCents) +
    toCents(product.packagingCostCents) +
    toCents(product.freightCostCents) +
    toCents(product.extraCostCents)
  );
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

  const [region, orders, manualExpenses, activePdvs, activeClients, shares] =
    await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          maxQuotaCount: true,
        },
      }),

      prisma.order.findMany({
        where: {
          regionId,
          financialMovement: true,
          type: "SALE",
          issuedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          id: true,
          totalCents: true,
          commissionTotalCents: true,
          items: {
            select: {
              qty: true,
              product: {
                select: {
                  purchaseCostCents: true,
                  taxCostCents: true,
                  packagingCostCents: true,
                  freightCostCents: true,
                  extraCostCents: true,
                },
              },
            },
          },
        },
      }),

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

  let grossRevenueCents = 0;
  let cmvCents = 0;
  let commissionCents = 0;
  let logisticsCents = 0;
  let taxesCents = 0;
  let administrativeCents = 0;

  for (const order of orders) {
    grossRevenueCents += toCents(order.totalCents);
    commissionCents += toCents(order.commissionTotalCents);

    for (const item of order.items) {
      const unitCostCents = getProductUnitCostCents(item.product);
      cmvCents += unitCostCents * toCents(item.qty);
    }
  }

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

  const ebitdaEstimatedCents = Math.max(
    0,
    Math.floor(grossRevenueCents * 0.15)
  );

  const reserveEstimatedCents = Math.max(
    0,
    operatingProfitCents - ebitdaEstimatedCents
  );

  const activeQuotaCount = shares.length;
  const companyShares = shares.filter((share) => share.ownerType === "COMPANY");
  const investorShares = shares.filter(
    (share) =>
      share.ownerType === "INVESTOR" && share.investorId && share.investor
  );

  let estimatedInvestorPoolCents = 0;
  let estimatedCompanyPoolCents = 0;

  const investorGrouped = new Map<string, DailyRegionInvestorItem>();

  for (const share of investorShares) {
    const paidBack = share.paidBackAt !== null;

    const investorRateBps = paidBack
      ? share.postPayInvestorBps
      : share.prePayInvestorBps;

    const companyRateBps = paidBack
      ? share.postPayCompanyBps
      : share.prePayCompanyBps;

    const investorQuotaValueCents = safeDivideInt(
      Math.floor((ebitdaEstimatedCents * investorRateBps) / 10000),
      activeQuotaCount
    );

    const companyQuotaValueCents = safeDivideInt(
      Math.floor((ebitdaEstimatedCents * companyRateBps) / 10000),
      activeQuotaCount
    );

    estimatedInvestorPoolCents += investorQuotaValueCents;
    estimatedCompanyPoolCents += companyQuotaValueCents;

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
    ebitdaEstimatedCents,
    reserveEstimatedCents,
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