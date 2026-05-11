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

function proratedCommission(commissionTotal: number, orderTotal: number, paidCents: number) {
  if (!commissionTotal || !orderTotal || !paidCents) return 0;
  if (paidCents >= orderTotal) return commissionTotal;
  return Math.round((commissionTotal * paidCents) / orderTotal);
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const weekStart = getCurrentWeekStart();
    const now = new Date();

    const [orders, paidConfirmations] = await Promise.all([
      prisma.order.findMany({
        where: {
          sellerId: user.id,
          type: "SALE",
          status: { not: "CANCELLED" },
          commissionTotalCents: { gt: 0 },
        },
        orderBy: { issuedAt: "asc" },
        select: {
          id: true,
          number: true,
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
      }),
      prisma.commissionPaymentConfirmation.findMany({
        where: {
          representativeId: user.id,
          status: "PAID",
        },
        orderBy: { confirmedAt: "desc" },
        take: 10,
        select: {
          id: true,
          amountCents: true,
          weekStart: true,
          weekEnd: true,
          confirmedAt: true,
        },
      }),
    ]);

    type OrderRow = {
      orderId: string;
      number: number;
      clientName: string;
      issuedAt: Date;
      commissionThisWeekCents: number;
      pendingOverdueCents: number;
      pendingNormalCents: number;
      isCurrentWeekSale: boolean;
      hasOverdue: boolean;
    };

    const orderRows: OrderRow[] = [];
    let totalCurrentWeekCents = 0;
    let totalPriorWeekCents = 0;
    let totalPendingOverdueCents = 0;
    let totalPendingNormalCents = 0;

    for (const order of orders) {
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
            const effective = isPaid ? Math.max(received, amount) : Math.min(received, amount);

            if (effective > 0) {
              if (item.paidAt && new Date(item.paidAt) >= weekStart) {
                paidThisWeekCents += effective;
              } else if (isPaid || received > 0) {
                paidBeforeThisWeekCents += effective;
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
      const totalReleasedCommission = commissionThisWeek + commissionBeforeThisWeek;

      const pendingOverdueCents = proratedCommission(commissionTotal, orderTotal, Math.min(unpaidOverdueCents, orderTotal));
      const pendingTotal = Math.max(0, commissionTotal - totalReleasedCommission);
      const pendingNormalCents = Math.max(0, pendingTotal - pendingOverdueCents);

      if (commissionThisWeek === 0 && pendingTotal === 0) continue;

      const isCurrentWeekSale = new Date(order.issuedAt) >= weekStart;

      if (isCurrentWeekSale) {
        totalCurrentWeekCents += commissionThisWeek;
      } else {
        totalPriorWeekCents += commissionThisWeek;
      }
      totalPendingOverdueCents += pendingOverdueCents;
      totalPendingNormalCents += pendingNormalCents;

      orderRows.push({
        orderId: order.id,
        number: order.number,
        clientName: order.client.name,
        issuedAt: order.issuedAt,
        commissionThisWeekCents: commissionThisWeek,
        pendingOverdueCents,
        pendingNormalCents,
        isCurrentWeekSale,
        hasOverdue: pendingOverdueCents > 0,
      });
    }

    const totalPayable = totalCurrentWeekCents + totalPriorWeekCents;
    const totalAlreadyConfirmedCents = paidConfirmations.reduce((s, c) => s + (c.amountCents ?? 0), 0);

    return NextResponse.json({
      ok: true,
      weekStart,
      calculatedAt: new Date(),
      summary: {
        totalPayable,
        currentWeekCents: totalCurrentWeekCents,
        priorWeeksCents: totalPriorWeekCents,
        pendingOverdueCents: totalPendingOverdueCents,
        pendingNormalCents: totalPendingNormalCents,
        totalAlreadyConfirmedCents,
      },
      orders: orderRows,
      paidHistory: paidConfirmations,
    });
  } catch (error) {
    console.error("GET /api/rep/finance/acerto error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar acerto." },
      { status: 500 }
    );
  }
}
