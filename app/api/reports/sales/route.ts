import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderType, PaymentStatus, UserRole } from "@prisma/client";

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

function normalizeId(value: string | null) {
  const text = String(value ?? "").trim();
  if (!text || text === "all") return null;
  return text;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));
    const regionId = normalizeId(searchParams.get("regionId"));
    const sellerId = normalizeId(searchParams.get("sellerId"));

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parâmetros 'from' e 'to' são obrigatórios." },
        { status: 400 }
      );
    }

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const where = {
      issuedAt: {
        gte: from,
        lte: toEnd,
      },
      type: OrderType.SALE,
      ...(regionId ? { regionId } : {}),
      ...(sellerId ? { sellerId } : {}),
    };

    const [orders, regions, sellers] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, sku: true, name: true, commissionCents: true } },
            },
          },
          accountsReceivables: {
            include: {
              installments: {
                orderBy: { installmentNumber: "asc" },
              },
            },
          },
        },
        orderBy: { issuedAt: "asc" },
      }),
      prisma.region.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: {
          OR: [
            { role: UserRole.REPRESENTATIVE },
            { orders: { some: { type: OrderType.SALE } } },
          ],
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const totalOrders = orders.length;
    const totalRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
    const totalDiscountCents = orders.reduce((s, o) => s + o.discountCents, 0);
    const totalCommissionCents = orders.reduce((sum, order) => {
      const itemCommission = order.items.reduce(
        (s, item) => s + item.qty * (item.product?.commissionCents ?? 0),
        0
      );
      return sum + (order.commissionTotalCents || itemCommission);
    }, 0);
    const paidOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PAID);
    const pendingOrders = orders.filter((o) => o.paymentStatus === PaymentStatus.PENDING);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function getOrderCommissionCents(order: (typeof orders)[number]) {
      const itemCommission = order.items.reduce(
        (s, item) => s + item.qty * (item.product?.commissionCents ?? 0),
        0
      );
      return order.commissionTotalCents || itemCommission;
    }

    function getCommissionPaymentInfo(order: (typeof orders)[number], commissionCents: number) {
      const receivables = order.accountsReceivables ?? [];
      const receivableTotalCents = receivables.reduce((sum, ar) => sum + ar.amountCents, 0);
      const receivedCents = receivables.reduce((sum, ar) => {
        const installmentReceived = ar.installments.reduce((s, installment) => s + installment.receivedCents, 0);
        return sum + Math.max(ar.receivedCents, installmentReceived);
      }, 0);

      const baseTotalCents = receivableTotalCents > 0 ? receivableTotalCents : order.totalCents;
      const paidBaseCents = order.paymentStatus === PaymentStatus.PAID
        ? baseTotalCents
        : Math.min(receivedCents, baseTotalCents);
      const payableCommissionCents = baseTotalCents > 0
        ? Math.min(commissionCents, Math.round((commissionCents * paidBaseCents) / baseTotalCents))
        : 0;
      const pendingCommissionCents = Math.max(commissionCents - payableCommissionCents, 0);

      const pendingReasons: Array<{
        label: string;
        dueDate: string | null;
        amountCents: number;
        receivedCents: number;
        pendingAmountCents: number;
        pendingCommissionCents: number;
        reason: string;
      }> = [];

      if (pendingCommissionCents > 0) {
        if (receivables.length > 0) {
          for (const ar of receivables) {
            const installments = ar.installments.length > 0
              ? ar.installments
              : [{
                  installmentNumber: 1,
                  amountCents: ar.amountCents,
                  receivedCents: ar.receivedCents,
                  dueDate: ar.dueDate,
                  status: ar.status,
                }];

            for (const installment of installments) {
              const pendingAmountCents = Math.max(installment.amountCents - installment.receivedCents, 0);
              if (pendingAmountCents <= 0) continue;

              const due = installment.dueDate ? new Date(installment.dueDate) : null;
              const isOverdue = due ? due.getTime() < today.getTime() : false;
              const pendingCommissionForInstallment = baseTotalCents > 0
                ? Math.round((commissionCents * pendingAmountCents) / baseTotalCents)
                : 0;

              pendingReasons.push({
                label: `Parcela ${installment.installmentNumber ?? 1}`,
                dueDate: due ? due.toISOString() : null,
                amountCents: installment.amountCents,
                receivedCents: installment.receivedCents,
                pendingAmountCents,
                pendingCommissionCents: pendingCommissionForInstallment,
                reason: isOverdue
                  ? "Parcela em aberto e vencida"
                  : due
                    ? "Parcela em aberto, ainda não venceu"
                    : "Valor em aberto sem data de vencimento",
              });
            }
          }
        } else {
          pendingReasons.push({
            label: "Pedido",
            dueDate: null,
            amountCents: order.totalCents,
            receivedCents: order.paymentStatus === PaymentStatus.PAID ? order.totalCents : 0,
            pendingAmountCents: order.paymentStatus === PaymentStatus.PAID ? 0 : order.totalCents,
            pendingCommissionCents,
            reason: "Pedido ainda não baixado no financeiro",
          });
        }
      }

      return {
        payableCommissionCents,
        pendingCommissionCents,
        receivedCents: paidBaseCents,
        receivableTotalCents: baseTotalCents,
        pendingReasons,
      };
    }

    let payableCommissionCents = 0;
    let pendingCommissionCents = 0;
    for (const order of orders) {
      const orderCommission = getOrderCommissionCents(order);
      const paymentInfo = getCommissionPaymentInfo(order, orderCommission);
      payableCommissionCents += paymentInfo.payableCommissionCents;
      pendingCommissionCents += paymentInfo.pendingCommissionCents;
    }

    const byRegionMap = new Map<string, { name: string; orders: number; revenueCents: number; commissionCents: number }>();
    for (const o of orders) {
      const key = o.regionId;
      const orderCommission = getOrderCommissionCents(o);
      const existing = byRegionMap.get(key) ?? { name: o.region.name, orders: 0, revenueCents: 0, commissionCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      existing.commissionCents += orderCommission;
      byRegionMap.set(key, existing);
    }
    const byRegion = Array.from(byRegionMap.entries()).map(([id, v]) => ({ id, ...v }));

    const bySellerMap = new Map<string, { name: string; orders: number; revenueCents: number; commissionCents: number }>();
    for (const o of orders) {
      const key = o.sellerId ?? "__no_seller";
      const name = o.seller?.name ?? "Sem vendedor";
      const orderCommission = getOrderCommissionCents(o);
      const existing = bySellerMap.get(key) ?? { name, orders: 0, revenueCents: 0, commissionCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      existing.commissionCents += orderCommission;
      bySellerMap.set(key, existing);
    }
    const bySeller = Array.from(bySellerMap.entries()).map(([id, v]) => ({ id, ...v }));

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

    const byClientMap = new Map<string, { name: string; orders: number; revenueCents: number; commissionCents: number }>();
    for (const o of orders) {
      const key = o.clientId;
      const orderCommission = getOrderCommissionCents(o);
      const existing = byClientMap.get(key) ?? { name: o.client.name, orders: 0, revenueCents: 0, commissionCents: 0 };
      existing.orders += 1;
      existing.revenueCents += o.totalCents;
      existing.commissionCents += orderCommission;
      byClientMap.set(key, existing);
    }
    const topClients = Array.from(byClientMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    const byProductMap = new Map<string, { sku: string | null; name: string; qty: number; revenueCents: number; commissionCents: number }>();
    const soldProductsByClientMap = new Map<string, {
      clientId: string;
      clientName: string;
      regionName: string;
      sellerName: string | null;
      qty: number;
      revenueCents: number;
      commissionCents: number;
      products: Map<string, { sku: string | null; name: string; qty: number; revenueCents: number; commissionCents: number }>;
    }>();

    const commissionOrders = [] as Array<{
      id: string;
      number: number;
      issuedAt: string;
      clientName: string;
      regionName: string;
      sellerId: string | null;
      sellerName: string | null;
      totalCents: number;
      commissionCents: number;
      payableCommissionCents: number;
      pendingCommissionCents: number;
      receivedCents: number;
      receivableTotalCents: number;
      pendingReasons: Array<{ label: string; dueDate: string | null; amountCents: number; receivedCents: number; pendingAmountCents: number; pendingCommissionCents: number; reason: string }>;
      items: Array<{ productId: string; sku: string | null; productName: string; qty: number; unitCents: number; totalCents: number; commissionUnitCents: number; commissionCents: number }>;
    }>;

    for (const o of orders) {
      const clientKey = o.clientId;
      const clientExisting = soldProductsByClientMap.get(clientKey) ?? {
        clientId: o.clientId,
        clientName: o.client.name,
        regionName: o.region.name,
        sellerName: o.seller?.name ?? null,
        qty: 0,
        revenueCents: 0,
        commissionCents: 0,
        products: new Map(),
      };

      const commissionItems = [] as Array<{ productId: string; sku: string | null; productName: string; qty: number; unitCents: number; totalCents: number; commissionUnitCents: number; commissionCents: number }>;

      for (const item of o.items) {
        const productId = item.productId;
        const sku = item.product?.sku ?? null;
        const productName = item.product?.name ?? "Produto sem nome";
        const itemRevenueCents = item.qty * item.unitCents;
        const itemCommissionUnitCents = item.product?.commissionCents ?? 0;
        const itemCommissionCents = item.qty * itemCommissionUnitCents;

        const productExisting = byProductMap.get(productId) ?? {
          sku,
          name: productName,
          qty: 0,
          revenueCents: 0,
          commissionCents: 0,
        };
        productExisting.qty += item.qty;
        productExisting.revenueCents += itemRevenueCents;
        productExisting.commissionCents += itemCommissionCents;
        byProductMap.set(productId, productExisting);

        const clientProductExisting = clientExisting.products.get(productId) ?? {
          sku,
          name: productName,
          qty: 0,
          revenueCents: 0,
          commissionCents: 0,
        };
        clientProductExisting.qty += item.qty;
        clientProductExisting.revenueCents += itemRevenueCents;
        clientProductExisting.commissionCents += itemCommissionCents;
        clientExisting.products.set(productId, clientProductExisting);

        clientExisting.qty += item.qty;
        clientExisting.revenueCents += itemRevenueCents;
        clientExisting.commissionCents += itemCommissionCents;

        commissionItems.push({
          productId,
          sku,
          productName,
          qty: item.qty,
          unitCents: item.unitCents,
          totalCents: itemRevenueCents,
          commissionUnitCents: itemCommissionUnitCents,
          commissionCents: itemCommissionCents,
        });
      }

      soldProductsByClientMap.set(clientKey, clientExisting);

      const orderCommissionCents = getOrderCommissionCents(o);
      const commissionPaymentInfo = getCommissionPaymentInfo(o, orderCommissionCents);

      commissionOrders.push({
        id: o.id,
        number: o.number,
        issuedAt: o.issuedAt.toISOString(),
        clientName: o.client.name,
        regionName: o.region.name,
        sellerId: o.sellerId ?? null,
        sellerName: o.seller?.name ?? null,
        totalCents: o.totalCents,
        commissionCents: orderCommissionCents,
        payableCommissionCents: commissionPaymentInfo.payableCommissionCents,
        pendingCommissionCents: commissionPaymentInfo.pendingCommissionCents,
        receivedCents: commissionPaymentInfo.receivedCents,
        receivableTotalCents: commissionPaymentInfo.receivableTotalCents,
        pendingReasons: commissionPaymentInfo.pendingReasons,
        items: commissionItems,
      });
    }

    const topProducts = Array.from(byProductMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const soldProducts = Array.from(byProductMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.qty - a.qty || b.revenueCents - a.revenueCents);

    const soldProductsByClient = Array.from(soldProductsByClientMap.values())
      .map((client) => ({
        clientId: client.clientId,
        clientName: client.clientName,
        regionName: client.regionName,
        sellerName: client.sellerName,
        qty: client.qty,
        revenueCents: client.revenueCents,
        commissionCents: client.commissionCents,
        products: Array.from(client.products.entries())
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents);

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

    const ordersList = orders.map((o) => ({
      id: o.id,
      number: o.number,
      issuedAt: o.issuedAt.toISOString(),
      clientName: o.client.name,
      regionName: o.region.name,
      sellerName: o.seller?.name ?? null,
      totalCents: o.totalCents,
      discountCents: o.discountCents,
      commissionCents: getOrderCommissionCents(o),
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
      filters: {
        regionId,
        sellerId,
      },
      filterOptions: {
        regions,
        sellers,
      },
      summary: {
        totalOrders,
        totalRevenueCents,
        totalRevenue: money(totalRevenueCents),
        totalDiscountCents,
        totalDiscount: money(totalDiscountCents),
        totalCommissionCents,
        totalCommission: money(totalCommissionCents),
        payableCommissionCents,
        payableCommission: money(payableCommissionCents),
        pendingCommissionCents,
        pendingCommission: money(pendingCommissionCents),
        paidCount: paidOrders.length,
        pendingCount: pendingOrders.length,
        averageTicketCents: totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0,
      },
      byRegion,
      bySeller,
      byPaymentMethod,
      topClients,
      topProducts,
      soldProducts,
      soldProductsByClient,
      commissionOrders,
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
