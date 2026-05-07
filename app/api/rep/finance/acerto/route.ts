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

    const orders = await prisma.order.findMany({
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

    type OrderRow = {
      orderId: string;
      number: number;
      clientName: string;
      issuedAt: Date;
      commissionThisWeekCents: number;
      commissionPriorWeekCents: number;
      pendingCents: number;
      isCurrentWeekSale: boolean;
    };

    const orderRows: OrderRow[] = [];
    let totalCurrentWeekCents = 0;
    let totalPriorWeekCents = 0;
    let totalPendingCents = 0;

    for (const order of orders) {
      const commissionTotal = Math.max(0, order.commissionTotalCents ?? 0);
      const orderTotal = Math.max(0, order.totalCents ?? 0);
      if (!commissionTotal || !orderTotal) continue;

      let paidThisWeekCents = 0;
      let paidBeforeThisWeekCents = 0;

      if (!order.accountsReceivables.length) {
        if (order.paymentStatus === "PAID") {
          paidBeforeThisWeekCents = orderTotal;
        }
      } else {
        for (const ar of order.accountsReceivables) {
          const items = ar.installments.length ? ar.installments : [ar];
          for (const item of items) {
            const amount = Math.max(0, item.amountCents ?? 0);
            const received = Math.max(0, item.receivedCents ?? 0);
            const isPaid = item.status === "PAID" || !!item.paidAt;
            const effective = isPaid ? Math.max(received, amount) : Math.min(received, amount);
            if (!effective) continue;

            if (item.paidAt && new Date(item.paidAt) >= weekStart) {
              paidThisWeekCents += effective;
            } else if (isPaid || received > 0) {
              paidBeforeThisWeekCents += effective;
            }
          }
        }
      }

      paidThisWeekCents = Math.min(paidThisWeekCents, orderTotal);
      paidBeforeThisWeekCents = Math.min(paidBeforeThisWeekCents, orderTotal - paidThisWeekCents);

      const commissionThisWeek = proratedCommission(commissionTotal, orderTotal, paidThisWeekCents);
      const commissionBeforeThisWeek = proratedCommission(commissionTotal, orderTotal, paidBeforeThisWeekCents);
      const pending = Math.max(0, commissionTotal - commissionThisWeek - commissionBeforeThisWeek);

      if (commissionThisWeek === 0 && pending === 0) continue;

      const isCurrentWeekSale = new Date(order.issuedAt) >= weekStart;

      // Para exibição na lista do rep: comissão desta semana = o que entrou esta semana
      const commissionThisWeekForRep = commissionThisWeek;
      const commissionPriorWeekForRep = isCurrentWeekSale ? 0 : commissionBeforeThisWeek;

      if (isCurrentWeekSale) {
        totalCurrentWeekCents += commissionThisWeek;
      } else {
        totalPriorWeekCents += commissionThisWeek;
      }
      totalPendingCents += pending;

      orderRows.push({
        orderId: order.id,
        number: order.number,
        clientName: order.client.name,
        issuedAt: order.issuedAt,
        commissionThisWeekCents: commissionThisWeekForRep,
        commissionPriorWeekCents: commissionPriorWeekForRep,
        pendingCents: pending,
        isCurrentWeekSale,
      });
    }

    const totalPayable = totalCurrentWeekCents + totalPriorWeekCents;

    return NextResponse.json({
      ok: true,
      weekStart,
      calculatedAt: new Date(),
      summary: {
        totalPayable,
        currentWeekCents: totalCurrentWeekCents,
        priorWeeksCents: totalPriorWeekCents,
        pendingCents: totalPendingCents,
      },
      orders: orderRows,
    });
  } catch (error) {
    console.error("GET /api/rep/finance/acerto error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar acerto." },
      { status: 500 }
    );
  }
}
