import { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError } from "@/lib/zapi";
import { createOrderApprovalToken } from "@/lib/order-approval-token";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentLabel(params: {
  isCashOnDelivery: boolean;
  paymentMethod: PaymentMethod | null;
  installments: number;
  customPlanRequested: boolean;
}) {
  const { isCashOnDelivery, paymentMethod, installments, customPlanRequested } = params;
  if (isCashOnDelivery) return "Pagamento na entrega";
  switch (paymentMethod) {
    case PaymentMethod.PIX:
      return "Pix a vista";
    case PaymentMethod.CASH:
      return "A vista";
    case PaymentMethod.CARD_DEBIT:
      return "Cartao de debito";
    case PaymentMethod.CARD_CREDIT:
      return installments > 1 ? `Cartao de credito em ${installments}x` : "Cartao de credito a vista";
    case PaymentMethod.BOLETO:
      return customPlanRequested
        ? `Boleto - entrada + ${Math.max(installments - 1, 1)}x (plano customizado)`
        : "Boleto a vista";
    default:
      return "Nao informada";
  }
}

function buildBaseUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (request) return new URL(request.url).origin;
  return "";
}

/**
 * Avisa o WhatsApp da empresa (FINANCIAL_WHATSAPP) que um pedido novo
 * chegou pra aprovacao - seja vindo do site (v2-storefront) ou do portal
 * do cliente dentro do proprio CRM. Nunca derruba a criacao do pedido se
 * o WhatsApp falhar (mesma logica ja usada pro aviso ao cliente).
 */
export async function notifyCompanyNewOrderRequest(params: { requestId: string; request?: Request }) {
  try {
    const financialPhone = process.env.FINANCIAL_WHATSAPP?.trim();
    if (!financialPhone) {
      console.warn("FINANCIAL_WHATSAPP nao configurado - aviso de novo pedido nao enviado.");
      return;
    }

    const portalRequest = await prisma.portalOrderRequest.findUnique({
      where: { id: params.requestId },
      include: {
        client: { select: { name: true, code: true } },
        items: {
          include: { product: { select: { name: true, sku: true, priceCents: true, sitePriceCents: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!portalRequest) return;

    // Pedido do site usa o preco de atacado (sitePriceCents), nao o preco
    // normal/consignacao.
    const useSitePrice = portalRequest.source === "site";
    const itemPriceCents = (item: (typeof portalRequest.items)[number]) =>
      (useSitePrice ? item.product.sitePriceCents : null) ?? item.product.priceCents ?? 0;

    const subtotalCents = portalRequest.items.reduce(
      (sum, item) => sum + item.quantity * itemPriceCents(item),
      0
    );

    const itemLines = portalRequest.items.map(
      (item) => `- ${item.quantity}x ${item.product.name} (${item.product.sku})`
    );

    const label = paymentLabel({
      isCashOnDelivery: portalRequest.isCashOnDelivery,
      paymentMethod: portalRequest.requestedPaymentMethod,
      installments: portalRequest.requestedInstallments,
      customPlanRequested: portalRequest.customPlanRequested,
    });

    const originLabel = portalRequest.source === "site" ? "loja online (site)" : "portal do cliente";
    const baseUrl = buildBaseUrl(params.request);
    const approvalToken = createOrderApprovalToken(portalRequest.id);

    const message = [
      `📦 Novo pedido pra aprovar - ${originLabel}`,
      "",
      `Cliente: ${portalRequest.client.name}${portalRequest.client.code ? ` (${portalRequest.client.code})` : ""}`,
      "",
      "Itens:",
      ...itemLines,
      "",
      `Forma de pagamento: ${label}`,
      `Total: ${money(subtotalCents)}`,
      portalRequest.customPlanRequested ? "*** Plano de pagamento customizado - conferir com o cliente. ***" : null,
      "",
      baseUrl ? `Abrir no CRM: ${baseUrl}/orders/requests` : null,
      baseUrl ? `Aprovar este pedido: ${baseUrl}/order-approval?token=${approvalToken}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    await sendText({ phone: financialPhone, message });
  } catch (error) {
    if (error instanceof ZApiConfigError) {
      console.warn("WhatsApp nao configurado - aviso de novo pedido para a empresa nao enviado.");
    } else {
      console.error("Falha ao enviar aviso de novo pedido para o WhatsApp da empresa:", error);
    }
  }
}
