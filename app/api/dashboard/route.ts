import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    clients,
    products,
    exhibitors,
    activeExhibitors,
    overdueVisits,
    visitsCount,
    maintenancesCount,
    clientsWithExhibitor,
    orders,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.product.count(),
    prisma.exhibitor.count(),
    prisma.exhibitor.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.exhibitor.count({
      where: {
        nextVisitAt: {
          lt: new Date(),
        },
      },
    }),
    prisma.visit.count(),
    prisma.exhibitorMaintenance.count(),
    prisma.client.count({
      where: {
        exhibitors: {
          some: {},
        },
      },
    }),
    prisma.order.findMany({
      include: {
        client: true,
        region: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    }),
  ]);

  const totalSalesCents = orders.reduce(
    (acc, o) => acc + (o.totalCents ?? 0),
    0
  );

  const salesTodayCents = orders
    .filter((o) => new Date(o.issuedAt) >= today)
    .reduce((acc, o) => acc + (o.totalCents ?? 0), 0);

  const salesMonthCents = orders
    .filter((o) => new Date(o.issuedAt) >= monthStart)
    .reduce((acc, o) => acc + (o.totalCents ?? 0), 0);

  const regionMap = new Map();

  for (const order of orders) {
    const key = order.regionId ?? "none";
    const name = order.region?.name ?? "Sem região";

    if (!regionMap.has(key)) {
      regionMap.set(key, {
        regionName: name,
        totalCents: 0,
        ordersCount: 0,
      });
    }

    const r = regionMap.get(key);
    r.totalCents += order.totalCents ?? 0;
    r.ordersCount += 1;
  }

  const salesByRegion = Array.from(regionMap.values()).sort(
    (a, b) => b.totalCents - a.totalCents
  );

  const clientMap = new Map();

  for (const order of orders) {
    const key = order.clientId;
    const name = order.client?.name ?? "Cliente";

    if (!clientMap.has(key)) {
      clientMap.set(key, {
        clientName: name,
        totalCents: 0,
      });
    }

    const c = clientMap.get(key);
    c.totalCents += order.totalCents ?? 0;
  }

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 5);

  const productMap = new Map();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productId;
      const name = item.product?.name ?? "Produto";

      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: name,
          qty: 0,
        });
      }

      const p = productMap.get(key);
      p.qty += item.qty ?? 0;
    }
  }

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const monthMap = new Map();

  for (const order of orders) {
    const d = new Date(order.issuedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        key,
        label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
        totalCents: 0,
      });
    }

    const m = monthMap.get(key);
    m.totalCents += order.totalCents ?? 0;
  }

  const salesByMonth = Array.from(monthMap.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ label, totalCents }) => ({
      label,
      totalCents,
    }));

  const recentOrders = orders.slice(0, 5).map((o) => ({
    clientName: o.client?.name ?? "Cliente",
    regionName: o.region?.name ?? "Sem região",
    totalCents: o.totalCents ?? 0,
    issuedAt: o.issuedAt,
  }));

    const regions = await prisma.region.findMany({
    include: {
      clients: true,
      exhibitors: true,
      orders: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const regionsSummary = regions.map((region) => {
    const salesCents = region.orders.reduce(
      (acc, order) => acc + (order.totalCents ?? 0),
      0
    );

    const monthlyTargetCents = region.monthlySalesTargetCents ?? 0;
    const percent =
      monthlyTargetCents > 0
        ? Math.round((salesCents / monthlyTargetCents) * 100)
        : 0;

    return {
      id: region.id,
      name: region.name,
      clients: region.clients.length,
      exhibitors: region.exhibitors.length,
      orders: region.orders.length,
      salesCents,
      monthlyTargetCents,
      percent,
    };
  });

  return NextResponse.json({
    clients,
    products,
    exhibitors,
    activeExhibitors,
    overdueVisits,
    visitsCount,
    maintenancesCount,
    clientsWithExhibitor,
    ordersCount: orders.length,
    totalSalesCents,
    salesTodayCents,
    salesMonthCents,
    salesByRegion,
    topClients,
    topProducts,
    salesByMonth,
    recentOrders,
    regionsSummary,
  });
}