import { prisma } from "@/lib/prisma";

// Regra de distribuição vigente (definitiva, sem período de payback):
// 1) Lucro operacional = receita bruta − todas as despesas lançadas no sistema
//    (CMV, logística, comissão de vendedor, impostos, administrativo).
// 2) 30% do lucro operacional é reservado para reposição de estoque.
// 3) O restante (70%) é dividido fixo: 60% investidor / 40% empresa, por cota.
// IMPORTANTE: a divisão investidor/empresa (passo 3) é sempre por cota — uma
// cota ainda não emitida/vendida a um investidor fica implicitamente com a
// empresa. Esse cálculo por cota vive em investor-distribution.ts
// (calculateInvestorDistributionPreview) e em region-daily-engine.ts, nunca
// aqui: este arquivo só apura o resultado da região (receita/despesas/lucro),
// não sabe quantas das cotas já foram vendidas a investidores.
const STOCK_REPLENISHMENT_RATE_BPS = 3000; // 30%

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
  operatingProfitCents: number;
  stockReplenishmentCents: number;
  distributableCents: number;
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

/**
 * Regime de caixa: receita, CMV e comissão de uma venda só entram no período em
 * que o dinheiro foi efetivamente recebido (Receipt.receivedAt) — não na data
 * de emissão do pedido. Uma venda parcelada reconhece cada parcela apenas no
 * mês em que ela é paga, proporcionalmente ao valor recebido sobre o total do
 * pedido (mesmo princípio já usado no fechamento semanal de comissão).
 */
export async function calculateCashBasisOrderTotals(
  regionId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const receipts = await prisma.receipt.findMany({
    where: {
      receivedAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      order: {
        regionId,
        type: "SALE",
        financialMovement: true,
        status: {
          not: "CANCELLED",
        },
      },
    },
    select: {
      amountCents: true,
      orderId: true,
    },
  });

  const receivedByOrder = new Map<string, number>();
  for (const receipt of receipts) {
    if (!receipt.orderId) continue;
    receivedByOrder.set(
      receipt.orderId,
      (receivedByOrder.get(receipt.orderId) ?? 0) + toCents(receipt.amountCents)
    );
  }

  if (receivedByOrder.size === 0) {
    return { grossRevenueCents: 0, cmvCents: 0, commissionCents: 0 };
  }

  const orders = await prisma.order.findMany({
    where: {
      id: { in: Array.from(receivedByOrder.keys()) },
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
  });

  let grossRevenueCents = 0;
  let cmvCents = 0;
  let commissionCents = 0;

  for (const order of orders) {
    const receivedCents = receivedByOrder.get(order.id) ?? 0;
    if (receivedCents <= 0) continue;

    const orderTotalCents = toCents(order.totalCents);
    // Trava o reconhecimento no valor do pedido, para não passar de 100% caso
    // haja alguma inconsistência de dados nos recebimentos.
    const recognizedRevenueCents = Math.min(receivedCents, orderTotalCents);
    const ratio = orderTotalCents > 0 ? recognizedRevenueCents / orderTotalCents : 0;

    let orderCmvCents = 0;
    for (const item of order.items) {
      orderCmvCents += getProductUnitCostCents(item.product) * toCents(item.qty);
    }

    grossRevenueCents += recognizedRevenueCents;
    cmvCents += Math.round(orderCmvCents * ratio);
    commissionCents += Math.round(toCents(order.commissionTotalCents) * ratio);
  }

  return { grossRevenueCents, cmvCents, commissionCents };
}

export async function calculateRegionFinancialSnapshot(
  regionId: string,
  month: number,
  year: number
): Promise<RegionFinancialSnapshot> {
  const periodStart = startOfMonth(month, year);
  const periodEnd = startOfNextMonth(month, year);

  const [region, cashBasisTotals, manualExpenses, activePdvs, activeClients] =
    await Promise.all([
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
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

  // 30% do lucro operacional (nunca negativo) fica reservado para reposição de estoque.
  const stockReplenishmentCents = Math.max(
    0,
    Math.floor((Math.max(0, operatingProfitCents) * STOCK_REPLENISHMENT_RATE_BPS) / 10000)
  );
  // O que sobra é a base a dividir (60% investidor / 40% empresa, por cota —
  // ver nota no topo do arquivo; esse split fica em investor-distribution.ts).
  const distributableCents = Math.max(0, operatingProfitCents) - stockReplenishmentCents;

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
    operatingProfitCents,
    stockReplenishmentCents,
    distributableCents,
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
    // Nota: `reserveCents` passou a armazenar a reposição de estoque (30%).
    // `ebitdaCents` e `quarterlyFundContributionCents` ficaram obsoletos com a
    // regra atual (sem EBITDA e sem fundo trimestral) e são mantidos zerados
    // daqui pra frente — não são apagados do schema para preservar o histórico
    // de períodos calculados sob a regra antiga.
    update: {
      grossRevenueCents: snapshot.grossRevenueCents,
      cmvCents: snapshot.cmvCents,
      logisticsCents: snapshot.logisticsCents,
      commissionCents: snapshot.commissionCents,
      taxesCents: snapshot.taxesCents,
      administrativeCents: snapshot.administrativeCents,
      reserveCents: snapshot.stockReplenishmentCents,
      ebitdaCents: 0,
      quarterlyFundContributionCents: 0,
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
      reserveCents: snapshot.stockReplenishmentCents,
      ebitdaCents: 0,
      quarterlyFundContributionCents: 0,
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
