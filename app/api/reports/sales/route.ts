import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderType, PaymentMethod, PaymentStatus } from "@prisma/client";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function money(cents: number) {
  return cents / 100;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  BOLETO: "Boleto",
  CARD_DEBIT: "Cartão Débito",
  CARD_CREDIT: "Cartão Crédito",
};

const STATUS_LABELS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  CANCELLED: "Cancelado",
  DEFECT_EXCHANGE: "Troca por Defeito",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parâmetros 'from' e 'to' são obrigatórios." },
        { status: 400 }
      );
    }

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        issuedAt: {
          gte: from,
          lte: toEnd,
        },
        type: OrderType.SALE,
      },
      include: {
        client: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { issuedAt: "asc" },
    });

    // ── Summary ────────────────────────────────────────────────────────────────
    const totalOrders = orders.length;
    const totalRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
    const totalDiscountCents = orders.reduce((s, o) => s + o.discountCents, 0);
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID);
    const pendingOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PENDING);

    // ── By region ─────────────────────────────────────────────────────────────
    const byRegionMap = new Map<string, { name: string; orders: number; revenueCents: number }>();
    for (const o of orders) {
      const key = o.regionId;
      const existing = byRegionMap.get(key) ?? { name: o.region.name, orders: 0, revenueCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      byRegionMap.set(key, existing);
    }
    const byRegion = Array.from(byRegionMap.entries()).map(([id, v]) => ({ id, ...v }));

    // ── By seller ─────────────────────────────────────────────────────────────
    const bySellerMap = new Map<string, { name: string; orders: number; revenueCents: number }>();
    for (const o of orders) {
      const key = o.sellerId ?? "__no_seller";
      const name = o.seller?.name ?? "Sem vendedor";
      const existing = bySellerMap.get(key) ?? { name, orders: 0, revenueCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      bySellerMap.set(key, existing);
    }
    const bySeller = Array.from(bySellerMap.entries()).map(([id, v]) => ({ id, ...v }));

    // ── By payment method ─────────────────────────────────────────────────────
    const byPaymentMap = new Map<string, { label: string; orders: number; revenueCents: number }>();
    for (const o of orders) {
      const key = o.paymentMethod;
      const label = PAYMENT_METHOD_LABELS[key] ?? key;
      const existing = byPaymentMap.get(key) ?? { label, orders: 0, revenueCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      byPaymentMap.set(key, existing);
    }
    const byPaymentMethod = Array.from(byPaymentMap.values());

    // ── Top clients ────────────────────────────────────────────────────────────
    const byClientMap = new Map<string, { name: string; orders: number; revenueCents: number }>();
    for (const o of orders) {
      const key = o.clientId;
      const existing = byClientMap.get(key) ?? { name: o.client.name, orders: 0, revenueCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      byClientMap.set(key, existing);
    }
    const topClients = Array.from(byClientMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    // ── Top products ───────────────────────────────────────────────────────────
    const byProductMap = new Map<string, { name: string; qty: number; revenueCents: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const key = item.productId;
        const existing = byProductMap.get(key) ?? {
          name: item.product.name,
          qty: 0,
          revenueCents: 0,
        };
        existing.qty += item.qty;
        existing.revenueCents += item.qty * item.unitCents;
        byProductMap.set(key, existing);
      }
    }
    const topProducts = Array.from(byProductMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ── By day (for chart) ─────────────────────────────────────────────────────
    const byDayMap = new Map<string, { orders: number; revenueCents: number }>();
    for (const o of orders) {
      const key = o.issuedAt.toISOString().split("T")[0];
      const existing = byDayMap.get(key) ?? { orders: 0, revenueCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      byDayMap.set(key, existing);
    }
    const byDay = Array.from(byDayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Orders list ────────────────────────────────────────────────────────────
    const ordersList = orders.map((o) => ({
      id: o.id,
      number: o.number,
      issuedAt: o.issuedAt.toISOString(),
      clientName: o.client.name,
      regionName: o.region.name,
      sellerName: o.seller?.name ?? null,
      totalCents: o.totalCents,
      discountCents: o.discountCents,
      paymentMethod: o.paymentMethod,
      paymentMethodLabel: PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
      status: o.status,
      statusLabel: STATUS_LABELS[o.status] ?? o.status,
      paymentStatus: o.paymentStatus,
      itemCount: o.items.length,
    }));

    return NextResponse.json({
      period: {
        from: from.toISOString(),
        to: toEnd.toISOString(),
      },
      summary: {
        totalOrders,
        totalRevenueCents,
        totalRevenue: money(totalRevenueCents),
        totalDiscountCents,
        totalDiscount: money(totalDiscountCents),
        paidCount: paidOrders.length,
        pendingCount: pendingOrders.length,
        averageTicketCents: totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0,
      },
      byRegion,
      bySeller,
      byPaymentMethod,
      topClients,
      topProducts,
      byDay,
      orders: ordersList,
    });
  } catch (error) {
    console.error("GET /api/reports/sales error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório de vendas." },
      { status: 500 }
    );
  }
}
