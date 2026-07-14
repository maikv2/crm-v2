import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceEntryType, FinanceStatus, ReceivableStatus, OrderType } from "@prisma/client";

function parseDateParam(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  // "YYYY-MM-DD" é fixado no limite do dia em UTC para evitar deslocamento de fuso.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = dateOnly
    ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Vendas",
  COMMISSION: "Comissão",
  INVESTMENT: "Investimento",
  DISTRIBUTION: "Distribuição",
  TRANSFER: "Repasse",
  STOCK_PURCHASE: "Compra de Estoque",
  LOGISTICS: "Logística",
  TAX: "Impostos e Taxas",
  ADMINISTRATIVE: "Administrativo",
  PAYROLL: "Folha de Pagamento",
  RENT: "Aluguel",
  EXHIBITOR: "Expositor",
  UNIFORM: "Uniforme",
  MARKETING: "Marketing",
  ACCOUNTING: "Contabilidade",
  INVESTOR_DISTRIBUTION: "Distribuição a Investidor",
  OTHER: "Outros",
};

const PAYMENT_LABELS: Record<string, string> = {
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
    const to = parseDateParam(searchParams.get("to"), true);

    if (!from || !to) {
      return NextResponse.json({ error: "Parâmetros 'from' e 'to' são obrigatórios." }, { status: 400 });
    }

    const toEnd = to;

    const [orders, transactions, receivables, commissions, distributions, company] = await Promise.all([
      prisma.order.findMany({
        where: { issuedAt: { gte: from, lte: toEnd }, type: OrderType.SALE, status: { not: "CANCELLED" } },
        include: {
          client: { select: { name: true, cnpj: true, cpf: true } },
          region: { select: { name: true } },
          seller: { select: { name: true } },
        },
        orderBy: { issuedAt: "asc" },
      }),
      prisma.financeTransaction.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: { region: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.accountsReceivable.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          client: { select: { name: true } },
          order: { select: { number: true } },
        },
      }),
      prisma.representativeCommission.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          representative: { select: { name: true } },
          region: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.investorDistribution.findMany({
        where: { createdAt: { gte: from, lte: toEnd } },
        include: {
          investor: { select: { name: true } },
          region: { select: { name: true } },
        },
      }),
      prisma.companyProfile.findFirst(),
    ]);

    // ── Sales summary ──────────────────────────────────────────────────────────
    const grossRevenueCents = orders.reduce((s, o) => s + o.totalCents, 0);
    const discountTotalCents = orders.reduce((s, o) => s + o.discountCents, 0);

    // ── Finance transactions ───────────────────────────────────────────────────
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

    const taxCents = expenses
      .filter((t) => t.category === "TAX")
      .reduce((s, t) => s + t.amountCents, 0);
    const payrollCents = expenses
      .filter((t) => t.category === "PAYROLL")
      .reduce((s, t) => s + t.amountCents, 0);

    // ── By category ────────────────────────────────────────────────────────────
    const byCategoryMap = new Map<
      string,
      { label: string; type: string; totalCents: number; paidCents: number; count: number }
    >();
    for (const t of transactions) {
      const key = `${t.category}__${t.type}`;
      const ex = byCategoryMap.get(key) ?? {
        label: CATEGORY_LABELS[t.category] ?? t.category,
        type: t.type,
        totalCents: 0,
        paidCents: 0,
        count: 0,
      };
      ex.totalCents += t.amountCents;
      if (t.status === FinanceStatus.PAID) ex.paidCents += t.amountCents;
      ex.count += 1;
      byCategoryMap.set(key, ex);
    }
    const byCategory = Array.from(byCategoryMap.values()).sort((a, b) => b.totalCents - a.totalCents);

    // ── By payment method (income) ─────────────────────────────────────────────
    const byPaymentMap = new Map<string, { label: string; totalCents: number; count: number }>();
    for (const t of incomes) {
      if (!t.paymentMethod) continue;
      const key = t.paymentMethod;
      const ex = byPaymentMap.get(key) ?? {
        label: PAYMENT_LABELS[key] ?? key,
        totalCents: 0,
        count: 0,
      };
      ex.totalCents += t.amountCents;
      ex.count += 1;
      byPaymentMap.set(key, ex);
    }
    const byPaymentMethod = Array.from(byPaymentMap.values()).sort((a, b) => b.totalCents - a.totalCents);

    // ── Receivables ────────────────────────────────────────────────────────────
    const totalReceivableCents = receivables.reduce((s, r) => s + r.amountCents, 0);
    const receivedCents = receivables
      .filter((r) => r.status === ReceivableStatus.PAID)
      .reduce((s, r) => s + r.receivedCents, 0);
    const pendingReceivableCents = receivables
      .filter((r) => r.status === ReceivableStatus.PENDING || r.status === ReceivableStatus.PARTIAL)
      .reduce((s, r) => s + (r.amountCents - r.receivedCents), 0);
    const overdueReceivableCents = receivables
      .filter(
        (r) =>
          r.status !== ReceivableStatus.PAID &&
          r.dueDate &&
          new Date(r.dueDate) < new Date()
      )
      .reduce((s, r) => s + (r.amountCents - r.receivedCents), 0);

    // ── Commissions ────────────────────────────────────────────────────────────
    const totalCommissionCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
    const paidCommissionCents = commissions
      .filter((c) => c.status === FinanceStatus.PAID)
      .reduce((s, c) => s + c.commissionCents, 0);
    const pendingCommissionCents = commissions
      .filter((c) => c.status === FinanceStatus.PENDING)
      .reduce((s, c) => s + c.commissionCents, 0);

    // ── Investor distributions ─────────────────────────────────────────────────
    const totalDistributionCents = distributions.reduce((s, d) => s + d.totalDistributionCents, 0);
    const paidDistributionCents = distributions
      .filter((d) => d.status === FinanceStatus.PAID)
      .reduce((s, d) => s + d.totalDistributionCents, 0);

    // ── Serialized lists ───────────────────────────────────────────────────────
    const transactionsList = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      category: t.category,
      categoryLabel: CATEGORY_LABELS[t.category] ?? t.category,
      description: t.description,
      amountCents: t.amountCents,
      status: t.status,
      paymentMethod: t.paymentMethod ? (PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod) : null,
      regionName: t.region?.name ?? null,
      dueDate: t.dueDate?.toISOString() ?? null,
      paidAt: t.paidAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      notes: t.notes,
    }));

    const ordersList = orders.map((o) => ({
      id: o.id,
      number: o.number,
      issuedAt: o.issuedAt.toISOString(),
      clientName: o.client.name,
      clientDocument: o.client.cnpj ?? o.client.cpf ?? null,
      regionName: o.region.name,
      sellerName: o.seller?.name ?? null,
      totalCents: o.totalCents,
      discountCents: o.discountCents,
      paymentMethod: PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod,
      paymentStatus: o.paymentStatus,
      nfeNumber: o.nfeNumber,
      nfeKey: o.nfeKey,
      nfeStatus: o.nfeStatus,
    }));

    const commissionsList = commissions.map((c) => ({
      id: c.id,
      representativeName: c.representative.name,
      regionName: c.region.name,
      month: c.month,
      year: c.year,
      grossRevenueCents: c.grossRevenueCents,
      commissionPercent: Number(c.commissionPercent),
      commissionCents: c.commissionCents,
      status: c.status,
      paidAt: c.paidAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      period: { from: from.toISOString(), to: toEnd.toISOString() },
      company: company
        ? {
            tradeName: company.tradeName,
            legalName: company.legalName,
            cnpj: company.cnpj,
            taxRegime: company.taxRegime,
          }
        : null,
      sales: {
        grossRevenueCents,
        discountTotalCents,
        netRevenueCents: grossRevenueCents - discountTotalCents,
        orderCount: orders.length,
        withNfeCount: orders.filter((o) => o.nfeNumber).length,
      },
      income: {
        totalCents: totalIncomeCents,
        paidCents: paidIncomeCents,
        count: incomes.length,
      },
      expense: {
        totalCents: totalExpenseCents,
        paidCents: paidExpenseCents,
        taxCents,
        payrollCents,
        count: expenses.length,
      },
      net: netCents,
      receivables: {
        totalCents: totalReceivableCents,
        receivedCents,
        pendingCents: pendingReceivableCents,
        overdueCents: overdueReceivableCents,
        count: receivables.length,
      },
      commissions: {
        totalCents: totalCommissionCents,
        paidCents: paidCommissionCents,
        pendingCents: pendingCommissionCents,
        count: commissions.length,
        list: commissionsList,
      },
      distributions: {
        totalCents: totalDistributionCents,
        paidCents: paidDistributionCents,
        count: distributions.length,
      },
      byCategory,
      byPaymentMethod,
      transactions: transactionsList,
      orders: ordersList,
    });
  } catch (error) {
    console.error("GET /api/reports/accounting error:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório contábil." }, { status: 500 });
  }
}
