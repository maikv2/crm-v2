import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, FinanceEntryType, FinanceStatus, ReceivableStatus, OrderType } from "@prisma/client";
import { zipSync } from "fflate";
import { generateAccountingPDF } from "../lib/accounting-report-pdf";

const prisma = new PrismaClient();

const CATEGORY_LABELS: Record<string, string> = {
  SALES: "Vendas",
  COMMISSION: "Comissao",
  INVESTMENT: "Investimento",
  DISTRIBUTION: "Distribuicao",
  TRANSFER: "Repasse",
  STOCK_PURCHASE: "Compra de Estoque",
  LOGISTICS: "Logistica",
  TAX: "Impostos e Taxas",
  ADMINISTRATIVE: "Administrativo",
  PAYROLL: "Folha de Pagamento",
  RENT: "Aluguel",
  EXHIBITOR: "Expositor",
  UNIFORM: "Uniforme",
  MARKETING: "Marketing",
  ACCOUNTING: "Contabilidade",
  INVESTOR_DISTRIBUTION: "Distribuicao a Investidor",
  OTHER: "Outros",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  BOLETO: "Boleto",
  CARD_DEBIT: "Cartao Debito",
  CARD_CREDIT: "Cartao Credito",
};

const MONTHS = [
  { slug: "2026-06_junho", label: "Junho/2026", from: "2026-06-01", to: "2026-06-30" },
  { slug: "2026-07_julho", label: "Julho/2026", from: "2026-07-01", to: "2026-07-31" },
  { slug: "2026-08_agosto", label: "Agosto/2026", from: "2026-08-01", to: "2026-08-31" },
];

