import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FinanceEntryType,
  FinanceStatus,
  ReceivableStatus,
} from "@prisma/client";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function money(cents: number) {
  return cents / 100;
}

const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Vendas",
  COMMISSION: "Comissão",
  INVESTMENT: "Investimento",
  DISTRIBUTION: "Distribuição",
  TRANSFER: "Repasse",
  OPERATIONAL: "Operacional",
  OTHER: "Outros",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  BOLETO: "Boleto",
  CARD_DEBIT: "Cartão Débito",
  CARD_CREDIT: "Cartão Crédito",
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

    const [transactions, receivables, transfers] = await Promise.all([
      prisma.financeTransaction.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          region: { select: { id: true, name: true } },
          order: { select: { id: true, number: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.accountsReceivable.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          client: { select: { id: true, name: true } },
          region: { select: { id: true, name: true } },
          order: { select: { id: true, number: true } },
          installments: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.cashTransfer.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          region: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Income / Expense summary ───────────────────────────────────────────────
    const incomes = transactions.filter((t) => t.type === FinanceEntryType.INCOME);
    const expenses = transactions.filter((t) => t.type === FinanceEntryType.EXPENSE);

    const totalIncomeCents = incomes.reduce((s, t) => s + t.amountCents, 0);
    const totalExpenseCents = expenses.reduce((s, t) => s + t.amountCents, 0);
    const netCents = totalIncomeCents - totalExpenseCents;

    const paidIncomeCents = incomes
      .filter((t) => t.status === FinanceStatus.PAID)
      .reduce((s, t) => s + t.amountCents, 0);

    const paidExpenseCents = expenses
      .filter((t) => t.status === FinanceStatus.PAID)
      .reduce((s, t) => s + t.amountCents, 0);

    // ── By category ────────────────────────────────────────────────────────────
    const byCategoryMap = new Map<
      string,
      { label: string; type: string; totalCents: number; count: number }
    >();
    for (const t of transactions) {
      const key = `${t.category}__${t.type}`;
      const existing = byCategoryMap.get(key) ?? {
        label: CATEGORY_LABELS[t.category] ?? t.category,
        type: t.type,
        totalCents: 0,
        count: 0,
      };
      existing.totalCents += t.amountCents;
      existing.count += 1;
      byCategoryMap.set(key, existing);
    }
    const byCategory = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.totalCents - a.totalCents
    );

    // ── By region ──────────────────────────────────────────────────────────────
    const byRegionMap = new Map<
      string,
      { name: string; incomeCents: number; expenseCents: number }
    >();
    for (const t of transactions) {
      if (!t.regionId) continue;
      const key = t.regionId;
      const existing = byRegionMap.get(key) ?? {
        name: t.region?.name ?? "—",
        incomeCents: 0,
        expenseCents: 0,
      };
      if (t.type === FinanceEntryType.INCOME) existing.incomeCents += t.amountCents;
      else existing.expenseCents += t.amountCents;
      byRegionMap.set(key, existing);
    }
    const byRegion = Array.from(byRegionMap.entries()).map(([id, v]) => ({ id, ...v }));

    // ── By payment method ──────────────────────────────────────────────────────
    const byPaymentMap = new Map<string, { label: string; totalCents: number; count: number }>();
    for (const t of transactions) {
      if (!t.paymentMethod) continue;
      const key = t.paymentMethod;
      const existing = byPaymentMap.get(key) ?? {
        label: PAYMENT_METHOD_LABELS[key] ?? key,
        totalCents: 0,
        count: 0,
      };
      existing.totalCents += t.amountCents;
      existing.count += 1;
      byPaymentMap.set(key, existing);
    }
    const byPaymentMethod = Array.from(byPaymentMap.values());

    // ── By day (cash flow chart) ───────────────────────────────────────────────
    const byDayMap = new Map<string, { incomeCents: number; expenseCents: number }>();
    for (const t of transactions) {
      const key = t.createdAt.toISOString().split("T")[0];
      const existing = byDayMap.get(key) ?? { incomeCents: 0, expenseCents: 0 };
      if (t.type === FinanceEntryType.INCOME) existing.incomeCents += t.amountCents;
      else existing.expenseCents += t.amountCents;
      byDayMap.set(key, existing);
    }
    const byDay = Array.from(byDayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Receivables summary ────────────────────────────────────────────────────
    const totalReceivableCents = receivables.reduce((s, r) => s + r.amountCents, 0);
    const receivedCents = receivables
      .filter((r) => r.status === ReceivableStatus.PAID)
      .reduce((s, r) => s + r.receivedCents, 0);
    const pendingReceivableCents = receivables
      .filter((r) => r.status === ReceivableStatus.PENDING)
      .reduce((s, r) => s + r.amountCents, 0);
    const overdueReceivableCents = receivables
      .filter(
        (r) =>
          r.status === ReceivableStatus.PENDING &&
          r.dueDate &&
          new Date(r.dueDate) < new Date()
      )
      .reduce((s, r) => s + r.amountCents, 0);

    // ── Transfers summary ──────────────────────────────────────────────────────
    const totalTransferCents = transfers.reduce((s, t) => s + t.amountCents, 0);
    const confirmedTransferCents = transfers
      .filter((t) => t.status === "TRANSFERRED")
      .reduce((s, t) => s + t.amountCents, 0);
    const pendingTransferCents = transfers
      .filter((t) => t.status === "PENDING")
      .reduce((s, t) => s + t.amountCents, 0);

    // ── Transactions list ──────────────────────────────────────────────────────
    const transactionsList = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      categoryLabel: CATEGORY_LABELS[t.category] ?? t.category,
      description: t.description,
      amountCents: t.amountCents,
      amount: money(t.amountCents),
      status: t.status,
      regionName: t.region?.name ?? null,
      orderNumber: t.order?.number ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      paidAt: t.paidAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      notes: t.notes,
    }));

    return NextResponse.json({
      period: {
        from: from.toISOString(),
        to: toEnd.toISOString(),
      },
      summary: {
        totalIncomeCents,
        totalIncome: money(totalIncomeCents),
        totalExpenseCents,
        totalExpense: money(totalExpenseCents),
        netCents,
        net: money(netCents),
        paidIncomeCents,
        paidIncome: money(paidIncomeCents),
        paidExpenseCents,
        paidExpense: money(paidExpenseCents),
        transactionCount: transactions.length,
      },
      receivables: {
        totalCents: totalReceivableCents,
        receivedCents,
        pendingCents: pendingReceivableCents,
        overdueCents: overdueReceivableCents,
        count: receivables.length,
      },
      transfers: {
        totalCents: totalTransferCents,
        confirmedCents: confirmedTransferCents,
        pendingCents: pendingTransferCents,
        count: transfers.length,
      },
      byCategory,
      byRegion,
      byPaymentMethod,
      byDay,
      transactions: transactionsList,
    });
  } catch (error) {
    console.error("GET /api/reports/finance error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório financeiro." },
      { status: 500 }
    );
  }
}
