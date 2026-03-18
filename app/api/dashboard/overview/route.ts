import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FinanceEntryType,
  FinanceScope,
  FinanceStatus,
  ReceivableStatus,
  TransferStatus,
} from "@prisma/client";

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthLabel(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toLowerCase();
}

function centsToNumber(value: number) {
  return value / 100;
}

export async function GET() {
  try {
    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const last12Months = Array.from({ length: 12 }).map((_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);

      return {
        start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
        label: monthLabel(d),
      };
    });

    const rangeStart = last12Months[0].start;
    const rangeEnd = last12Months[last12Months.length - 1].end;

    const [
      totalClients,
      totalExhibitors,
      totalOrdersToday,
      totalOrdersMonth,

      regions,

      ordersLast12Months,
      ordersToday,

      receivables,
      financeExpensesMonth,
      financeIncomeMonth,

      receiptsAll,
      transfersAll,
    ] = await Promise.all([
      prisma.client.count({
        where: { active: true },
      }),

      prisma.exhibitor.count({
        where: {
          status: {
            in: ["ACTIVE", "MAINTENANCE"],
          },
        },
      }),

      prisma.order.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.order.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),

      prisma.region.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        include: {
          clients: {
            where: { active: true },
            select: { id: true },
          },
          exhibitors: {
            where: {
              status: {
                in: ["ACTIVE", "MAINTENANCE"],
              },
            },
            select: { id: true },
          },
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        select: {
          id: true,
          number: true,
          createdAt: true,
          totalCents: true,
          regionId: true,
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
              regionId: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          items: {
            select: {
              qty: true,
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          regionId: true,
          client: {
            select: {
              regionId: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            not: ReceivableStatus.CANCELED,
          },
        },
        select: {
          id: true,
          amountCents: true,
          receivedCents: true,
          dueDate: true,
          status: true,
        },
      }),

      prisma.financeTransaction.findMany({
        where: {
          type: FinanceEntryType.EXPENSE,
          status: {
            not: FinanceStatus.CANCELLED,
          },
          dueDate: {
            not: null,
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          id: true,
          amountCents: true,
          dueDate: true,
          status: true,
        },
      }),

      prisma.financeTransaction.findMany({
        where: {
          type: FinanceEntryType.INCOME,
          status: {
            not: FinanceStatus.CANCELLED,
          },
          dueDate: {
            not: null,
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          id: true,
          amountCents: true,
          dueDate: true,
          status: true,
        },
      }),

      prisma.receipt.findMany({
        select: {
          id: true,
          amountCents: true,
          location: true,
          regionId: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          transfers: {
            select: {
              id: true,
              amountCents: true,
              status: true,
            },
          },
        },
      }),

      prisma.cashTransfer.findMany({
        select: {
          id: true,
          amountCents: true,
          status: true,
          regionId: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const ordersMonth = ordersLast12Months.filter(
      (order) => order.createdAt >= monthStart && order.createdAt <= monthEnd
    );

    const monthRevenueCents = ordersMonth.reduce(
      (sum, order) => sum + (order.totalCents ?? 0),
      0
    );

    const receivableOverdueCents = receivables.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      const open = Math.max(item.amountCents - item.receivedCents, 0);

      if (
        open > 0 &&
        item.dueDate < todayStart &&
        item.status !== ReceivableStatus.PAID
      ) {
        return sum + open;
      }

      return sum;
    }, 0);

    const receivableDueTodayCents = receivables.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      const open = Math.max(item.amountCents - item.receivedCents, 0);

      if (
        open > 0 &&
        item.dueDate >= todayStart &&
        item.dueDate <= todayEnd &&
        item.status !== ReceivableStatus.PAID
      ) {
        return sum + open;
      }

      return sum;
    }, 0);

    const receivableRestOfMonthCents = receivables.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      const open = Math.max(item.amountCents - item.receivedCents, 0);

      if (
        open > 0 &&
        item.dueDate > todayEnd &&
        item.dueDate <= monthEnd &&
        item.status !== ReceivableStatus.PAID
      ) {
        return sum + open;
      }

      return sum;
    }, 0);

    const payableOverdueCents = financeExpensesMonth.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      if (item.status === FinanceStatus.PAID) return sum;

      if (item.dueDate < todayStart) {
        return sum + item.amountCents;
      }

      return sum;
    }, 0);

    const payableDueTodayCents = financeExpensesMonth.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      if (item.status === FinanceStatus.PAID) return sum;

      if (item.dueDate >= todayStart && item.dueDate <= todayEnd) {
        return sum + item.amountCents;
      }

      return sum;
    }, 0);

    const payableRestOfMonthCents = financeExpensesMonth.reduce((sum, item) => {
      if (!item.dueDate) return sum;
      if (item.status === FinanceStatus.PAID) return sum;

      if (item.dueDate > todayEnd && item.dueDate <= monthEnd) {
        return sum + item.amountCents;
      }

      return sum;
    }, 0);

    const regionsSummary = regions.map((region) => {
      const regionOrdersMonth = ordersMonth.filter(
        (order) =>
          order.regionId === region.id ||
          order.client?.region?.id === region.id ||
          order.client?.regionId === region.id
      );

      const regionOrdersToday = ordersToday.filter(
  (order) =>
    order.regionId === region.id ||
    order.client?.regionId === region.id ||
    order.client?.region?.id === region.id
);

      const regionRevenueCents = regionOrdersMonth.reduce(
        (sum, order) => sum + (order.totalCents ?? 0),
        0
      );

      const avgTicketCents =
        regionOrdersMonth.length > 0
          ? Math.round(regionRevenueCents / regionOrdersMonth.length)
          : 0;

      return {
        id: region.id,
        name: region.name,
        clients: region.clients.length,
        exhibitors: region.exhibitors.length,
        ordersToday: regionOrdersToday.length,
        ordersMonth: regionOrdersMonth.length,
        revenueCents: regionRevenueCents,
        summary:
          regionOrdersMonth.length > 0
            ? `Ticket médio de ${centsToNumber(avgTicketCents).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })} no mês.`
            : "Sem pedidos lançados neste mês.",
      };
    });

    const monthlyRevenue = last12Months.map((month) => {
      const total = ordersLast12Months
        .filter(
          (order) => order.createdAt >= month.start && order.createdAt <= month.end
        )
        .reduce((sum, order) => sum + (order.totalCents ?? 0), 0);

      return {
        label: month.label,
        value: centsToNumber(total),
      };
    });

    const salesByRegionBase = regionsSummary.map((region) => ({
      label: region.name,
      value: region.revenueCents,
    }));

    const totalRegionRevenue = salesByRegionBase.reduce(
      (sum, item) => sum + item.value,
      0
    );

    const salesByRegion = salesByRegionBase.map((item) => ({
      label: item.label,
      value:
        totalRegionRevenue > 0
          ? Math.round((item.value / totalRegionRevenue) * 100)
          : 0,
    }));

    const topClientsMap = new Map<
      string,
      { name: string; valueCents: number }
    >();

    for (const order of ordersMonth) {
      if (!order.client?.id || !order.client?.name) continue;

      const current = topClientsMap.get(order.client.id);

      if (current) {
        current.valueCents += order.totalCents ?? 0;
      } else {
        topClientsMap.set(order.client.id, {
          name: order.client.name,
          valueCents: order.totalCents ?? 0,
        });
      }
    }

    const topClients = Array.from(topClientsMap.values())
      .sort((a, b) => b.valueCents - a.valueCents)
      .slice(0, 4)
      .map((item) => ({
        name: item.name,
        value: centsToNumber(item.valueCents),
      }));

    const topProductsMap = new Map<string, { name: string; qty: number }>();

    for (const order of ordersMonth) {
      for (const item of order.items) {
        if (!item.product?.id) continue;

        const current = topProductsMap.get(item.product.id);

        if (current) {
          current.qty += item.qty;
        } else {
          topProductsMap.set(item.product.id, {
            name: item.product.name,
            qty: item.qty,
          });
        }
      }
    }

    const topProducts = Array.from(topProductsMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 4);

    const totalReceiptsRegionCents = receiptsAll
      .filter((r) => r.location === "REGION")
      .reduce((sum, r) => sum + r.amountCents, 0);

    const totalTransferredCents = transfersAll
      .filter((t) => t.status === TransferStatus.TRANSFERRED)
      .reduce((sum, t) => sum + t.amountCents, 0);

    const totalPendingTransferCents = transfersAll
      .filter((t) => t.status === TransferStatus.PENDING)
      .reduce((sum, t) => sum + t.amountCents, 0);

    const regionalCashMap = new Map<string, number>();

    for (const receipt of receiptsAll) {
      if (receipt.location !== "REGION") continue;
      if (!receipt.region?.name) continue;

      const transferred = receipt.transfers.reduce((sum, t) => {
        if (t.status === TransferStatus.CANCELED) return sum;
        return sum + t.amountCents;
      }, 0);

      const open = Math.max(receipt.amountCents - transferred, 0);

      regionalCashMap.set(
        receipt.region.name,
        (regionalCashMap.get(receipt.region.name) ?? 0) + open
      );
    }

    const financialAccounts = [
      {
        title: "Recebimentos na região",
        subtitle: "Total recebido localmente",
        value: centsToNumber(totalReceiptsRegionCents),
        type: "cash",
      },
      {
        title: "Transferências pendentes",
        subtitle: "Valores ainda não enviados à matriz",
        value: centsToNumber(totalPendingTransferCents),
        type: "other",
      },
      {
        title: "Transferido à matriz",
        subtitle: "Valores já repassados",
        value: centsToNumber(totalTransferredCents),
        type: "bank",
      },
      ...Array.from(regionalCashMap.entries()).map(([regionName, valueCents]) => ({
        title: "Dinheiro com representante",
        subtitle: `Região ${regionName}`,
        value: centsToNumber(valueCents),
        type: "cash",
      })),
    ];

    const response = {
      summary: {
        totalClients,
        totalExhibitors,
        totalOrdersToday,
        totalOrdersMonth,
        monthRevenue: centsToNumber(monthRevenueCents),
      },

      receivable: {
        overdue: centsToNumber(receivableOverdueCents),
        dueToday: centsToNumber(receivableDueTodayCents),
        restOfMonth: centsToNumber(receivableRestOfMonthCents),
      },

      payable: {
        overdue: centsToNumber(payableOverdueCents),
        dueToday: centsToNumber(payableDueTodayCents),
        restOfMonth: centsToNumber(payableRestOfMonthCents),
      },

      regions: regionsSummary.map((region) => ({
        id: region.id,
        name: region.name,
        clients: region.clients,
        exhibitors: region.exhibitors,
        ordersToday: region.ordersToday,
        ordersMonth: region.ordersMonth,
        revenue: centsToNumber(region.revenueCents),
        summary: region.summary,
      })),

      monthlyRevenue,
      salesByRegion,
      financialAccounts,
      topClients,
      topProducts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/dashboard/overview error", error);

    return NextResponse.json(
      { error: "Erro ao carregar visão geral da dashboard." },
      { status: 500 }
    );
  }
}