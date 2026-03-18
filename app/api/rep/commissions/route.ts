import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
        dayCommissionCents: 0,
        weekCommissionCents: 0,
        monthCommissionCents: 0,
        topClients: [],
        topProducts: [],
        recentOrders: [],
      });
    }

    const now = new Date();

    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const orders = await prisma.order.findMany({
      where: {
        regionId: user.regionId,
        issuedAt: {
          gte: monthStart,
          lte: dayEnd,
        },
      },
      select: {
        id: true,
        number: true,
        issuedAt: true,
        commissionTotalCents: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentReceiver: true,
        totalCents: true,
        client: {
          select: {
            id: true,
            name: true,
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
      orderBy: {
        issuedAt: "desc",
      },
    });

    const dayOrders = orders.filter((order) => {
      const issuedAt = new Date(order.issuedAt);
      return issuedAt >= dayStart && issuedAt <= dayEnd;
    });

    const weekOrders = orders.filter((order) => {
      const issuedAt = new Date(order.issuedAt);
      return issuedAt >= weekStart && issuedAt <= dayEnd;
    });

    const monthOrders = orders;

    const sumCommission = (
      list: Array<{ commissionTotalCents: number | null }>
    ) => list.reduce((acc, item) => acc + (item.commissionTotalCents ?? 0), 0);

    const clientTotalsMap = new Map<string, { name: string; valueCents: number }>();

    for (const order of monthOrders) {
      const clientId = order.client?.id;
      const clientName = order.client?.name ?? "Cliente";

      if (!clientId) continue;

      const current = clientTotalsMap.get(clientId) ?? {
        name: clientName,
        valueCents: 0,
      };

      current.valueCents += order.totalCents ?? 0;
      clientTotalsMap.set(clientId, current);
    }

    const topClients = Array.from(clientTotalsMap.values())
      .sort((a, b) => b.valueCents - a.valueCents)
      .slice(0, 10);

    const productTotalsMap = new Map<string, { name: string; qty: number }>();

    for (const order of monthOrders) {
      for (const item of order.items) {
        const productId = item.product?.id;
        const productName = item.product?.name ?? "Produto";

        if (!productId) continue;

        const current = productTotalsMap.get(productId) ?? {
          name: productName,
          qty: 0,
        };

        current.qty += item.qty ?? 0;
        productTotalsMap.set(productId, current);
      }
    }

    const topProducts = Array.from(productTotalsMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return NextResponse.json({
      dayCommissionCents: sumCommission(dayOrders),
      weekCommissionCents: sumCommission(weekOrders),
      monthCommissionCents: sumCommission(monthOrders),
      topClients,
      topProducts,
      recentOrders: orders.slice(0, 10),
    });
  } catch (error) {
    console.error("Erro ao buscar comissões do representante:", error);
    return NextResponse.json(
      { error: "Erro ao buscar comissões do representante." },
      { status: 500 }
    );
  }
}