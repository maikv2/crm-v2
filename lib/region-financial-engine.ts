import { prisma } from "@/lib/prisma";

// Admin overhead is provisioned at 32% of gross revenue per V2 budget model.
// The difference between provisioned and actual admin cost flows to the quarterly fund.
const PROJECTED_ADMIN_PCT = 0.32;

type RegionFinancialSnapshot = {
  regionId: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  cmvCents: number;
  logisticsCents: number;
  commissionCents: number;
  taxesCents: number;
  administrativeCents: number;
  reserveCents: number;
  ebitdaCents: number;
  operatingProfitCents: number;
  quarterlyFundContributionCents: number;
  activePdvs: number;
  activeClients: number;
};

function startOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function startOfNextMonth(month: number, year: number) {
  return new Date(year, month, 1, 0, 0, 0, 0);
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

export async function calculateRegionFinancialSnapshot(
  regionId: string,
  month: number,
  year: number
): Promise<RegionFinancialSnapshot> {
  const periodStart = startOfMonth(month, year);
  const periodEnd = startOfNextMonth(month, year);

  const [region, orders, manualExpenses, activePdvs, activeClients] =
    await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.order.findMany({
        where: {
          regionId,
          financialMovement: true,
          type: "SALE",
          issuedAt: {
            gte: periodStart,
            lt: periodEnd,
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
            lt: periodEnd,
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

  const ebitdaCents = Math.max(0, Math.floor(grossRevenueCents * 0.15));
  const reserveCents = Math.max(0, operatingProfitCents - ebitdaCents);

  // Monthly contribution to the quarterly fund:
  // projected admin budget (32% of revenue) minus actual admin spend.
  // Efficiency surplus flows to investors quarterly via the fundo trimestral.
  const projectedAdminCents = Math.floor(grossRevenueCents * PROJECTED_ADMIN_PCT);
  const quarterlyFundContributionCents = Math.max(0, projectedAdminCents - administrativeCents);

  return {
    regionId,
    month,
    year,
    grossRevenueCents,
    cmvCents,
    logisticsCents,
    commissionCents,
    taxesCents,
    administrativeCents,
    reserveCents,
    ebitdaCents,
    operatingProfitCents,
    quarterlyFundContributionCents,
    activePdvs,
    activeClients,
  };
}

export async function recalculateRegionMonthlyResult(
  regionId: string,
  month: number,
  year: number
) {
  const snapshot = await calculateRegionFinancialSnapshot(regionId, month, year);

  const record = await prisma.regionMonthlyResult.upsert({
    where: {
      regionId_month_year: {
        regionId,
        month,
        year,
      },
    },
    update: {
      grossRevenueCents: snapshot.grossRevenueCents,
      cmvCents: snapshot.cmvCents,
      logisticsCents: snapshot.logisticsCents,
      commissionCents: snapshot.commissionCents,
      taxesCents: snapshot.taxesCents,
      administrativeCents: snapshot.administrativeCents,
      reserveCents: snapshot.reserveCents,
      ebitdaCents: snapshot.ebitdaCents,
      quarterlyFundContributionCents: snapshot.quarterlyFundContributionCents,
      activePdvs: snapshot.activePdvs,
      activeClients: snapshot.activeClients,
    },
    create: {
      regionId,
      month,
      year,
      grossRevenueCents: snapshot.grossRevenueCents,
      cmvCents: snapshot.cmvCents,
      logisticsCents: snapshot.logisticsCents,
      commissionCents: snapshot.commissionCents,
      taxesCents: snapshot.taxesCents,
      administrativeCents: snapshot.administrativeCents,
      reserveCents: snapshot.reserveCents,
      ebitdaCents: snapshot.ebitdaCents,
      quarterlyFundContributionCents: snapshot.quarterlyFundContributionCents,
      activePdvs: snapshot.activePdvs,
      activeClients: snapshot.activeClients,
    },
  });

  return {
    ...snapshot,
    recordId: record.id,
  };
}

export async function recalculateAllRegionsMonthlyResults(
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
    data?: Awaited<ReturnType<typeof recalculateRegionMonthlyResult>>;
    error?: string;
  }> = [];

  for (const region of regions) {
    try {
      const data = await recalculateRegionMonthlyResult(region.id, month, year);

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
            : "Erro ao recalcular resultado da região.",
      });
    }
  }

  return results;
}
