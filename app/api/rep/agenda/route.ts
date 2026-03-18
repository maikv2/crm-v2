import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

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
        atrasados: [],
        hoje: [],
        proximos: [],
        visitadosHoje: [],
        portalPedidosPendentes: [],
        regionName: null,
      });
    }

    const now = new Date();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const region = await prisma.region.findUnique({
      where: { id: user.regionId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!region) {
      return NextResponse.json({
        atrasados: [],
        hoje: [],
        proximos: [],
        visitadosHoje: [],
        portalPedidosPendentes: [],
        regionName: null,
      });
    }

    const [exhibitors, visitadosHoje, portalPedidosPendentes] =
      await Promise.all([
        prisma.exhibitor.findMany({
          where: {
            regionId: region.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            code: true,
            nextVisitAt: true,
            client: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                phone: true,
              },
            },
          },
          orderBy: [{ nextVisitAt: "asc" }],
        }),

        prisma.visit.findMany({
          where: {
            userId: user.id,
            visitedAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
          select: {
            id: true,
            visitedAt: true,
            notes: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
            exhibitor: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            visitedAt: "desc",
          },
        }),

        prisma.portalOrderRequest.findMany({
          where: {
            regionId: region.id,
            status: "PENDING",
          },
          select: {
            id: true,
            status: true,
            notes: true,
            createdAt: true,
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
                city: true,
                state: true,
              },
            },
            items: {
              select: {
                id: true,
                quantity: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
              orderBy: {
                product: {
                  name: "asc",
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ]);

    const atrasados = exhibitors.filter(
      (item) => item.nextVisitAt && item.nextVisitAt < todayStart
    );

    const hoje = exhibitors.filter(
      (item) =>
        item.nextVisitAt &&
        item.nextVisitAt >= todayStart &&
        item.nextVisitAt <= todayEnd
    );

    const proximos = exhibitors.filter(
      (item) => item.nextVisitAt && item.nextVisitAt > todayEnd
    );

    return NextResponse.json({
      atrasados,
      hoje,
      proximos,
      visitadosHoje,
      portalPedidosPendentes,
      regionName: region.name,
      now,
    });
  } catch (error) {
    console.error("REP AGENDA ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar agenda do representante." },
      { status: 500 }
    );
  }
}