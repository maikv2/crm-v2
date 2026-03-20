import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  FinanceStatus,
  PortalOrderRequestStatus,
  ReceivableStatus,
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

    if (user.role !== "REPRESENTATIVE") {
      return NextResponse.json(
        { error: "Acesso permitido apenas para representantes." },
        { status: 403 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json(
        { error: "Representante sem região vinculada." },
        { status: 400 }
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
      clientsCount,
      exhibitorsCount,
      pendingProspectsCount,
      visitsTodayCount,
      pendingPortalRequests,
      overdueReceivables,
      pendingCommissions,
      recentOrders,
      nextClients,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          regionId: user.regionId,
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
          regionId: user.regionId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _count: { id: true },
        _sum: { totalCents: true },
      }),

      prisma.client.count({
        where: {
          active: true,
          regionId: user.regionId,
        },
      }),

      prisma.exhibitor.count({
        where: {
          regionId: user.regionId,
          status: {
            in: ["ACTIVE", "MAINTENANCE"],
          },
        },
      }),

      prisma.prospect.count({
        where: {
          regionId: user.regionId,
          status: "PENDING",
        },
      }),

      prisma.visit.count({
        where: {
          userId: user.id,
          visitedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),

      prisma.portalOrderRequest.count({
        where: {
          regionId: user.regionId,
          status: PortalOrderRequestStatus.PENDING,
        },
      }),

      prisma.accountsReceivable.findMany({
        where: {
          regionId: user.regionId,
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
        select: {
          amountCents: true,
          receivedCents: true,
        },
      }),

      prisma.representativeCommission.findMany({
        where: {
          representativeId: user.id,
          status: FinanceStatus.PENDING,
        },
        select: {
          id: true,
          month: true,
          year: true,
          commissionCents: true,
          region: {
            select: {
              name: true,
            },
          },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
      }),

      prisma.order.findMany({
        where: {
          regionId: user.regionId,
        },
        take: 8,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          number: true,
          totalCents: true,
          createdAt: true,
          paymentStatus: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.client.findMany({
        where: {
          active: true,
          regionId: user.regionId,
        },
        take: 8,
        orderBy: [
          {
            lastVisitAt: "asc",
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          name: true,
          city: true,
          district: true,
          phone: true,
          whatsapp: true,
          lastVisitAt: true,
        },
      }),
    ]);

    const overdueReceivablesCents = overdueReceivables.reduce((sum, item) => {
      return sum + openAmount(item.amountCents, item.receivedCents);
    }, 0);

    const pendingCommissionsCents = pendingCommissions.reduce((sum, item) => {
      return sum + (item.commissionCents ?? 0);
    }, 0);

    return NextResponse.json({
      summary: {
        salesTodayCents: todayOrders._sum.totalCents ?? 0,
        salesTodayCount: todayOrders._count.id ?? 0,
        salesMonthCents: monthOrders._sum.totalCents ?? 0,
        salesMonthCount: monthOrders._count.id ?? 0,
        clientsCount,
        exhibitorsCount,
        pendingProspectsCount,
        visitsTodayCount,
        pendingPortalRequests,
        overdueReceivablesCents,
        pendingCommissionsCents,
      },

      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        number: order.number,
        totalCents: order.totalCents ?? 0,
        createdAt: order.createdAt,
        paymentStatus: order.paymentStatus,
        clientId: order.client?.id ?? null,
        clientName: order.client?.name ?? "Cliente",
      })),

      nextClients: nextClients.map((client) => ({
        id: client.id,
        name: client.name,
        city: client.city,
        district: client.district,
        phone: client.phone,
        whatsapp: client.whatsapp,
        lastVisitAt: client.lastVisitAt,
      })),

      pendingCommissions: pendingCommissions.map((item) => ({
        id: item.id,
        month: item.month,
        year: item.year,
        commissionCents: item.commissionCents ?? 0,
        regionName: item.region?.name ?? "Região",
      })),
    });
  } catch (error) {
    console.error("MOBILE REP OVERVIEW ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar resumo mobile do representante.",
      },
      { status: 500 }
    );
  }
}