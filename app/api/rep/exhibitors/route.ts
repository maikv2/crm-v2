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
      return NextResponse.json({ items: [] });
    }

    const items = await prisma.exhibitor.findMany({
      where: {
        regionId: user.regionId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        model: true,
        installedAt: true,
        nextVisitAt: true,
        lastVisitAt: true,
        removedAt: true,
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            phone: true,
          },
        },
        stocks: {
          select: {
            id: true,
            quantity: true,
            productId: true,
          },
        },
        maintenances: {
          select: {
            id: true,
            performedAt: true,
            type: true,
          },
          orderBy: {
            performedAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        status: item.status,
        model: item.model,
        installedAt: item.installedAt,
        nextVisitAt: item.nextVisitAt,
        lastVisitAt: item.lastVisitAt,
        removedAt: item.removedAt,
        clientId: item.clientId,
        client: item.client,
        stockItemCount: item.stocks.reduce(
          (sum, stock) => sum + (stock.quantity ?? 0),
          0
        ),
        productCount: item.stocks.length,
        lastMaintenanceAt: item.maintenances[0]?.performedAt ?? null,
        lastMaintenanceType: item.maintenances[0]?.type ?? null,
      })),
    });
  } catch (error) {
    console.error("REP EXHIBITORS ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar expositores do representante." },
      { status: 500 }
    );
  }
}