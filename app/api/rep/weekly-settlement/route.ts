import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceCategoryType, FinanceEntryType, PaymentReceiver } from "@prisma/client";

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
  const diff = day === 0 ? -6 : 1 - day; // semana começando na segunda
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = (searchParams.get("region") ?? "").trim();

    if (!region) {
      return NextResponse.json(
        { error: "Região é obrigatória." },
        { status: 400 }
      );
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfDay(now);

    const salesFinance = await prisma.financeTransaction.findMany({
      where: {
        category: FinanceCategoryType.SALES,
        type: FinanceEntryType.INCOME,
        paidAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        region: {
          name: region,
        },
      },
      orderBy: {
        paidAt: "desc",
      },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            totalCents: true,
            commissionTotalCents: true,
            paymentMethod: true,
            paymentReceiver: true,
            paymentStatus: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
        region: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const normalizedRows = salesFinance
      .filter((tx) => tx.order)
      .map((tx) => {
        const order = tx.order!;
        const commissionCents = order.commissionTotalCents ?? 0;
        const totalCents = order.totalCents ?? tx.amountCents ?? 0;
        const companyShareCents = Math.max(0, totalCents - commissionCents);
        const paymentReceiver = order.paymentReceiver;
        const paidAt = tx.paidAt ?? tx.createdAt;

        return {
          financeTransactionId: tx.id,
          orderId: order.id,
          orderNumber: order.number,
          clientName: order.client?.name ?? "Cliente",
          paymentMethod: order.paymentMethod,
          paymentReceiver,
          paymentStatus: order.paymentStatus,
          totalCents,
          commissionCents,
          companyShareCents,
          paidAt,
        };
      });

    const regionReceived = normalizedRows.filter(
      (row) => row.paymentReceiver === PaymentReceiver.REGION
    );

    const matrixReceived = normalizedRows.filter(
      (row) => row.paymentReceiver === PaymentReceiver.MATRIX
    );

    const representativeOwesMatrixCents = regionReceived.reduce(
      (acc, row) => acc + row.companyShareCents,
      0
    );

    const matrixOwesRepresentativeCents = matrixReceived.reduce(
      (acc, row) => acc + row.commissionCents,
      0
    );

    const totalCommissionGeneratedCents = normalizedRows.reduce(
      (acc, row) => acc + row.commissionCents,
      0
    );

    const totalSalesPaidThisWeekCents = normalizedRows.reduce(
      (acc, row) => acc + row.totalCents,
      0
    );

    const netSettlementCents =
      matrixOwesRepresentativeCents - representativeOwesMatrixCents;

    const dailyBuckets = new Map<
      string,
      {
        date: string;
        totalSalesPaidCents: number;
        matrixOwesRepresentativeCents: number;
        representativeOwesMatrixCents: number;
        commissionGeneratedCents: number;
      }
    >();

    for (const row of normalizedRows) {
      const key = formatDateKey(new Date(row.paidAt));
      const current = dailyBuckets.get(key) ?? {
        date: key,
        totalSalesPaidCents: 0,
        matrixOwesRepresentativeCents: 0,
        representativeOwesMatrixCents: 0,
        commissionGeneratedCents: 0,
      };

      current.totalSalesPaidCents += row.totalCents;
      current.commissionGeneratedCents += row.commissionCents;

      if (row.paymentReceiver === PaymentReceiver.MATRIX) {
        current.matrixOwesRepresentativeCents += row.commissionCents;
      } else {
        current.representativeOwesMatrixCents += row.companyShareCents;
      }

      dailyBuckets.set(key, current);
    }

    return NextResponse.json({
      region,
      weekStart,
      weekEnd,
      totals: {
        totalSalesPaidThisWeekCents,
        totalCommissionGeneratedCents,
        matrixOwesRepresentativeCents,
        representativeOwesMatrixCents,
        netSettlementCents,
      },
      summary: {
        totalOrdersPaidThisWeek: normalizedRows.length,
        matrixReceivedOrders: matrixReceived.length,
        regionReceivedOrders: regionReceived.length,
      },
      daily: Array.from(dailyBuckets.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      matrixReceivedOrders: matrixReceived,
      regionReceivedOrders: regionReceived,
    });
  } catch (error) {
    console.error("Erro ao calcular fechamento semanal:", error);
    return NextResponse.json(
      { error: "Erro ao calcular fechamento semanal." },
      { status: 500 }
    );
  }
}