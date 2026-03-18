import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getSaoPauloRangeToday() {
  const now = new Date();
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  const startLocal = new Date(local);
  startLocal.setHours(0, 0, 0, 0);

  const endLocal = new Date(local);
  endLocal.setHours(23, 59, 59, 999);

  const startUtc = new Date(startLocal.getTime() + 3 * 60 * 60 * 1000);
  const endUtc = new Date(endLocal.getTime() + 3 * 60 * 60 * 1000);

  return { startUtc, endUtc };
}

function getSaoPauloRangeMonth() {
  const now = new Date();
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  const startLocal = new Date(local.getFullYear(), local.getMonth(), 1, 0, 0, 0, 0);
  const endLocal = new Date(
    local.getFullYear(),
    local.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const startUtc = new Date(startLocal.getTime() + 3 * 60 * 60 * 1000);
  const endUtc = new Date(endLocal.getTime() + 3 * 60 * 60 * 1000);

  return { startUtc, endUtc, local };
}

function getLastSixMonthsStarts() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );

  const months: Array<{ label: string; startUtc: Date; endUtc: Date }> = [];
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  for (let i = 5; i >= 0; i--) {
    const y = now.getFullYear();
    const m = now.getMonth() - i;

    const startLocal = new Date(y, m, 1, 0, 0, 0, 0);
    const endLocal = new Date(y, m + 1, 0, 23, 59, 59, 999);

    months.push({
      label: labels[startLocal.getMonth()],
      startUtc: new Date(startLocal.getTime() + 3 * 60 * 60 * 1000),
      endUtc: new Date(endLocal.getTime() + 3 * 60 * 60 * 1000),
    });
  }

  return months;
}

export async function GET() {
  try {
    const today = getSaoPauloRangeToday();
    const month = getSaoPauloRangeMonth();
    const lastSixMonths = getLastSixMonthsStarts();

    const [
      ordersToday,
      ordersMonth,
      ordersForMonth,
      ordersForTopClients,
      orderItemsForTopProducts,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: today.startUtc,
            lte: today.endUtc,
          },
        },
        select: {
          id: true,
          totalCents: true,
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: month.startUtc,
            lte: month.endUtc,
          },
        },
        select: {
          id: true,
          totalCents: true,
          createdAt: true,
          client: {
            select: {
              id: true,
              name: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: lastSixMonths[0].startUtc,
            lte: lastSixMonths[lastSixMonths.length - 1].endUtc,
          },
        },
        select: {
          createdAt: true,
          totalCents: true,
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: month.startUtc,
            lte: month.endUtc,
          },
        },
        select: {
          totalCents: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: {
              gte: month.startUtc,
              lte: month.endUtc,
            },
          },
        },
        select: {
          qty: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const monthRevenue = ordersMonth.reduce((sum, order) => {
      return sum + (order.totalCents ?? 0);
    }, 0);

    const ordersTodayCount = ordersToday.length;
    const ordersMonthCount = ordersMonth.length;
    const ticketAverage = ordersMonthCount > 0 ? Math.round(monthRevenue / ordersMonthCount) : 0;

    const activeClientsSet = new Set(
      ordersMonth
        .map((o) => o.client?.id)
        .filter(Boolean)
    );

    const monthlyRevenue = lastSixMonths.map((m) => {
      const value = ordersForMonth
        .filter((order) => order.createdAt >= m.startUtc && order.createdAt <= m.endUtc)
        .reduce((sum, order) => sum + (order.totalCents ?? 0), 0);

      return {
        label: m.label,
        value,
      };
    });

    const regionTotals = new Map<string, number>();

    for (const order of ordersMonth) {
      const regionName =
        order.region?.name ||
        order.client?.region?.name ||
        "Sem região";

      regionTotals.set(
        regionName,
        (regionTotals.get(regionName) ?? 0) + (order.totalCents ?? 0)
      );
    }

    const totalRegionRevenue = Array.from(regionTotals.values()).reduce((a, b) => a + b, 0);

    const salesByRegion = Array.from(regionTotals.entries())
      .map(([label, value]) => ({
        label,
        value: totalRegionRevenue > 0 ? Math.round((value / totalRegionRevenue) * 100) : 0,
        rawValue: value,
      }))
      .sort((a, b) => b.rawValue - a.rawValue)
      .slice(0, 5)
      .map(({ label, value }) => ({ label, value }));

    const clientTotals = new Map<string, { name: string; value: number }>();

    for (const order of ordersForTopClients) {
      const clientId = order.client?.id;
      const clientName = order.client?.name || "Cliente sem nome";

      if (!clientId) continue;

      const current = clientTotals.get(clientId) ?? { name: clientName, value: 0 };
      current.value += order.totalCents ?? 0;
      clientTotals.set(clientId, current);
    }

    const topClients = Array.from(clientTotals.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const productTotals = new Map<string, { name: string; qty: number }>();

    for (const item of orderItemsForTopProducts) {
      const productId = item.product?.id;
      const productName = item.product?.name || "Produto sem nome";

      if (!productId) continue;

      const current = productTotals.get(productId) ?? { name: productName, qty: 0 };
      current.qty += item.qty ?? 0;
      productTotals.set(productId, current);
    }

    const topProducts = Array.from(productTotals.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        monthRevenue,
        ordersToday: ordersTodayCount,
        ticketAverage,
        activeClients: activeClientsSet.size,
      },
      monthlyRevenue,
      salesByRegion,
      topProducts,
      topClients,
    });
  } catch (error) {
    console.error("sales-dashboard overview error", error);
    return NextResponse.json(
      { error: "Falha ao carregar visão comercial." },
      { status: 500 }
    );
  }
}