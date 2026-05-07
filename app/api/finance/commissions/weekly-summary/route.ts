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

    // Busca todos os representantes ativos
    const representatives = await prisma.user.findMany({
      where: { role: "REPRESENTATIVE", active: true },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        region: { select: { id: true, name: true } },
      },
    });

    // Busca todas as ordens de venda com comissão e seus recebimentos
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
            paidAt: true,
            installments: {
              select: {
                amountCents: true,
                receivedCents: true,
                paidAt: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Indexa ordens por vendedor
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
      pendingCents: number;
    };

    const rows: RepRow[] = [];

    for (const rep of representatives) {
      const repOrders = ordersBySeller.get(rep.id) ?? [];

      let payableCurrentWeekCents = 0;
      let payablePriorWeekCents = 0;
      let pendingCents = 0;
      const orderIds = new Set<string>();

      for (const order of repOrders) {
        const commissionTotal = Math.max(0, order.commissionTotalCents ?? 0);
        const orderTotal = Math.max(0, order.totalCents ?? 0);
        if (!commissionTotal || !orderTotal) continue;

        // Calcula quanto foi pago esta semana vs antes desta semana vs pendente
        let paidThisWeekCents = 0;
        let paidBeforeThisWeekCents = 0;

        if (!order.accountsReceivables.length) {
          if (order.paymentStatus === "PAID") {
            paidBeforeThisWeekCents = orderTotal;
          }
        } else {
          for (const ar of order.accountsReceivables) {
            const installments = ar.installments;
            if (installments.length) {
              for (const inst of installments) {
                const amount = Math.max(0, inst.amountCents ?? 0);
                const received = Math.max(0, inst.receivedCents ?? 0);
                const isPaid = inst.status === "PAID" || !!inst.paidAt;
                const effectiveAmount = isPaid ? Math.max(received, amount) : Math.min(received, amount);
                if (!effectiveAmount) continue;

                if (inst.paidAt && new Date(inst.paidAt) >= weekStart) {
                  paidThisWeekCents += effectiveAmount;
                } else if (isPaid || received > 0) {
                  paidBeforeThisWeekCents += effectiveAmount;
                }
              }
            } else {
              const amount = Math.max(0, ar.amountCents ?? 0);
              const received = Math.max(0, ar.receivedCents ?? 0);
              const isPaid = ar.status === "PAID" || !!ar.paidAt;
              const effectiveAmount = isPaid ? Math.max(received, amount) : Math.min(received, amount);
              if (!effectiveAmount) continue;

              if (ar.paidAt && new Date(ar.paidAt) >= weekStart) {
                paidThisWeekCents += effectiveAmount;
              } else if (isPaid || received > 0) {
                paidBeforeThisWeekCents += effectiveAmount;
              }
            }
          }
        }

        paidThisWeekCents = Math.min(paidThisWeekCents, orderTotal);
        paidBeforeThisWeekCents = Math.min(paidBeforeThisWeekCents, orderTotal - paidThisWeekCents);

        const commissionThisWeek = proratedCommission(commissionTotal, orderTotal, paidThisWeekCents);
        const commissionBeforeThisWeek = proratedCommission(commissionTotal, orderTotal, paidBeforeThisWeekCents);
        const totalPaidCommission = commissionThisWeek + commissionBeforeThisWeek;
        const orderPending = Math.max(0, commissionTotal - totalPaidCommission);

        // Classifica comissão desta semana por origem da venda
        if (commissionThisWeek > 0) {
          const isCurrentWeekSale = new Date(order.issuedAt) >= weekStart;
          if (isCurrentWeekSale) {
            payableCurrentWeekCents += commissionThisWeek;
          } else {
            payablePriorWeekCents += commissionThisWeek;
          }
          orderIds.add(order.id);
        }

        if (orderPending > 0) {
          pendingCents += orderPending;
          orderIds.add(order.id);
        }
      }

      const amountCents = payableCurrentWeekCents + payablePriorWeekCents;

      if (amountCents === 0 && pendingCents === 0) continue;

      rows.push({
        representativeId: rep.id,
        representative: rep.name,
        region: rep.region?.name ?? "Sem região",
        ordersCount: orderIds.size,
        payableCurrentWeekCents,
        payablePriorWeekCents,
        amountCents,
        pendingCents,
      });
    }

    const totals = rows.reduce(
      (acc, r) => ({
        totalPayable: acc.totalPayable + r.amountCents,
        totalCurrentWeek: acc.totalCurrentWeek + r.payableCurrentWeekCents,
        totalPriorWeeks: acc.totalPriorWeeks + r.payablePriorWeekCents,
        totalPending: acc.totalPending + r.pendingCents,
      }),
      { totalPayable: 0, totalCurrentWeek: 0, totalPriorWeeks: 0, totalPending: 0 }
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
