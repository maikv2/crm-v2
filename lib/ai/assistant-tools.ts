import type Anthropic from "@anthropic-ai/sdk";
import { OrderType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Ferramentas do assistente de IA. TODAS sao somente leitura - nenhuma
// grava, altera ou apaga nada no banco. O escopo de dados de cada usuario
// e aplicado aqui no servidor (representante so enxerga a propria regiao /
// os proprios pedidos), nunca confiando no que a IA ou a tela mandam.

export type AssistantRole = "ADMIN" | "ADMINISTRATIVE" | "REPRESENTATIVE";

export type AssistantScope = {
  userId: string;
  role: AssistantRole;
  regionId: string | null;
  stockLocationId: string | null;
  mobile: boolean;
};

export type AssistantTable = {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
  footer?: Record<string, string>;
};

export type ToolOutcome = {
  // Texto (JSON) devolvido pra IA ler.
  content: string;
  isError?: boolean;
  // Tabela mostrada na tela do assistente (relatorios).
  table?: AssistantTable;
  // Tela que o assistente deve abrir.
  navigate?: string;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  BOLETO: "Boleto",
  CARD_DEBIT: "Cartão de débito",
  CARD_CREDIT: "Cartão de crédito",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  PARTIAL: "Parcial",
  CANCELLED: "Cancelado",
  OVERDUE: "Vencido",
};

const FINANCE_CATEGORY_LABEL: Record<string, string> = {
  SALES: "Vendas",
  INVESTMENT: "Investimento",
  STOCK_PURCHASE: "Compra de estoque",
  LOGISTICS: "Logística",
  COMMISSION: "Comissão",
  TAX: "Impostos",
  ADMINISTRATIVE: "Administrativo",
  PAYROLL: "Folha",
  RENT: "Aluguel",
  EXHIBITOR: "Expositores",
  UNIFORM: "Uniformes",
  MARKETING: "Marketing",
  ACCOUNTING: "Contabilidade",
  INVESTOR_DISTRIBUTION: "Distribuição a investidores",
  OTHER: "Outros",
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBR(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function parseDay(value: unknown, endOfDay = false): Date | null {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const d = new Date(`${text}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampLimit(value: unknown, fallback: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function isFinanceRole(scope: AssistantScope) {
  return scope.role === "ADMIN" || scope.role === "ADMINISTRATIVE";
}

// --- Escopo de dados -------------------------------------------------------

function orderScopeWhere(scope: AssistantScope): Prisma.OrderWhereInput {
  if (scope.role !== "REPRESENTATIVE") return {};
  return {
    OR: [
      { sellerId: scope.userId },
      ...(scope.regionId ? [{ regionId: scope.regionId }] : []),
    ],
  };
}

function clientScopeWhere(scope: AssistantScope): Prisma.ClientWhereInput {
  if (scope.role !== "REPRESENTATIVE") return {};
  if (scope.regionId) return { regionId: scope.regionId };
  return { orders: { some: { sellerId: scope.userId } } };
}

function receivableScopeWhere(scope: AssistantScope): Prisma.AccountsReceivableWhereInput {
  if (scope.role !== "REPRESENTATIVE") return {};
  return {
    OR: [
      { sellerId: scope.userId },
      ...(scope.regionId ? [{ regionId: scope.regionId }] : []),
    ],
  };
}

// --- Definicoes das ferramentas (o que a IA enxerga) ----------------------

const PERIOD_PROPS = {
  de: { type: "string", description: "Data inicial no formato AAAA-MM-DD." },
  ate: { type: "string", description: "Data final no formato AAAA-MM-DD (inclusive)." },
} as const;

const NAV_DESTINATIONS = [
  "dashboard",
  "clientes",
  "cliente",
  "novo_cliente",
  "pedidos",
  "pedido",
  "novo_pedido",
  "pedidos_do_site",
  "produtos",
  "estoque",
  "expositores",
  "prospectos",
  "mapa",
  "alertas",
  "painel_de_vendas",
  "financeiro",
  "contas_a_receber",
  "contas_a_pagar",
  "comissoes",
  "relatorios",
  "relatorio_de_vendas",
  "relatorio_financeiro",
  "relatorio_de_estoque",
  "agenda",
] as const;

type NavDestination = (typeof NAV_DESTINATIONS)[number];

export function getAssistantTools(scope: AssistantScope): Anthropic.Beta.BetaTool[] {
  const tools: Anthropic.Beta.BetaTool[] = [
    {
      name: "buscar_clientes",
      description:
        "Procura clientes por nome, nome fantasia, razão social, cidade, CNPJ/CPF ou telefone. Retorna dados de contato, região e o último pedido de cada um.",
      input_schema: {
        type: "object",
        properties: {
          busca: { type: "string", description: "Texto ou número a procurar." },
          limite: { type: "integer", description: "Máximo de clientes (padrão 10, máx 25)." },
        },
        required: ["busca"],
      },
    },
    {
      name: "buscar_pedidos",
      description:
        "Lista pedidos de venda filtrando por número, nome do cliente, período e situação do pagamento.",
      input_schema: {
        type: "object",
        properties: {
          numero: { type: "integer", description: "Número do pedido (ex.: 283)." },
          cliente: { type: "string", description: "Parte do nome do cliente." },
          ...PERIOD_PROPS,
          situacao_pagamento: {
            type: "string",
            enum: ["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"],
          },
          limite: { type: "integer", description: "Máximo de pedidos (padrão 20, máx 50)." },
        },
      },
    },
    {
      name: "relatorio_vendas",
      description:
        "Relatório de vendas de um período: total vendido, quantidade de pedidos, ticket médio e desconto, agrupado como pedido. Use para qualquer pergunta de faturamento, ranking de clientes/produtos/vendedores/regiões ou evolução por dia/mês. Para comparar períodos, chame duas vezes.",
      input_schema: {
        type: "object",
        properties: {
          ...PERIOD_PROPS,
          agrupar_por: {
            type: "string",
            enum: ["resumo", "dia", "mes", "regiao", "vendedor", "cliente", "produto", "forma_pagamento"],
            description: "Como agrupar as linhas. 'resumo' traz só os totais.",
          },
          regiao: { type: "string", description: "Filtrar por nome da região (opcional)." },
          vendedor: { type: "string", description: "Filtrar por nome do vendedor (opcional)." },
          limite: { type: "integer", description: "Máximo de linhas (padrão 15, máx 100)." },
        },
        required: ["de", "ate", "agrupar_por"],
      },
    },
    {
      name: "contas_a_receber",
      description:
        "Parcelas a receber dos clientes: vencidas, a vencer nos próximos dias ou todas em aberto, com valor pendente.",
      input_schema: {
        type: "object",
        properties: {
          situacao: { type: "string", enum: ["vencidas", "a_vencer", "todas"] },
          dias: { type: "integer", description: "Para 'a_vencer': janela de dias a partir de hoje (padrão 30)." },
          limite: { type: "integer", description: "Máximo de parcelas (padrão 25, máx 100)." },
        },
        required: ["situacao"],
      },
    },
    {
      name: "clientes_sem_comprar",
      description:
        "Clientes ativos cuja última compra foi há mais de N dias (clientes parados), com data e valor da última compra. Bom para dicas de reativação.",
      input_schema: {
        type: "object",
        properties: {
          dias: { type: "integer", description: "Dias sem comprar (padrão 60)." },
          limite: { type: "integer", description: "Máximo de clientes (padrão 20, máx 100)." },
        },
      },
    },
    {
      name: "consultar_estoque",
      description: "Saldo de estoque de produtos (por nome ou SKU) em cada local de estoque.",
      input_schema: {
        type: "object",
        properties: {
          busca: { type: "string", description: "Nome ou SKU do produto." },
        },
        required: ["busca"],
      },
    },
    {
      name: "abrir_tela",
      description:
        "Abre uma tela do sistema para o usuário. Use quando ele pedir para abrir, ir para ou mostrar uma tela. Para 'cliente' e 'pedido' informe o id (obtido com buscar_clientes / buscar_pedidos).",
      input_schema: {
        type: "object",
        properties: {
          destino: { type: "string", enum: [...NAV_DESTINATIONS] },
          id: { type: "string", description: "Id do cliente ou do pedido, quando o destino pedir." },
        },
        required: ["destino"],
      },
    },
  ];

  if (isFinanceRole(scope)) {
    tools.splice(3, 0, {
      name: "resumo_financeiro",
      description:
        "Resumo financeiro de um período: receitas e despesas lançadas por categoria (pagas e pendentes) e o recebimento de parcelas de clientes no período.",
      input_schema: {
        type: "object",
        properties: { ...PERIOD_PROPS },
        required: ["de", "ate"],
      },
    });
  }

  return tools;
}

// --- Execucao ------------------------------------------------------------

export async function runAssistantTool(
  name: string,
  input: Record<string, unknown>,
  scope: AssistantScope
): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "buscar_clientes":
        return await searchClients(input, scope);
      case "buscar_pedidos":
        return await searchOrders(input, scope);
      case "relatorio_vendas":
        return await salesReport(input, scope);
      case "resumo_financeiro":
        if (!isFinanceRole(scope)) return error("Sem permissão para o financeiro geral.");
        return await financeSummary(input);
      case "contas_a_receber":
        return await receivables(input, scope);
      case "clientes_sem_comprar":
        return await inactiveClients(input, scope);
      case "consultar_estoque":
        return await stockLookup(input, scope);
      case "abrir_tela":
        return openScreen(input, scope);
      default:
        return error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (err) {
    console.error(`AI tool ${name} error:`, err);
    return error("Erro ao consultar os dados.");
  }
}

function error(message: string): ToolOutcome {
  return { content: JSON.stringify({ erro: message }), isError: true };
}

function ok(data: unknown, extra?: Omit<ToolOutcome, "content">): ToolOutcome {
  return { content: JSON.stringify(data), ...extra };
}

async function searchClients(input: Record<string, unknown>, scope: AssistantScope) {
  const busca = String(input.busca ?? "").trim();
  if (!busca) return error("Informe o que procurar.");
  const limit = clampLimit(input.limite, 10, 25);
  const digits = onlyDigits(busca);

  const textFields = ["name", "tradeName", "legalName", "city", "code", "email"] as const;
  const or: Prisma.ClientWhereInput[] = textFields.map((field) => ({
    [field]: { contains: busca, mode: "insensitive" },
  }));
  if (digits.length >= 4) {
    for (const field of ["cnpj", "cpf", "phone", "whatsapp"] as const) {
      or.push({ [field]: { contains: digits } });
    }
  }

  const clients = await prisma.client.findMany({
    where: { AND: [clientScopeWhere(scope), { OR: or }] },
    select: {
      id: true,
      name: true,
      tradeName: true,
      city: true,
      state: true,
      phone: true,
      whatsapp: true,
      cnpj: true,
      cpf: true,
      active: true,
      region: { select: { name: true } },
      orders: {
        where: { type: OrderType.SALE },
        orderBy: { issuedAt: "desc" },
        take: 1,
        select: { number: true, issuedAt: true, totalCents: true },
      },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  const rows = clients.map((c) => ({
    id: c.id,
    nome: c.name,
    fantasia: c.tradeName,
    cidade: [c.city, c.state].filter(Boolean).join("/") || null,
    telefone: c.whatsapp || c.phone,
    documento: c.cnpj || c.cpf,
    regiao: c.region?.name ?? null,
    ativo: c.active,
    ultimo_pedido: c.orders[0]
      ? { numero: c.orders[0].number, data: dateBR(c.orders[0].issuedAt), total: money(c.orders[0].totalCents) }
      : null,
  }));

  return ok({ encontrados: rows.length, clientes: rows });
}

async function searchOrders(input: Record<string, unknown>, scope: AssistantScope) {
  const limit = clampLimit(input.limite, 20, 50);
  const from = parseDay(input.de);
  const to = parseDay(input.ate, true);
  const numero = Number(input.numero);
  const cliente = String(input.cliente ?? "").trim();
  const situacao = String(input.situacao_pagamento ?? "").trim();

  const where: Prisma.OrderWhereInput = {
    AND: [
      orderScopeWhere(scope),
      { type: OrderType.SALE },
      Number.isFinite(numero) && numero > 0 ? { number: Math.floor(numero) } : {},
      cliente ? { client: { name: { contains: cliente, mode: "insensitive" } } } : {},
      from || to ? { issuedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
      situacao ? { paymentStatus: situacao as Prisma.EnumPaymentStatusFilter["equals"] } : {},
    ],
  };

  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      number: true,
      issuedAt: true,
      totalCents: true,
      discountCents: true,
      paymentMethod: true,
      paymentStatus: true,
      client: { select: { name: true } },
      region: { select: { name: true } },
      seller: { select: { name: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: limit,
  });

  const rows = orders.map((o) => ({
    id: o.id,
    numero: o.number,
    data: dateBR(o.issuedAt),
    cliente: o.client.name,
    regiao: o.region.name,
    vendedor: o.seller?.name ?? null,
    total: money(o.totalCents),
    desconto: money(o.discountCents),
    pagamento: PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod,
    situacao: PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
  }));

  return ok(
    { encontrados: rows.length, pedidos: rows },
    rows.length > 1
      ? {
          table: {
            title: "Pedidos",
            columns: [
              { key: "numero", label: "Nº" },
              { key: "data", label: "Data" },
              { key: "cliente", label: "Cliente" },
              { key: "total", label: "Total", align: "right" },
              { key: "situacao", label: "Situação" },
            ],
            rows: rows.map((r) => ({
              numero: String(r.numero),
              data: r.data,
              cliente: r.cliente,
              total: r.total,
              situacao: r.situacao,
            })),
          },
        }
      : undefined
  );
}

type SalesGroup = "resumo" | "dia" | "mes" | "regiao" | "vendedor" | "cliente" | "produto" | "forma_pagamento";

const GROUP_LABEL: Record<SalesGroup, string> = {
  resumo: "Resumo",
  dia: "Dia",
  mes: "Mês",
  regiao: "Região",
  vendedor: "Vendedor",
  cliente: "Cliente",
  produto: "Produto",
  forma_pagamento: "Forma de pagamento",
};

async function salesReport(input: Record<string, unknown>, scope: AssistantScope) {
  const from = parseDay(input.de);
  const to = parseDay(input.ate, true);
  if (!from || !to) return error("Informe 'de' e 'ate' no formato AAAA-MM-DD.");
  if (from > to) return error("A data inicial é depois da final.");

  const group = (String(input.agrupar_por ?? "resumo") as SalesGroup) in GROUP_LABEL
    ? (String(input.agrupar_por ?? "resumo") as SalesGroup)
    : "resumo";
  const limit = clampLimit(input.limite, 15, 100);
  const regiao = String(input.regiao ?? "").trim();
  const vendedor = String(input.vendedor ?? "").trim();

  const orders = await prisma.order.findMany({
    where: {
      AND: [
        orderScopeWhere(scope),
        { type: OrderType.SALE, status: { not: "CANCELLED" } },
        { issuedAt: { gte: from, lte: to } },
        regiao ? { region: { name: { contains: regiao, mode: "insensitive" } } } : {},
        vendedor ? { seller: { name: { contains: vendedor, mode: "insensitive" } } } : {},
      ],
    },
    select: {
      issuedAt: true,
      totalCents: true,
      discountCents: true,
      paymentMethod: true,
      paymentStatus: true,
      clientId: true,
      client: { select: { name: true } },
      region: { select: { name: true } },
      seller: { select: { name: true } },
      items:
        group === "produto"
          ? { select: { qty: true, unitCents: true, product: { select: { sku: true, name: true } } } }
          : false,
    },
  });

  const totalCents = orders.reduce((s, o) => s + o.totalCents, 0);
  const discountCents = orders.reduce((s, o) => s + o.discountCents, 0);
  const paidCents = orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.totalCents, 0);
  const summary = {
    periodo: `${dateBR(from)} a ${dateBR(to)}`,
    pedidos: orders.length,
    total_vendido: money(totalCents),
    ticket_medio: money(orders.length ? Math.round(totalCents / orders.length) : 0),
    descontos: money(discountCents),
    total_ja_pago: money(paidCents),
    clientes_diferentes: new Set(orders.map((o) => o.clientId)).size,
    filtros: { regiao: regiao || null, vendedor: vendedor || null },
  };

  if (group === "resumo") {
    return ok(
      { resumo: summary },
      {
        table: {
          title: `Vendas - ${summary.periodo}`,
          columns: [
            { key: "k", label: "Indicador" },
            { key: "v", label: "Valor", align: "right" },
          ],
          rows: [
            { k: "Pedidos", v: String(summary.pedidos) },
            { k: "Total vendido", v: summary.total_vendido },
            { k: "Ticket médio", v: summary.ticket_medio },
            { k: "Descontos", v: summary.descontos },
            { k: "Já pago", v: summary.total_ja_pago },
            { k: "Clientes diferentes", v: String(summary.clientes_diferentes) },
          ],
        },
      }
    );
  }

  const map = new Map<string, { label: string; pedidos: number; qtd: number; cents: number }>();
  function add(key: string, label: string, cents: number, qty = 0, countOrder = true) {
    const cur = map.get(key) ?? { label, pedidos: 0, qtd: 0, cents: 0 };
    if (countOrder) cur.pedidos += 1;
    cur.qtd += qty;
    cur.cents += cents;
    map.set(key, cur);
  }

  for (const o of orders) {
    switch (group) {
      case "dia": {
        const k = o.issuedAt.toISOString().slice(0, 10);
        add(k, dateBR(o.issuedAt), o.totalCents);
        break;
      }
      case "mes": {
        const k = o.issuedAt.toISOString().slice(0, 7);
        add(k, `${k.slice(5, 7)}/${k.slice(0, 4)}`, o.totalCents);
        break;
      }
      case "regiao":
        add(o.region.name, o.region.name, o.totalCents);
        break;
      case "vendedor":
        add(o.seller?.name ?? "Sem vendedor", o.seller?.name ?? "Sem vendedor", o.totalCents);
        break;
      case "cliente":
        add(o.clientId, o.client.name, o.totalCents);
        break;
      case "forma_pagamento": {
        const label = PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod;
        add(o.paymentMethod, label, o.totalCents);
        break;
      }
      case "produto": {
        const items = (o as unknown as { items?: { qty: number; unitCents: number; product: { sku: string; name: string } }[] }).items ?? [];
        const seen = new Set<string>();
        for (const item of items) {
          const k = item.product.sku || item.product.name;
          add(k, `${item.product.name} (${item.product.sku})`, item.qty * item.unitCents, item.qty, !seen.has(k));
          seen.add(k);
        }
        break;
      }
    }
  }

  const chronological = group === "dia" || group === "mes";
  const sorted = Array.from(map.entries())
    .sort((a, b) => (chronological ? a[0].localeCompare(b[0]) : b[1].cents - a[1].cents))
    .slice(0, chronological ? 400 : limit);

  const rows = sorted.map(([, v]) => ({
    item: v.label,
    pedidos: String(v.pedidos),
    ...(group === "produto" ? { qtd: String(v.qtd) } : {}),
    total: money(v.cents),
    participacao: totalCents > 0 ? `${((v.cents / totalCents) * 100).toFixed(1).replace(".", ",")}%` : "0%",
  }));

  return ok(
    { resumo: summary, agrupado_por: GROUP_LABEL[group], linhas: rows, total_de_grupos: map.size },
    {
      table: {
        title: `Vendas por ${GROUP_LABEL[group].toLowerCase()} - ${summary.periodo}`,
        columns: [
          { key: "item", label: GROUP_LABEL[group] },
          { key: "pedidos", label: "Pedidos", align: "right" },
          ...(group === "produto" ? [{ key: "qtd", label: "Qtd", align: "right" as const }] : []),
          { key: "total", label: "Total", align: "right" },
          { key: "participacao", label: "%", align: "right" },
        ],
        rows,
        footer: {
          item: "Total",
          pedidos: String(orders.length),
          total: money(totalCents),
          participacao: "100%",
        },
      },
    }
  );
}

async function financeSummary(input: Record<string, unknown>) {
  const from = parseDay(input.de);
  const to = parseDay(input.ate, true);
  if (!from || !to) return error("Informe 'de' e 'ate' no formato AAAA-MM-DD.");

  const [transactions, installments] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          { dueDate: { gte: from, lte: to } },
          { dueDate: null, createdAt: { gte: from, lte: to } },
        ],
      },
      select: { type: true, category: true, status: true, amountCents: true },
    }),
    prisma.accountsReceivableInstallment.findMany({
      where: { dueDate: { gte: from, lte: to }, status: { not: "CANCELED" } },
      select: { amountCents: true, receivedCents: true, status: true, dueDate: true },
    }),
  ]);

  const byKey = new Map<string, { tipo: string; categoria: string; pago: number; pendente: number }>();
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const tipo = t.type === "INCOME" ? "Receita" : "Despesa";
    const key = `${t.type}-${t.category}`;
    const cur = byKey.get(key) ?? { tipo, categoria: FINANCE_CATEGORY_LABEL[t.category] ?? t.category, pago: 0, pendente: 0 };
    if (t.status === "PAID") cur.pago += t.amountCents;
    else cur.pendente += t.amountCents;
    byKey.set(key, cur);
    if (t.type === "INCOME") income += t.amountCents;
    else expense += t.amountCents;
  }

  const now = Date.now();
  const recv = installments.reduce(
    (acc, i) => {
      const pending = Math.max(i.amountCents - i.receivedCents, 0);
      acc.previsto += i.amountCents;
      acc.recebido += i.receivedCents;
      acc.pendente += pending;
      if (pending > 0 && i.dueDate.getTime() < now) acc.vencido += pending;
      return acc;
    },
    { previsto: 0, recebido: 0, pendente: 0, vencido: 0 }
  );

  const rows = Array.from(byKey.values())
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || b.pago + b.pendente - (a.pago + a.pendente))
    .map((r) => ({ tipo: r.tipo, categoria: r.categoria, pago: money(r.pago), pendente: money(r.pendente) }));

  return ok(
    {
      periodo: `${dateBR(from)} a ${dateBR(to)}`,
      lancamentos: { receitas: money(income), despesas: money(expense), resultado: money(income - expense) },
      por_categoria: rows,
      parcelas_de_clientes_no_periodo: {
        previsto: money(recv.previsto),
        recebido: money(recv.recebido),
        em_aberto: money(recv.pendente),
        vencido_em_aberto: money(recv.vencido),
      },
    },
    {
      table: {
        title: `Financeiro - ${dateBR(from)} a ${dateBR(to)}`,
        columns: [
          { key: "tipo", label: "Tipo" },
          { key: "categoria", label: "Categoria" },
          { key: "pago", label: "Pago", align: "right" },
          { key: "pendente", label: "Pendente", align: "right" },
        ],
        rows,
        footer: { tipo: "Resultado", categoria: "", pago: money(income - expense), pendente: "" },
      },
    }
  );
}

async function receivables(input: Record<string, unknown>, scope: AssistantScope) {
  const situacao = String(input.situacao ?? "todas");
  const limit = clampLimit(input.limite, 25, 100);
  const dias = clampLimit(input.dias, 30, 365);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const dueFilter: Prisma.DateTimeFilter =
    situacao === "vencidas"
      ? { lt: today }
      : situacao === "a_vencer"
        ? { gte: today, lte: new Date(today.getTime() + dias * 86400000) }
        : {};

  const installments = await prisma.accountsReceivableInstallment.findMany({
    where: {
      status: { notIn: ["PAID", "CANCELED"] },
      dueDate: dueFilter,
      accountsReceivable: receivableScopeWhere(scope),
    },
    select: {
      installmentNumber: true,
      amountCents: true,
      receivedCents: true,
      dueDate: true,
      accountsReceivable: {
        select: {
          installmentCount: true,
          paymentMethod: true,
          client: { select: { name: true } },
          order: { select: { number: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
    take: limit,
  });

  let totalPending = 0;
  const rows = installments.map((i) => {
    const pending = Math.max(i.amountCents - i.receivedCents, 0);
    totalPending += pending;
    return {
      cliente: i.accountsReceivable.client.name,
      pedido: String(i.accountsReceivable.order.number),
      parcela: `${i.installmentNumber}/${i.accountsReceivable.installmentCount || 1}`,
      vencimento: dateBR(i.dueDate),
      pendente: money(pending),
      forma: PAYMENT_METHOD_LABEL[i.accountsReceivable.paymentMethod] ?? i.accountsReceivable.paymentMethod,
    };
  });

  const title =
    situacao === "vencidas" ? "Parcelas vencidas" : situacao === "a_vencer" ? `Parcelas a vencer (${dias} dias)` : "Parcelas em aberto";

  return ok(
    { situacao, parcelas: rows.length, total_pendente_listado: money(totalPending), lista: rows },
    {
      table: {
        title,
        columns: [
          { key: "cliente", label: "Cliente" },
          { key: "pedido", label: "Pedido" },
          { key: "parcela", label: "Parcela" },
          { key: "vencimento", label: "Vencimento" },
          { key: "pendente", label: "Pendente", align: "right" },
        ],
        rows,
        footer: { cliente: "Total", pedido: "", parcela: "", vencimento: "", pendente: money(totalPending) },
      },
    }
  );
}

async function inactiveClients(input: Record<string, unknown>, scope: AssistantScope) {
  const dias = clampLimit(input.dias, 60, 3650);
  const limit = clampLimit(input.limite, 20, 100);
  const cutoff = new Date(Date.now() - dias * 86400000);

  const lastOrders = await prisma.order.groupBy({
    by: ["clientId"],
    where: { AND: [orderScopeWhere(scope), { type: OrderType.SALE }] },
    _max: { issuedAt: true },
    _count: { _all: true },
    _sum: { totalCents: true },
  });

  const stale = lastOrders
    .filter((r) => r._max.issuedAt && r._max.issuedAt < cutoff)
    .sort((a, b) => (b._sum.totalCents ?? 0) - (a._sum.totalCents ?? 0));

  const clients = await prisma.client.findMany({
    where: {
      AND: [clientScopeWhere(scope), { active: true, id: { in: stale.map((s) => s.clientId) } }],
    },
    select: { id: true, name: true, city: true, whatsapp: true, phone: true, region: { select: { name: true } } },
  });
  const byId = new Map(clients.map((c) => [c.id, c]));

  const rows = stale
    .filter((s) => byId.has(s.clientId))
    .slice(0, limit)
    .map((s) => {
      const c = byId.get(s.clientId)!;
      const days = Math.floor((Date.now() - (s._max.issuedAt as Date).getTime()) / 86400000);
      return {
        id: c.id,
        cliente: c.name,
        cidade: c.city ?? "-",
        telefone: c.whatsapp || c.phone || "-",
        ultima_compra: dateBR(s._max.issuedAt),
        dias_sem_comprar: String(days),
        pedidos_no_historico: String(s._count._all),
        total_historico: money(s._sum.totalCents ?? 0),
      };
    });

  return ok(
    { dias_minimo: dias, total_parados: stale.filter((s) => byId.has(s.clientId)).length, clientes: rows },
    {
      table: {
        title: `Clientes sem comprar há mais de ${dias} dias`,
        columns: [
          { key: "cliente", label: "Cliente" },
          { key: "cidade", label: "Cidade" },
          { key: "ultima_compra", label: "Última compra" },
          { key: "dias_sem_comprar", label: "Dias", align: "right" },
          { key: "total_historico", label: "Total histórico", align: "right" },
        ],
        rows,
      },
    }
  );
}

async function stockLookup(input: Record<string, unknown>, scope: AssistantScope) {
  const busca = String(input.busca ?? "").trim();
  if (!busca) return error("Informe o produto.");

  let locationFilter: Prisma.StockBalanceWhereInput = {};
  if (scope.role === "REPRESENTATIVE") {
    if (!scope.stockLocationId) return ok({ aviso: "Seu usuário não tem local de estoque vinculado." });
    locationFilter = { stockLocationId: scope.stockLocationId };
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: busca, mode: "insensitive" } },
        { sku: { contains: busca, mode: "insensitive" } },
      ],
    },
    select: {
      sku: true,
      name: true,
      active: true,
      priceCents: true,
      StockBalance: {
        where: locationFilter,
        select: { quantity: true, stockLocation: { select: { name: true } } },
      },
    },
    take: 10,
  });

  const rows = products.flatMap((p) => {
    const balances = p.StockBalance.length ? p.StockBalance : [{ quantity: 0, stockLocation: { name: "-" } }];
    return balances.map((b) => ({
      produto: `${p.name} (${p.sku})`,
      local: b.stockLocation.name,
      quantidade: String(b.quantity),
      preco: money(p.priceCents),
    }));
  });

  return ok(
    { produtos: products.length, saldos: rows },
    {
      table: {
        title: "Estoque",
        columns: [
          { key: "produto", label: "Produto" },
          { key: "local", label: "Local" },
          { key: "quantidade", label: "Qtd", align: "right" },
        ],
        rows,
      },
    }
  );
}

// --- Navegacao ------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolvePath(dest: NavDestination, id: string | null, scope: AssistantScope): string | null {
  const m = scope.mobile;

  if (scope.role === "REPRESENTATIVE") {
    const map: Partial<Record<NavDestination, string>> = m
      ? {
          dashboard: "/m/rep",
          clientes: "/m/rep/clients",
          cliente: id ? `/m/rep/clients/${id}` : "",
          novo_cliente: "/m/rep/clients/new",
          pedidos: "/m/rep/orders",
          pedido: id ? `/m/rep/orders/${id}` : "",
          novo_pedido: "/m/rep/orders/new",
          expositores: "/m/rep/exhibitors",
          prospectos: "/m/rep/prospects",
          mapa: "/m/rep/map",
          alertas: "/m/rep/alerts",
          financeiro: "/m/rep/finance",
          contas_a_receber: "/m/rep/finance/receivables",
          comissoes: "/m/rep/finance/commissions",
          agenda: "/m/rep/agenda",
        }
      : {
          dashboard: "/rep/dashboard",
          clientes: "/rep/clients",
          cliente: id ? `/rep/clients/${id}` : "",
          novo_cliente: "/clients/new",
          pedidos: "/rep/orders",
          pedido: id ? `/rep/orders/${id}` : "",
          novo_pedido: "/rep/orders/new",
          estoque: "/rep/stock",
          expositores: "/rep/exhibitors",
          prospectos: "/rep/prospects",
          mapa: "/rep/map",
          painel_de_vendas: "/rep/sales-dashboard",
          financeiro: "/rep/finance",
          contas_a_receber: "/rep/finance/receivables",
          comissoes: "/rep/finance/commissions",
          agenda: "/rep/agenda",
        };
    return map[dest] || null;
  }

  if (scope.role === "ADMINISTRATIVE") {
    const map: Partial<Record<NavDestination, string>> = {
      financeiro: m ? "/m/finance" : "/finance",
      contas_a_pagar: m ? "/m/finance/payables" : "/finance/payables",
      contas_a_receber: "/finance/receivables",
      comissoes: "/finance/commissions",
      pedidos: "/orders",
      pedido: id ? `/orders/${id}` : "",
      painel_de_vendas: "/sales-dashboard",
      relatorio_de_vendas: "/reports/sales",
      relatorio_financeiro: m ? "/m/finance/reports" : "/reports/finance",
    };
    return map[dest] || null;
  }

  const map: Record<NavDestination, string> = m
    ? {
        dashboard: "/m/admin",
        clientes: "/m/admin/clients",
        cliente: id ? `/m/admin/clients/${id}` : "",
        novo_cliente: "/m/admin/clients/new",
        pedidos: "/m/admin/orders",
        pedido: id ? `/m/admin/orders/${id}` : "",
        novo_pedido: "/m/admin/orders/new",
        pedidos_do_site: "/orders/requests",
        produtos: "/products",
        estoque: "/stock",
        expositores: "/m/admin/exhibitors",
        prospectos: "/m/admin/prospects",
        mapa: "/m/admin/map",
        alertas: "/m/admin/alerts",
        painel_de_vendas: "/m/admin/sales",
        financeiro: "/m/admin/finance",
        contas_a_receber: "/m/admin/finance/receivables",
        contas_a_pagar: "/finance/payables",
        comissoes: "/m/admin/finance/commissions",
        relatorios: "/m/admin/reports",
        relatorio_de_vendas: "/reports/sales",
        relatorio_financeiro: "/reports/finance",
        relatorio_de_estoque: "/reports/stock",
        agenda: "",
      }
    : {
        dashboard: "/dashboard",
        clientes: "/clients",
        cliente: id ? `/clients/${id}` : "",
        novo_cliente: "/clients/new",
        pedidos: "/orders",
        pedido: id ? `/orders/${id}` : "",
        novo_pedido: "/orders/new",
        pedidos_do_site: "/orders/requests",
        produtos: "/products",
        estoque: "/stock",
        expositores: "/exhibitors",
        prospectos: "/prospects",
        mapa: "/map",
        alertas: "/alerts",
        painel_de_vendas: "/sales-dashboard",
        financeiro: "/finance",
        contas_a_receber: "/finance/receivables",
        contas_a_pagar: "/finance/payables",
        comissoes: "/finance/commissions",
        relatorios: "/reports",
        relatorio_de_vendas: "/reports/sales",
        relatorio_financeiro: "/reports/finance",
        relatorio_de_estoque: "/reports/stock",
        agenda: "",
      };
  return map[dest] || null;
}

function openScreen(input: Record<string, unknown>, scope: AssistantScope): ToolOutcome {
  const dest = String(input.destino ?? "") as NavDestination;
  if (!NAV_DESTINATIONS.includes(dest)) return error("Tela desconhecida.");
  const rawId = String(input.id ?? "").trim();
  const id = rawId && UUID_RE.test(rawId) ? rawId : null;
  if ((dest === "cliente" || dest === "pedido") && !id) {
    return error(`Para abrir ${dest} é preciso o id (busque antes com buscar_${dest === "cliente" ? "clientes" : "pedidos"}).`);
  }
  const path = resolvePath(dest, id, scope);
  if (!path) return error("Essa tela não está disponível para o seu perfil.");
  return ok({ abrindo: path }, { navigate: path });
}
