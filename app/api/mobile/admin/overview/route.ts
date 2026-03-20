import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  FinanceStatus,
  PortalOrderRequestStatus,
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

function openAmount(amountCents?: number | null, receivedCents?: number | null) {
  return Math.max(0, Number(amountCents ?? 0) - Number(receivedCents ?? 0));
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso permitido apenas para administradores." },
        { status: 403 }
      );
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [
      todayOrders,
      monthOrders,
      pendingPortalRequests,
      overdueReceivables,
      dueTodayReceivables,
      pendingCashTransfersCount,
      overdueFinanceCount,
      clientsCount,
      exhibitorsCount,
      prospectsCount,
      representativesCount,
      visitsTodayCount,
      recentOrders,
      urgentReceivables,
      monthOrdersForRegions,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        _count: { id: true },
        _sum: { totalCents: true },
      }),

      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _count: { id: true },
        _sum: { totalCents: true },
      }),

      prisma.portalOrderRequest.count({
        where: {
          status: PortalOrderRequestStatus.PENDING,
        },
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            in: [
              ReceivableStatus.PENDING,
              ReceivableStatus.PARTIAL,
              ReceivableStatus.OVERDUE,
            ],
          },
          dueDate: {
            lt: todayStart,
          },
        },
        select: {
          id: true,
          amountCents: true,
          receivedCents: true,
        },
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            in: [
              ReceivableStatus.PENDING,
              ReceivableStatus.PARTIAL,
              ReceivableStatus.OVERDUE,
            ],
          },
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          amountCents: true,
          receivedCents: true,
        },
      }),

      prisma.cashTransfer.count({
        where: {
          status: TransferStatus.PENDING,
        },
      }),

      prisma.financeTransaction.count({
        where: {
          status: FinanceStatus.PENDING,
          dueDate: {
            lt: todayStart,
          },
        },
      }),

      prisma.client.count({
        where: {
          active: true,
        },
      }),

      prisma.exhibitor.count({
        where: {
          status: {
            in: ["ACTIVE", "MAINTENANCE"],
          },
        },
      }),

      prisma.prospect.count(),

      prisma.user.count({
        where: {
          active: true,
          role: "REPRESENTATIVE",
        },
      }),

      prisma.visit.count({
        where: {
          visitedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        take: 8,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          number: true,
          totalCents: true,
          status: true,
          createdAt: true,
          client: {
            select: {
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          seller: {
            select: {
              name: true,
            },
          },
        },
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            in: [
              ReceivableStatus.PENDING,
              ReceivableStatus.PARTIAL,
              ReceivableStatus.OVERDUE,
            ],
          },
          dueDate: {
            lte: todayEnd,
          },
        },
        take: 8,
        orderBy: {
          dueDate: "asc",
        },
        select: {
          id: true,
          amountCents: true,
          receivedCents: true,
          dueDate: true,
          status: true,
          client: {
            select: {
              name: true,
            },
          },
          region: {
            select: {
              name: true,
            },
          },
          order: {
            select: {
              number: true,
            },
          },
        },
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          id: true,
          totalCents: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const overdueReceivablesCents = overdueReceivables.reduce((sum, item) => {
      return sum + openAmount(item.amountCents, item.receivedCents);
    }, 0);

    const dueTodayReceivablesCents = dueTodayReceivables.reduce((sum, item) => {
      return sum + openAmount(item.amountCents, item.receivedCents);
    }, 0);

    const regionMap = new Map<
      string,
      {
        regionId: string;
        regionName: string;
        totalCents: number;
        orderCount: number;
      }
    >();

    for (const order of monthOrdersForRegions) {
      const regionId = order.region?.id ?? "sem-regiao";
      const regionName = order.region?.name ?? "Sem região";
      const current = regionMap.get(regionId) ?? {
        regionId,
        regionName,
        totalCents: 0,
        orderCount: 0,
      };

      current.totalCents += order.totalCents ?? 0;
      current.orderCount += 1;

      regionMap.set(regionId, current);
    }

    const topRegionsMonth = Array.from(regionMap.values())
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 5);

    return NextResponse.json({
      summary: {
        salesTodayCents: todayOrders._sum.totalCents ?? 0,
        salesTodayCount: todayOrders._count.id ?? 0,
        salesMonthCents: monthOrders._sum.totalCents ?? 0,
        salesMonthCount: monthOrders._count.id ?? 0,
        overdueReceivablesCents,
        dueTodayReceivablesCents,
        pendingPortalRequests,
        pendingCashTransfersCount,
        overdueFinanceCount,
        clientsCount,
        exhibitorsCount,
        prospectsCount,
        representativesCount,
        visitsTodayCount,
      },

      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        number: order.number,
        totalCents: order.totalCents ?? 0,
        status: order.status,
        createdAt: order.createdAt,
        clientName: order.client?.name ?? "Cliente",
        regionName: order.region?.name ?? "Sem região",
        sellerName: order.seller?.name ?? null,
      })),

      urgentReceivables: urgentReceivables.map((item) => ({
        id: item.id,
        amountCents: item.amountCents ?? 0,
        receivedCents: item.receivedCents ?? 0,
        openCents: openAmount(item.amountCents, item.receivedCents),
        dueDate: item.dueDate,
        status: item.status,
        clientName: item.client?.name ?? "Cliente",
        regionName: item.region?.name ?? "Sem região",
        orderNumber: item.order?.number ?? null,
      })),

      topRegionsMonth,
    });
  } catch (error) {
    console.error("MOBILE ADMIN OVERVIEW ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar resumo mobile do admin.",
      },
      { status: 500 }
    );
  }
}