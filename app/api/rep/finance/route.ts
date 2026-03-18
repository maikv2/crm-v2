import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { FinanceEntryType, FinanceScope } from "@prisma/client";

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
        region: null,
        entries: [],
      });
    }

    const [region, financeEntries, receipts, transfers] = await Promise.all([
      prisma.region.findUnique({
        where: { id: user.regionId },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.financeTransaction.findMany({
        where: {
          regionId: user.regionId,
          scope: FinanceScope.REGION,
        },
        select: {
          id: true,
          description: true,
          amountCents: true,
          type: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              number: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),

      prisma.receipt.findMany({
        where: {
          regionId: user.regionId,
        },
        select: {
          id: true,
          amountCents: true,
          receivedAt: true,
          paymentMethod: true,
          order: {
            select: {
              id: true,
              number: true,
            },
          },
        },
        orderBy: {
          receivedAt: "desc",
        },
        take: 100,
      }),

      prisma.cashTransfer.findMany({
        where: {
          regionId: user.regionId,
        },
        select: {
          id: true,
          amountCents: true,
          transferredAt: true,
          status: true,
          notes: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
      }),
    ]);

    const normalizedFinanceEntries = financeEntries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      amountCents: entry.amountCents,
      type: entry.type,
      createdAt: entry.createdAt,
      order: entry.order,
      source: "FINANCE_TRANSACTION",
    }));

    const normalizedReceipts = receipts.map((receipt) => ({
      id: `receipt-${receipt.id}`,
      description: `Recebimento ${receipt.paymentMethod}`,
      amountCents: receipt.amountCents,
      type: FinanceEntryType.INCOME,
      createdAt: receipt.receivedAt,
      order: receipt.order,
      source: "RECEIPT",
    }));

    const normalizedTransfers = transfers.map((transfer) => ({
      id: `transfer-${transfer.id}`,
      description:
        transfer.status === "TRANSFERRED"
          ? "Repasse realizado para matriz"
          : "Repasse pendente para matriz",
      amountCents: transfer.amountCents,
      type: FinanceEntryType.EXPENSE,
      createdAt: transfer.transferredAt,
      order: null,
      source: "CASH_TRANSFER",
      notes: transfer.notes,
      status: transfer.status,
    }));

    const entries = [
      ...normalizedFinanceEntries,
      ...normalizedReceipts,
      ...normalizedTransfers,
    ].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({
      region,
      entries,
    });
  } catch (error) {
    console.error("REP FINANCE ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar financeiro do representante." },
      { status: 500 }
    );
  }
}