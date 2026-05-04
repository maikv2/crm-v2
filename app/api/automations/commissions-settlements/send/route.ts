import { NextResponse } from "next/server";
import { normalizeBrazilPhone, sendText } from "@/lib/zapi";

type SummaryPayload = {
  totalOrders?: number;
  totalRevenueCents?: number;
  totalCommissionCents?: number;
  payableCommissionCents?: number;
  pendingCommissionCents?: number;
};

type SellerPayload = {
  name?: string | null;
  orders?: number;
  revenueCents?: number;
  commissionCents?: number;
};

type PendingReasonPayload = {
  label?: string;
  dueDate?: string | null;
  pendingAmountCents?: number;
  pendingCommissionCents?: number;
  reason?: string;
};

type CommissionOrderPayload = {
  number?: number;
  issuedAt?: string;
  clientName?: string;
  sellerName?: string | null;
  totalCents?: number;
  commissionCents?: number;
  payableCommissionCents?: number;
  pendingCommissionCents?: number;
  pendingReasons?: PendingReasonPayload[];
};

function cents(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function money(value: unknown) {
  return (cents(value) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

function pedido(number: unknown) {
  const value = Number(number ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "PED-0000";
  return `PED-${String(value).padStart(4, "0")}`;
}

function safeText(value: unknown, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function buildSettlementMessage(params: {
  pixKey?: string;
  period?: { from?: string; to?: string };
  filters?: { regionName?: string; sellerName?: string };
  summary?: SummaryPayload;
  bySeller?: SellerPayload[];
  commissionOrders?: CommissionOrderPayload[];
}) {
  const summary = params.summary ?? {};
  const bySeller = Array.isArray(params.bySeller) ? params.bySeller : [];
  const commissionOrders = Array.isArray(params.commissionOrders) ? params.commissionOrders : [];

  const pendingOrders = commissionOrders
    .filter((order) => cents(order.pendingCommissionCents) > 0)
    .slice(0, 12);

  const sellerLines = bySeller.length
    ? bySeller
        .slice(0, 8)
        .map((seller) => {
          return `• ${safeText(seller.name, "Sem representante")}: ${seller.orders ?? 0} pedido(s), vendas ${money(seller.revenueCents)}, comissão ${money(seller.commissionCents)}`;
        })
        .join("\n")
    : "• Sem representantes no período.";

  const pendingLines = pendingOrders.length
    ? pendingOrders
        .map((order) => {
          const reasons = Array.isArray(order.pendingReasons) && order.pendingReasons.length > 0
            ? order.pendingReasons
                .slice(0, 3)
                .map((reason) => {
                  return `   - ${safeText(reason.label)}: ${safeText(reason.reason)} | venc.: ${fmtDate(reason.dueDate)} | aberto ${money(reason.pendingAmountCents)} | comissão pendente ${money(reason.pendingCommissionCents)}`;
                })
                .join("\n")
            : "   - Sem baixa financeira suficiente para liberar a comissão.";

          return `• ${pedido(order.number)} - ${safeText(order.clientName)}\n  Total: ${money(order.totalCents)} | comissão: ${money(order.commissionCents)} | paga agora: ${money(order.payableCommissionCents)} | pendente: ${money(order.pendingCommissionCents)}\n${reasons}`;
        })
        .join("\n")
    : "• Nenhuma comissão pendente no filtro atual.";

  const pixText = safeText(params.pixKey, "não cadastrada");

  return [
    "*Fechamento de comissão*",
    "",
    `Período: ${fmtDate(params.period?.from)} até ${fmtDate(params.period?.to)}`,
    `Região: ${safeText(params.filters?.regionName, "Todas as regiões")}`,
    `Representante: ${safeText(params.filters?.sellerName, "Todos os representantes")}`,
    "",
    `Pedidos: ${summary.totalOrders ?? 0}`,
    `Total vendido: ${money(summary.totalRevenueCents)}`,
    `Comissão total gerada: ${money(summary.totalCommissionCents)}`,
    `*Valor a pagar agora: ${money(summary.payableCommissionCents)}*`,
    `Pendente para próximo acerto: ${money(summary.pendingCommissionCents)}`,
    "",
    "*Resumo por representante*",
    sellerLines,
    "",
    "*Pendências e motivos*",
    pendingLines,
    "",
    "*Chave Pix para pagamento:*",
    pixText,
    "",
    "Regra: comissão liberada somente sobre valores já baixados como recebidos no financeiro.",
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = normalizeBrazilPhone(body?.phone);

    if (!phone) {
      return NextResponse.json(
        { error: "Telefone do financeiro inválido ou vazio." },
        { status: 400 }
      );
    }

    const message = buildSettlementMessage({
      pixKey: body?.pixKey,
      period: body?.period,
      filters: body?.filters,
      summary: body?.summary,
      bySeller: body?.bySeller,
      commissionOrders: body?.commissionOrders,
    });

    const response = await sendText({ phone, message });

    return NextResponse.json({ ok: true, response });
  } catch (error) {
    console.error("POST /api/automations/commission-settlement/send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao enviar fechamento de comissão." },
      { status: 500 }
    );
  }
}
