import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

function getCurrentWeekStart(now = new Date()) {
  const saoPauloOffsetHours = 3;
  const localLike = new Date(now.getTime() - saoPauloOffsetHours * 60 * 60 * 1000);
  const day = localLike.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const mondayLocalLike = new Date(localLike);
  mondayLocalLike.setUTCDate(localLike.getUTCDate() + diffToMonday);
  mondayLocalLike.setUTCHours(0, 0, 0, 0);

  return new Date(mondayLocalLike.getTime() + saoPauloOffsetHours * 60 * 60 * 1000);
}

function proratedCommission(commissionTotalCents: number, totalCents: number, paidCents: number) {
  if (!commissionTotalCents || !totalCents || !paidCents) return 0;
  if (paidCents >= totalCents) return commissionTotalCents;
  return Math.round((commissionTotalCents * paidCents) / totalCents);
}

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "ADMINISTRATIVE") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const weekStart = getCurrentWeekStart();
    const now = new Date();

    const representatives = await prisma.user.findMany({
      where: { role: "REPRESENTATIVE", active: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        region: { select: { id: true, name: true } },
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        type: "SALE",
        status: { not: "CANCELLED" },
        commissionTotalCents: { gt: 0 },
      },
      select: {
        id: true,
        sellerId: true,
        issuedAt: true,
        totalCents: true,
        commissionTotalCents: true,
        paymentStatus: true,
        client: { select: { name: true } },
        accountsReceivables: {
          select: {
            status: true,
            amountCents: true,
            receivedCents: true,
            dueDate: true,
            paidAt: true,
            installments: {
              select: {
                amountCents: true,
                receivedCents: true,
                dueDate: true,
                paidAt: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Busca confirmações pagas para saber o histórico por representante
    const confirmations = await prisma.commissionPaymentConfirmation.findMany({
      where: {
        status: "CONFIRMED",
        representativeId: { in: representatives.map((r) => r.id) },
      },
      select: {
        representativeId: true,
        amountCents: true,
        confirmedAt: true,
      },
    });

    const confirmedByRep = new Map<string, number>();
    for (const c of confirmations) {
      confirmedByRep.set(c.representativeId, (confirmedByRep.get(c.representativeId) ?? 0) + (c.amountCents ?? 0));
    }

    const ordersBySeller = new Map<string, typeof orders>();
    for (const order of orders) {
      if (!order.sellerId) continue;
      if (!ordersBySeller.has(order.sellerId)) ordersBySeller.set(order.sellerId, []);
      ordersBySeller.get(order.sellerId)!.push(order);
    }

    type RepRow = {
      representativeId: string;
      representative: string;
      region: string;
      ordersCount: number;
      payableCurrentWeekCents: number;
      payablePriorWeekCents: number;
      amountCents: number;
      pendingOverdueCents: number;
      pendingNormalCents: number;
      totalConfirmedCents: number;
    };

    const rows: RepRow[] = [];

    for (const rep of representatives) {
      const repOrders = ordersBySeller.get(rep.id) ?? [];

      let payableCurrentWeekCents = 0;
      let payablePriorWeekCents = 0;
      let pendingOverdueCents = 0;
      let pendingNormalCents = 0;
      const orderIds = new Set<string>();

      for (const order of repOrders) {
        const commissionTotal = Math.max(0, order.commissionTotalCents ?? 0);
        const orderTotal = Math.max(0, order.totalCents ?? 0);
        if (!commissionTotal || !orderTotal) continue;

        let paidThisWeekCents = 0;
        let paidBeforeThisWeekCents = 0;
        let unpaidOverdueCents = 0;
        let unpaidNormalCents = 0;

        if (!order.accountsReceivables.length) {
          if (order.paymentStatus === "PAID") {
            paidBeforeThisWeekCents = orderTotal;
          } else {
            unpaidNormalCents = orderTotal;
          }
        } else {
          for (const ar of order.accountsReceivables) {
            const items = ar.installments.length
              ? ar.installments.map((i) => ({ ...i, dueDate: i.dueDate }))
              : [{ amountCents: ar.amountCents, receivedCents: ar.receivedCents, dueDate: ar.dueDate, paidAt: ar.paidAt, status: ar.status }];

            for (const item of items) {
              const amount = Math.max(0, item.amountCents ?? 0);
              const received = Math.max(0, item.receivedCents ?? 0);
              const isPaid = item.status === "PAID" || !!item.paidAt;
              const effectiveAmount = isPaid ? Math.max(received, amount) : Math.min(received, amount);

              if (effectiveAmount > 0) {
                if (item.paidAt && new Date(item.paidAt) >= weekStart) {
                  paidThisWeekCents += effectiveAmount;
                } else if (isPaid || received > 0) {
                  paidBeforeThisWeekCents += effectiveAmount;
                }
              }

              if (!isPaid) {
                const unpaidAmount = Math.max(0, amount - received);
                if (unpaidAmount > 0) {
                  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                  const isOverdue =
                    item.status === "OVERDUE" || (dueDate !== null && dueDate < now);
                  if (isOverdue) {
                    unpaidOverdueCents += unpaidAmount;
                  } else {
                    unpaidNormalCents += unpaidAmount;
                  }
                }
              }
            }
          }
        }

        paidThisWeekCents = Math.min(paidThisWeekCents, orderTotal);
        paidBeforeThisWeekCents = Math.min(paidBeforeThisWeekCents, orderTotal - paidThisWeekCents);

        const commissionThisWeek = proratedCommission(commissionTotal, orderTotal, paidThisWeekCents);
        const commissionBeforeThisWeek = proratedCommission(commissionTotal, orderTotal, paidBeforeThisWeekCents);
        const totalReleased = commissionThisWeek + commissionBeforeThisWeek;

        const orderPendingOverdue = proratedCommission(commissionTotal, orderTotal, Math.min(unpaidOverdueCents, orderTotal));
        const orderPendingTotal = Math.max(0, commissionTotal - totalReleased);
        const orderPendingNormal = Math.max(0, orderPendingTotal - orderPendingOverdue);

        if (commissionThisWeek > 0) {
          const isCurrentWeekSale = new Date(order.issuedAt) >= weekStart;
          if (isCurrentWeekSale) {
            payableCurrentWeekCents += commissionThisWeek;
          } else {
            payablePriorWeekCents += commissionThisWeek;
          }
          orderIds.add(order.id);
        }

        if (orderPendingTotal > 0) {
          pendingOverdueCents += orderPendingOverdue;
          pendingNormalCents += orderPendingNormal;
          orderIds.add(order.id);
        }
      }

      const amountCents = payableCurrentWeekCents + payablePriorWeekCents;

      if (amountCents === 0 && pendingOverdueCents === 0 && pendingNormalCents === 0) continue;

      rows.push({
        representativeId: rep.id,
        representative: rep.name,
        region: rep.region?.name ?? "Sem região",
        ordersCount: orderIds.size,
        payableCurrentWeekCents,
        payablePriorWeekCents,
        amountCents,
        pendingOverdueCents,
        pendingNormalCents,
        totalConfirmedCents: confirmedByRep.get(rep.id) ?? 0,
      });
    }

    const totals = rows.reduce(
      (acc, r) => ({
        totalPayable: acc.totalPayable + r.amountCents,
        totalCurrentWeek: acc.totalCurrentWeek + r.payableCurrentWeekCents,
        totalPriorWeeks: acc.totalPriorWeeks + r.payablePriorWeekCents,
        totalPendingOverdue: acc.totalPendingOverdue + r.pendingOverdueCents,
        totalPendingNormal: acc.totalPendingNormal + r.pendingNormalCents,
      }),
      { totalPayable: 0, totalCurrentWeek: 0, totalPriorWeeks: 0, totalPendingOverdue: 0, totalPendingNormal: 0 }
    );

    return NextResponse.json({
      ok: true,
      weekStart,
      calculatedAt: new Date(),
      totals,
      confirmations: rows,
    });
  } catch (error) {
    console.error("GET /api/finance/commissions/weekly-summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar resumo de comissões." },
      { status: 500 }
    );
  }
}
