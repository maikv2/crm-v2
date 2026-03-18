import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {

  const exhibitors = await prisma.exhibitor.findMany({
    include: {
      client: true,
      region: true,
      orders: {
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });

  const result = exhibitors.map((exhibitor) => {

    const orders = exhibitor.orders ?? [];

    const totalSalesCents = orders.reduce(
      (acc, o) => acc + (o.totalCents ?? 0),
      0
    );

    const ordersCount = orders.length;

    const avgTicketCents =
      ordersCount === 0 ? 0 : Math.round(totalSalesCents / ordersCount);

    const lastSaleAt =
      orders.length > 0
        ? orders.sort((a, b) =>
            new Date(b.issuedAt).getTime() -
            new Date(a.issuedAt).getTime()
          )[0].issuedAt
        : null;

    const productMap = new Map();

    for (const order of orders) {
      for (const item of order.items ?? []) {

        const key = item.productId;
        const name = item.product?.name ?? "Produto";

        if (!productMap.has(key)) {
          productMap.set(key, {
            productName: name,
            qty: 0
          });
        }

        const p = productMap.get(key);
        p.qty += item.qty ?? 0;
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 3);

    return {
      id: exhibitor.id,
      clientName: exhibitor.client?.name ?? "Cliente",
      regionName: exhibitor.region?.name ?? "Sem região",
      installedAt: exhibitor.installedAt,
      lastSaleAt,
      totalSalesCents,
      ordersCount,
      avgTicketCents,
      topProducts
    };
  });

  result.sort((a, b) => b.totalSalesCents - a.totalSalesCents);

  return NextResponse.json(result);
}