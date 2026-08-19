import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDocument, sendText, ZApiConfigError, ZApiRequestError } from "@/lib/zapi";
import { generateAccountingPDF } from "@/lib/accounting-report-pdf";
import { FinanceEntryType, FinanceStatus, ReceivableStatus, OrderType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONTADOR_PHONE = "5549933006990";

const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Vendas", COMMISSION: "Comissão", INVESTMENT: "Investimento",
  DISTRIBUTION: "Distribuição", TRANSFER: "Repasse", STOCK_PURCHASE: "Compra de Estoque",
  LOGISTICS: "Logística", TAX: "Impostos e Taxas", ADMINISTRATIVE: "Administrativo",
  PAYROLL: "Folha de Pagamento", RENT: "Aluguel", EXHIBITOR: "Expositor",
  UNIFORM: "Uniforme", MARKETING: "Marketing", ACCOUNTING: "Contabilidade",
  INVESTOR_DISTRIBUTION: "Distribuição a Investidor", OTHER: "Outros",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro", PIX: "PIX", BOLETO: "Boleto",
  CARD_DEBIT: "Cartão Débito", CARD_CREDIT: "Cartão Crédito",
};

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function parseDateParam(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  // "YYYY-MM-DD" é fixado no limite do dia em UTC para evitar deslocamento de fuso.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const d = dateOnly
    ? new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function generateCSV(data: Awaited<ReturnType<typeof buildReportData>>, periodLabel: string): Buffer {
  const rows: string[][] = [];
  rows.push([`RELATÓRIO CONTÁBIL - ${periodLabel}`]);
  rows.push([`Empresa: ${data.company?.tradeName ?? "—"}`]);
  rows.push([`CNPJ: ${data.company?.cnpj ?? "—"}`]);
  rows.push([]);
  rows.push(["=== RESUMO ==="]);
  rows.push(["Item", "Valor"]);
  rows.push(["Faturamento Bruto (Vendas)", money(data.sales.grossRevenueCents)]);
  rows.push(["Descontos Concedidos", money(data.sales.discountTotalCents)]);
  rows.push(["Total de Receitas (Lançamentos)", money(data.income.totalCents)]);
  rows.push(["Total de Despesas (Lançamentos)", money(data.expense.totalCents)]);
  rows.push(["Impostos e Taxas", money(data.expense.taxCents)]);
  rows.push(["Comissões de Representantes", money(data.commissions.totalCents)]);
  rows.push(["Distribuições a Investidores", money(data.distributions.totalCents)]);
  rows.push(["Resultado Líquido", money(data.net)]);
  rows.push([]);
  rows.push(["=== RECEITAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "INCOME")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), String(c.count)]);
  }
  rows.push([]);
  rows.push(["=== DESPESAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "EXPENSE")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), String(c.count)]);
  }
  rows.push([]);
  rows.push(["=== NF-e EMITIDAS ==="]);
  rows.push(["NF-e", "Data", "Cliente", "CNPJ/CPF", "Região", "Total", "Status", "Chave de Acesso"]);
  for (const o of data.orders.filter((o) => o.nfeNumber)) {
    rows.push([`#${o.nfeNumber}`, fmtDate(o.issuedAt), o.clientName, o.clientDocument ?? "—", o.regionName, money(o.totalCents), o.nfeStatus ?? "—", o.nfeKey ?? "—"]);
  }
  rows.push([]);
  rows.push(["=== LANÇAMENTOS FINANCEIROS ==="]);
  rows.push(["Data", "Tipo", "Categoria", "Descrição", "Região", "Status", "Valor"]);
  for (const t of data.transactions) {
    rows.push([fmtDate(t.createdAt), t.type === "INCOME" ? "Receita" : "Despesa", t.categoryLabel, t.description, t.regionName ?? "Matriz", t.status === "PAID" ? "Pago" : "Pendente", (t.type === "INCOME" ? "+" : "-") + money(t.amountCents)]);
  }
  rows.push([]);
  rows.push(["=== COMISSÕES DE REPRESENTANTES ==="]);
  rows.push(["Representante", "Região", "Mês/Ano", "Faturamento", "% Comissão", "Comissão", "Status"]);
  for (const c of data.commissions.list) {
    rows.push([c.representativeName, c.regionName, `${MONTHS[c.month - 1]}/${c.year}`, money(c.grossRevenueCents), `${c.commissionPercent}%`, money(c.commissionCents), c.status === "PAID" ? "Pago" : "Pendente"]);
  }
  const bom = "﻿";
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n");
  return Buffer.from(bom + csv, "utf-8");
}

// ─── Build report data (same logic as /api/reports/accounting) ────────────────

async function buildReportData(from: Date, to: Date) {
  const toEnd = to;

  const [orders, transactions, receivables, commissions, distributions, company] = await Promise.all([
    prisma.order.findMany({
      where: { issuedAt: { gte: from, lte: toEnd }, type: OrderType.SALE, status: { not: "CANCELLED" } },
      include: { client: { select: { name: true, cnpj: true, cpf: true } }, region: { select: { name: true } }, seller: { select: { name: true } } },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.financeTransaction.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      include: { region: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.accountsReceivable.findMany({ where: { createdAt: { gte: from, lte: toEnd } } }),
    prisma.representativeCommission.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      include: { representative: { select: { name: true } }, region: { select: { name: true } } },
    }),
    prisma.investorDistribution.findMany({ where: { createdAt: { gte: from, lte: toEnd } } }),
    prisma.companyProfile.findFirst(),
  ]);

  const incomes = transactions.filter((t) => t.type === FinanceEntryType.INCOME);
  const expenses = transactions.filter((t) => t.type === FinanceEntryType.EXPENSE);
  const totalIncomeCents = incomes.reduce((s, t) => s + t.amountCents, 0);
  const totalExpenseCents = expenses.reduce((s, t) => s + t.amountCents, 0);
  const paidIncomeCents = incomes.filter((t) => t.status === FinanceStatus.PAID).reduce((s, t) => s + t.amountCents, 0);
  const paidExpenseCents = expenses.filter((t) => t.status === FinanceStatus.PAID).reduce((s, t) => s + t.amountCents, 0);

  const byCategoryMap = new Map<string, { label: string; type: string; totalCents: number; paidCents: number; count: number }>();
  for (const t of transactions) {
    const key = `${t.category}__${t.type}`;
    const ex = byCategoryMap.get(key) ?? { label: CATEGORY_LABELS[t.category] ?? t.category, type: t.type, totalCents: 0, paidCents: 0, count: 0 };
    ex.totalCents += t.amountCents;
    if (t.status === FinanceStatus.PAID) ex.paidCents += t.amountCents;
    ex.count += 1;
    byCategoryMap.set(key, ex);
  }

  const byPaymentMap = new Map<string, { label: string; totalCents: number; count: number }>();
  for (const t of incomes) {
    if (!t.paymentMethod) continue;
    const ex = byPaymentMap.get(t.paymentMethod) ?? { label: PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod, totalCents: 0, count: 0 };
    ex.totalCents += t.amountCents; ex.count += 1;
    byPaymentMap.set(t.paymentMethod, ex);
  }

  const totalReceivableCents = receivables.reduce((s, r) => s + r.amountCents, 0);
  const receivedCents = receivables.filter((r) => r.status === ReceivableStatus.PAID).reduce((s, r) => s + r.receivedCents, 0);
  const pendingReceivableCents = receivables.filter((r) => r.status === ReceivableStatus.PENDING || r.status === ReceivableStatus.PARTIAL).reduce((s, r) => s + (r.amountCents - r.receivedCents), 0);
  const overdueReceivableCents = receivables.filter((r) => r.status !== ReceivableStatus.PAID && r.dueDate && new Date(r.dueDate) < new Date()).reduce((s, r) => s + (r.amountCents - r.receivedCents), 0);

  const totalCommissionCents = commissions.reduce((s, c) => s + c.commissionCents, 0);
  const paidCommissionCents = commissions.filter((c) => c.status === FinanceStatus.PAID).reduce((s, c) => s + c.commissionCents, 0);
  const pendingCommissionCents = commissions.filter((c) => c.status === FinanceStatus.PENDING).reduce((s, c) => s + c.commissionCents, 0);
  const totalDistributionCents = distributions.reduce((s, d) => s + d.totalDistributionCents, 0);
  const paidDistributionCents = distributions.filter((d) => d.status === FinanceStatus.PAID).reduce((s, d) => s + d.totalDistributionCents, 0);

  return {
    period: { from: from.toISOString(), to: toEnd.toISOString() },
    company: company ? { tradeName: company.tradeName, legalName: company.legalName, cnpj: company.cnpj, taxRegime: company.taxRegime } : null,
    sales: {
      grossRevenueCents: orders.reduce((s, o) => s + o.totalCents, 0),
      discountTotalCents: orders.reduce((s, o) => s + o.discountCents, 0),
      netRevenueCents: orders.reduce((s, o) => s + o.totalCents - o.discountCents, 0),
      orderCount: orders.length,
      withNfeCount: orders.filter((o) => o.nfeNumber).length,
    },
    income: { totalCents: totalIncomeCents, paidCents: paidIncomeCents, count: incomes.length },
    expense: { totalCents: totalExpenseCents, paidCents: paidExpenseCents, taxCents: expenses.filter((t) => t.category === "TAX").reduce((s, t) => s + t.amountCents, 0), payrollCents: expenses.filter((t) => t.category === "PAYROLL").reduce((s, t) => s + t.amountCents, 0), count: expenses.length },
    net: totalIncomeCents - totalExpenseCents,
    receivables: { totalCents: totalReceivableCents, receivedCents, pendingCents: pendingReceivableCents, overdueCents: overdueReceivableCents, count: receivables.length },
    commissions: {
      totalCents: totalCommissionCents, paidCents: paidCommissionCents, pendingCents: pendingCommissionCents, count: commissions.length,
      list: commissions.map((c) => ({ id: c.id, representativeName: c.representative.name, regionName: c.region.name, month: c.month, year: c.year, grossRevenueCents: c.grossRevenueCents, commissionPercent: Number(c.commissionPercent), commissionCents: c.commissionCents, status: c.status, paidAt: c.paidAt?.toISOString() ?? null })),
    },
    distributions: { totalCents: totalDistributionCents, paidCents: paidDistributionCents, count: distributions.length },
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.totalCents - a.totalCents),
    byPaymentMethod: Array.from(byPaymentMap.values()).sort((a, b) => b.totalCents - a.totalCents),
    transactions: transactions.map((t) => ({ id: t.id, type: t.type, categoryLabel: CATEGORY_LABELS[t.category] ?? t.category, description: t.description, amountCents: t.amountCents, status: t.status, paymentMethod: t.paymentMethod ? (PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod) : null, regionName: t.region?.name ?? null, dueDate: t.dueDate?.toISOString() ?? null, createdAt: t.createdAt.toISOString() })),
    orders: orders.map((o) => ({ id: o.id, number: o.number, issuedAt: o.issuedAt.toISOString(), clientName: o.client.name, clientDocument: o.client.cnpj ?? o.client.cpf ?? null, regionName: o.region.name, totalCents: o.totalCents, discountCents: o.discountCents, paymentMethod: PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod, paymentStatus: o.paymentStatus, nfeNumber: o.nfeNumber, nfeKey: o.nfeKey, nfeStatus: o.nfeStatus })),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);

    const fromStr = (body.from ?? url.searchParams.get("from")) as string | null;
    const toStr = (body.to ?? url.searchParams.get("to")) as string | null;
    const phone: string = body.phone ?? CONTADOR_PHONE;

    const from = parseDateParam(fromStr);
    const to = parseDateParam(toStr, true);

    if (!from || !to) {
      return NextResponse.json({ error: "Parâmetros 'from' e 'to' são obrigatórios." }, { status: 400 });
    }

    const periodLabel = `${from.toLocaleDateString("pt-BR")} a ${to.toLocaleDateString("pt-BR")}`;
    const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const fromStr2 = from.toISOString().split("T")[0];
    const toStr2 = to.toISOString().split("T")[0];

    // 1. Busca dados
    const data = await buildReportData(from, to);

    // 2. Gera PDF
    const pdfBuffer = await generateAccountingPDF(data, generatedAt);

    // 3. Gera CSV
    const csvBuffer = generateCSV(data, periodLabel);

    // 4. Busca ZIP dos XMLs (se houver NF-e)
    let zipBuffer: Buffer | null = null;
    const nfeCount = data.orders.filter((o) => o.nfeNumber).length;
    if (nfeCount > 0) {
      const company = await prisma.companyProfile.findFirst();
      if (company?.nfeToken) {
        const origin = url.origin;
        const cookie = request.headers.get("cookie") ?? "";
        const zipRes = await fetch(
          `${origin}/api/reports/accounting/nfe-zip?from=${fromStr2}&to=${toStr2}`,
          { headers: cookie ? { cookie } : {}, cache: "no-store" }
        );
        if (zipRes.ok) zipBuffer = Buffer.from(await zipRes.arrayBuffer());
      }
    }

    // 5. Mensagem de abertura
    const companyName = data.company?.tradeName ?? "Empresa";
    const netPositive = data.net >= 0;
    const summary =
      `📊 *Relatório Contábil - ${companyName}*\n` +
      `📅 Período: ${periodLabel}\n\n` +
      `💰 *Resumo do Período:*\n` +
      `• Faturamento Bruto: ${money(data.sales.grossRevenueCents)} (${data.sales.orderCount} pedidos)\n` +
      `• Total de Receitas: ${money(data.income.totalCents)}\n` +
      `• Total de Despesas: ${money(data.expense.totalCents)}\n` +
      `• Resultado Líquido: ${netPositive ? "✅" : "⚠️"} ${money(data.net)}\n` +
      `• Contas a Receber: ${money(data.receivables.totalCents)}\n` +
      `• Comissões: ${money(data.commissions.totalCents)}\n` +
      (nfeCount > 0 ? `• NF-e emitidas: ${nfeCount} notas\n` : "") +
      `\n📎 Segue em anexo:\n` +
      `1️⃣ PDF — Relatório contábil completo\n` +
      `2️⃣ CSV — Dados para importação\n` +
      (zipBuffer ? `3️⃣ ZIP — XMLs das NF-e emitidas\n` : "") +
      `\nGerado em ${generatedAt} — Sistema V2 CRM`;

    await sendText({ phone, message: summary });

    // 6. Envia PDF
    await sendDocument({
      phone,
      document: pdfBuffer,
      extension: "pdf",
      fileName: `relatorio-contabil-${fromStr2}_${toStr2}.pdf`,
      caption: `📄 Relatório Contábil PDF — ${periodLabel}`,
    });

    // 7. Envia CSV
    await sendDocument({
      phone,
      document: csvBuffer,
      extension: "csv",
      fileName: `relatorio-contabil-${fromStr2}_${toStr2}.csv`,
      caption: `📊 Dados em CSV — ${periodLabel}`,
    });

    // 8. Envia ZIP (se disponível)
    if (zipBuffer) {
      await sendDocument({
        phone,
        document: zipBuffer,
        extension: "zip",
        fileName: `nfe-xml-${fromStr2}_${toStr2}.zip`,
        caption: `🗜️ XMLs das NF-e — ${nfeCount} notas fiscais`,
      });
    }

    return NextResponse.json({
      ok: true,
      phone,
      period: periodLabel,
      nfeCount,
      sentFiles: ["texto resumo", "PDF", "CSV", ...(zipBuffer ? ["ZIP XMLs"] : [])],
    });
  } catch (error: unknown) {
    if (error instanceof ZApiConfigError) return NextResponse.json({ error: error.message }, { status: 500 });
    if (error instanceof ZApiRequestError) return NextResponse.json({ error: error.message, detalhes: error.payload }, { status: 502 });
    console.error("POST /api/reports/accounting/send-whatsapp error:", error);
    const message = error instanceof Error ? error.message : "Erro ao enviar relatório.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