function parseDateParam(value: string, endOfDay = false) {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | Date | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function basicAuth(token: string) {
  return `Basic ${Buffer.from(`${token.trim()}:`).toString("base64")}`;
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function generateCSV(data: Awaited<ReturnType<typeof buildReportData>>, periodLabel: string) {
  const rows: unknown[][] = [];
  rows.push([`RELATORIO CONTABIL - ${periodLabel}`]);
  rows.push([`Empresa: ${data.company?.tradeName ?? "-"}`]);
  rows.push([`CNPJ: ${data.company?.cnpj ?? "-"}`]);
  rows.push([]);
  rows.push(["=== RESUMO ==="]);
  rows.push(["Item", "Valor"]);
  rows.push(["Faturamento Bruto (Vendas)", money(data.sales.grossRevenueCents)]);
  rows.push(["Descontos Concedidos", money(data.sales.discountTotalCents)]);
  rows.push(["Total de Receitas (Lancamentos)", money(data.income.totalCents)]);
  rows.push(["Total de Despesas (Lancamentos)", money(data.expense.totalCents)]);
  rows.push(["Impostos e Taxas", money(data.expense.taxCents)]);
  rows.push(["Comissoes de Representantes", money(data.commissions.totalCents)]);
  rows.push(["Distribuicoes a Investidores", money(data.distributions.totalCents)]);
  rows.push(["Resultado Liquido", money(data.net)]);
  rows.push([]);
  rows.push(["=== RECEITAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "INCOME")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), c.count]);
  }
  rows.push([]);
  rows.push(["=== DESPESAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "EXPENSE")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), c.count]);
  }
  rows.push([]);
  rows.push(["=== NF-e EMITIDAS ==="]);
  rows.push(["NF-e", "Data", "Cliente", "CNPJ/CPF", "Regiao", "Total", "Status", "Chave de Acesso"]);
  for (const o of data.orders.filter((o) => o.nfeNumber)) {
    rows.push([`#${o.nfeNumber}`, fmtDate(o.issuedAt), o.clientName, o.clientDocument ?? "-", o.regionName, money(o.totalCents), o.nfeStatus ?? "-", o.nfeKey ?? "-"]);
  }
  rows.push([]);
  rows.push(["=== LANCAMENTOS FINANCEIROS ==="]);
  rows.push(["Data", "Tipo", "Categoria", "Descricao", "Regiao", "Status", "Valor"]);
  for (const t of data.transactions) {
    rows.push([fmtDate(t.createdAt), t.type === "INCOME" ? "Receita" : "Despesa", t.categoryLabel, t.description, t.regionName ?? "Matriz", t.status === "PAID" ? "Pago" : "Pendente", `${t.type === "INCOME" ? "+" : "-"}${money(t.amountCents)}`]);
  }
  rows.push([]);
  rows.push(["=== COMISSOES DE REPRESENTANTES ==="]);
  rows.push(["Representante", "Regiao", "Mes/Ano", "Faturamento", "% Comissao", "Comissao", "Status"]);
  for (const c of data.commissions.list) {
    rows.push([c.representativeName, c.regionName, `${c.month}/${c.year}`, money(c.grossRevenueCents), `${c.commissionPercent}%`, money(c.commissionCents), c.status === "PAID" ? "Pago" : "Pendente"]);
  }
  const bom = "\uFEFF";
  return Buffer.from(bom + rows.map((row) => row.map(csvEscape).join(";")).join("\n"), "utf-8");
}

async function buildReportData(from: Date, to: Date) {
  const [orders, transactions, receivables, commissions, distributions, company] = await Promise.all([
    prisma.order.findMany({
      where: { issuedAt: { gte: from, lte: to }, type: OrderType.SALE, status: { not: "CANCELLED" } },
      include: {
        client: { select: { name: true, cnpj: true, cpf: true } },
        region: { select: { name: true } },
        seller: { select: { name: true } },
      },
      orderBy: { issuedAt: "asc" },
    }),
    prisma.financeTransaction.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { region: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.accountsReceivable.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.representativeCommission.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { representative: { select: { name: true } }, region: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.investorDistribution.findMany({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.companyProfile.findFirst(),
  ]);

  const incomes = transactions.filter((t) => t.type === FinanceEntryType.INCOME);
  const expenses = transactions.filter((t) => t.type === FinanceEntryType.EXPENSE);
  const byCategoryMap = new Map<string, { label: string; type: string; totalCents: number; paidCents: number; count: number }>();

  for (const t of transactions) {
    const key = `${t.category}__${t.type}`;
    const existing = byCategoryMap.get(key) ?? {
      label: CATEGORY_LABELS[t.category] ?? t.category,
      type: t.type,
      totalCents: 0,
      paidCents: 0,
      count: 0,
    };
    existing.totalCents += t.amountCents;
    if (t.status === FinanceStatus.PAID) existing.paidCents += t.amountCents;
    existing.count += 1;
    byCategoryMap.set(key, existing);
  }

  const byPaymentMap = new Map<string, { label: string; totalCents: number; count: number }>();
  for (const t of incomes) {
    if (!t.paymentMethod) continue;
    const existing = byPaymentMap.get(t.paymentMethod) ?? {
      label: PAYMENT_LABELS[t.paymentMethod] ?? t.paymentMethod,
      totalCents: 0,
      count: 0,
    };
    existing.totalCents += t.amountCents;
    existing.count += 1;
    byPaymentMap.set(t.paymentMethod, existing);
  }

  const totalReceivableCents = receivables.reduce((sum, item) => sum + item.amountCents, 0);
  const receivedCents = receivables
    .filter((item) => item.status === ReceivableStatus.PAID)
    .reduce((sum, item) => sum + item.receivedCents, 0);
  const pendingReceivableCents = receivables
    .filter((item) => item.status === ReceivableStatus.PENDING || item.status === ReceivableStatus.PARTIAL)
    .reduce((sum, item) => sum + (item.amountCents - item.receivedCents), 0);
  const overdueReceivableCents = receivables
    .filter((item) => item.status !== ReceivableStatus.PAID && item.dueDate && new Date(item.dueDate) < new Date())
    .reduce((sum, item) => sum + (item.amountCents - item.receivedCents), 0);

  const totalCommissionCents = commissions.reduce((sum, item) => sum + item.commissionCents, 0);
  const paidCommissionCents = commissions
    .filter((item) => item.status === FinanceStatus.PAID)
    .reduce((sum, item) => sum + item.commissionCents, 0);
  const pendingCommissionCents = commissions
    .filter((item) => item.status === FinanceStatus.PENDING)
    .reduce((sum, item) => sum + item.commissionCents, 0);
  const totalDistributionCents = distributions.reduce((sum, item) => sum + item.totalDistributionCents, 0);
  const paidDistributionCents = distributions
    .filter((item) => item.status === FinanceStatus.PAID)
    .reduce((sum, item) => sum + item.totalDistributionCents, 0);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    company: company
      ? { tradeName: company.tradeName, legalName: company.legalName, cnpj: company.cnpj, taxRegime: company.taxRegime }
      : null,
    sales: {
      grossRevenueCents: orders.reduce((sum, item) => sum + item.totalCents, 0),
      discountTotalCents: orders.reduce((sum, item) => sum + item.discountCents, 0),
      netRevenueCents: orders.reduce((sum, item) => sum + item.totalCents - item.discountCents, 0),
      orderCount: orders.length,
      withNfeCount: orders.filter((item) => item.nfeNumber).length,
    },
    income: {
      totalCents: incomes.reduce((sum, item) => sum + item.amountCents, 0),
      paidCents: incomes.filter((item) => item.status === FinanceStatus.PAID).reduce((sum, item) => sum + item.amountCents, 0),
      count: incomes.length,
    },
    expense: {
      totalCents: expenses.reduce((sum, item) => sum + item.amountCents, 0),
      paidCents: expenses.filter((item) => item.status === FinanceStatus.PAID).reduce((sum, item) => sum + item.amountCents, 0),
      taxCents: expenses.filter((item) => item.category === "TAX").reduce((sum, item) => sum + item.amountCents, 0),
      payrollCents: expenses.filter((item) => item.category === "PAYROLL").reduce((sum, item) => sum + item.amountCents, 0),
      count: expenses.length,
    },
    net: incomes.reduce((sum, item) => sum + item.amountCents, 0) - expenses.reduce((sum, item) => sum + item.amountCents, 0),
    receivables: { totalCents: totalReceivableCents, receivedCents, pendingCents: pendingReceivableCents, overdueCents: overdueReceivableCents, count: receivables.length },
    commissions: {
      totalCents: totalCommissionCents,
      paidCents: paidCommissionCents,
      pendingCents: pendingCommissionCents,
      count: commissions.length,
      list: commissions.map((item) => ({
        id: item.id,
        representativeName: item.representative.name,
        regionName: item.region.name,
        month: item.month,
        year: item.year,
        grossRevenueCents: item.grossRevenueCents,
        commissionPercent: Number(item.commissionPercent),
        commissionCents: item.commissionCents,
        status: item.status,
        paidAt: item.paidAt?.toISOString() ?? null,
      })),
    },
    distributions: { totalCents: totalDistributionCents, paidCents: paidDistributionCents, count: distributions.length },
    byCategory: Array.from(byCategoryMap.values()).sort((a, b) => b.totalCents - a.totalCents),
    byPaymentMethod: Array.from(byPaymentMap.values()).sort((a, b) => b.totalCents - a.totalCents),
    transactions: transactions.map((item) => ({
      id: item.id,
      type: item.type,
      categoryLabel: CATEGORY_LABELS[item.category] ?? item.category,
      description: item.description,
      amountCents: item.amountCents,
      status: item.status,
      paymentMethod: item.paymentMethod ? (PAYMENT_LABELS[item.paymentMethod] ?? item.paymentMethod) : null,
      regionName: item.region?.name ?? null,
      dueDate: item.dueDate?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    orders: orders.map((item) => ({
      id: item.id,
      number: item.number,
      issuedAt: item.issuedAt.toISOString(),
      clientName: item.client.name,
      clientDocument: item.client.cnpj ?? item.client.cpf ?? null,
      regionName: item.region.name,
      totalCents: item.totalCents,
      discountCents: item.discountCents,
      paymentMethod: PAYMENT_LABELS[item.paymentMethod] ?? item.paymentMethod,
      paymentStatus: item.paymentStatus,
      nfeNumber: item.nfeNumber,
      nfeKey: item.nfeKey,
      nfeStatus: item.nfeStatus,
      nfeXmlUrl: item.nfeXmlUrl,
    })),
  };
}

async function fetchXmls(data: Awaited<ReturnType<typeof buildReportData>>) {
  const company = await prisma.companyProfile.findFirst({ orderBy: { createdAt: "asc" } });
  const result: Array<{ filename: string; buffer: Buffer }> = [];
  const errors: string[] = [];

  if (!company?.nfeToken) {
    return { files: result, errors: ["Token Focus NFe nao configurado no perfil da empresa."] };
  }

  const focusBaseUrl =
    company.nfeEnvironment === "production"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

  const nfeOrdersWithoutXmlUrl = data.orders.filter((order) => order.nfeNumber && !order.nfeXmlUrl);
  for (const order of nfeOrdersWithoutXmlUrl) {
    errors.push(
      `NF-${order.nfeNumber ?? order.number}: autorizada/registrada no relatorio, mas sem link de XML salvo no banco.`
    );
  }

  const orders = data.orders.filter((order) => order.nfeXmlUrl);
  for (const order of orders) {
    try {
      const response = await fetch(`${focusBaseUrl}${order.nfeXmlUrl}`, {
        headers: { Authorization: basicAuth(company.nfeToken) },
      });
      if (!response.ok) {
        errors.push(`NF-${order.nfeNumber ?? order.number}: status ${response.status}`);
        continue;
      }
      const filename = order.nfeKey ? `${order.nfeKey}.xml` : `NF-${order.nfeNumber ?? order.number}.xml`;
      result.push({ filename, buffer: Buffer.from(await response.arrayBuffer()) });
    } catch (error) {
      errors.push(`NF-${order.nfeNumber ?? order.number}: ${error instanceof Error ? error.message : "falha na requisicao"}`);
    }
  }

  return { files: result, errors };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const root = path.resolve("outputs", `contabilidade_jun-jul-ago_2026_${stamp}`);
  await mkdir(root, { recursive: true });

  const manifest: unknown[] = [];
  const generatedAt = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (const month of MONTHS) {
    const from = parseDateParam(month.from);
    const to = parseDateParam(month.to, true);
    const dir = path.join(root, month.slug);
    const xmlDir = path.join(dir, "xml-nfe");
    await mkdir(xmlDir, { recursive: true });

    const data = await buildReportData(from, to);
    const pdfBuffer = await generateAccountingPDF(data, generatedAt);
    const csvBuffer = generateCSV(data, month.label);
    const { files: xmlFiles, errors } = await fetchXmls(data);

    await writeFile(path.join(dir, `relatorio-contabil-${month.slug}.pdf`), pdfBuffer);
    await writeFile(path.join(dir, `relatorio-contabil-${month.slug}.csv`), csvBuffer);
    await writeFile(path.join(dir, `dados-contabeis-${month.slug}.json`), JSON.stringify(data, null, 2));

    const xmlZipEntries: Record<string, Uint8Array> = {};
    for (const xml of xmlFiles) {
      await writeFile(path.join(xmlDir, xml.filename), xml.buffer);
      xmlZipEntries[xml.filename] = new Uint8Array(xml.buffer);
    }
    if (Object.keys(xmlZipEntries).length > 0) {
      await writeFile(path.join(dir, `xml-nfe-${month.slug}.zip`), Buffer.from(zipSync(xmlZipEntries, { level: 6 })));
    }
    if (errors.length > 0) {
      await writeFile(path.join(dir, "erros-xml.txt"), errors.join("\n"));
    }

    manifest.push({
      mes: month.label,
      periodo: `${month.from} a ${month.to}`,
      pedidos: data.sales.orderCount,
      nfeNoRelatorio: data.sales.withNfeCount,
      xmlsBaixados: xmlFiles.length,
      errosXml: errors,
      faturamentoBruto: money(data.sales.grossRevenueCents),
      receitas: money(data.income.totalCents),
      despesas: money(data.expense.totalCents),
      resultado: money(data.net),
    });
  }

  await writeFile(path.join(root, "manifesto.json"), JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(root, "LEIA-ME.txt"),
    [
      "Pacote para contabilidade - Junho, Julho e Agosto de 2026",
      "",
      "Cada pasta mensal contem:",
      "- relatorio-contabil em PDF",
      "- relatorio-contabil em CSV",
      "- dados-contabeis em JSON",
      "- pasta xml-nfe com XMLs das NF-e baixados",
      "- zip mensal dos XMLs, quando houver XML",
      "- erros-xml.txt, quando algum XML nao pode ser baixado",
      "",
      "O arquivo manifesto.json resume quantidades e totais por mes.",
    ].join("\n")
  );

  const finalZip = `${root}.zip`;
  const archiveEntries: Record<string, Uint8Array> = {};
  async function collect(currentDir: string, prefix = "") {
    const { readdir, readFile, stat } = await import("node:fs/promises");
    for (const entry of await readdir(currentDir)) {
      const full = path.join(currentDir, entry);
      const relative = prefix ? `${prefix}/${entry}` : entry;
      if ((await stat(full)).isDirectory()) {
        await collect(full, relative);
      } else {
        archiveEntries[relative] = new Uint8Array(await readFile(full));
      }
    }
  }
  await collect(root);
  await writeFile(finalZip, Buffer.from(zipSync(archiveEntries, { level: 6 })));

  console.log(JSON.stringify({ outputFolder: root, zip: finalZip, manifest }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
