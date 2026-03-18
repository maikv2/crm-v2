import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

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

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json({
        region: null,
        summary: {
          clients: 0,
          exhibitors: 0,
          ordersThisMonth: 0,
          salesThisMonthCents: 0,
          visitsToday: 0,
          overdueVisits: 0,
          portalRequestsPending: 0,
        },
      });
    }

    const todayStart = startOfDay();
    const todayEnd = endOfDay();
    const monthStart = startOfMonth();
    const monthEnd = endOfMonth();

    const [
      region,
      clientsCount,
      exhibitorsCount,
      visitsToday,
      overdueVisits,
      ordersThisMonth,
      salesThisMonth,
      portalRequestsPending,
    ] = await Promise.all([
      prisma.region.findUnique({
        where: { id: user.regionId },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.client.count({
        where: {
          regionId: user.regionId,
          active: true,
        },
      }),
      prisma.exhibitor.count({
        where: {
          regionId: user.regionId,
          status: "ACTIVE",
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
      prisma.exhibitor.count({
        where: {
          regionId: user.regionId,
          status: "ACTIVE",
          nextVisitAt: {
            lt: todayStart,
          },
        },
      }),
      prisma.order.count({
        where: {
          regionId: user.regionId,
          issuedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          regionId: user.regionId,
          issuedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          totalCents: true,
        },
      }),
      prisma.portalOrderRequest.count({
        where: {
          regionId: user.regionId,
          status: "PENDING",
        },
      }),
    ]);

    return NextResponse.json({
      region,
      summary: {
        clients: clientsCount,
        exhibitors: exhibitorsCount,
        ordersThisMonth,
        salesThisMonthCents: salesThisMonth._sum.totalCents ?? 0,
        visitsToday,
        overdueVisits,
        portalRequestsPending,
      },
    });
  } catch (error) {
    console.error("REP DASHBOARD ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar dashboard do representante." },
      { status: 500 }
    );
  }
}