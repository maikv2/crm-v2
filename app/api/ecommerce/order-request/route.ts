import { NextResponse } from "next/server";
import {
  ExhibitorStatus,
  PaymentMethod,
  PortalOrderRequestStatus,
  ProspectStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError } from "@/lib/zapi";

type EcommerceCustomer = {
  companyName?: string;
  contactName?: string;
  document?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  city?: string;
  state?: string;
  paymentMethod?: string; // "CASH" | "PIX" | "BOLETO" | "CARD_CREDIT" | "CARD_DEBIT" | "CASH_ON_DELIVERY"
  installments?: number;
  shippingMode?: string;
  notes?: string;
};

type EcommerceItem = {
  productId?: string;
  sku?: string;
  name?: string;
  quantity?: number;
  unitCents?: number;
};

type EcommerceOrderRequest = {
  customer?: EcommerceCustomer;
  source?: string;
  marketplaceOrderId?: string;
  items?: EcommerceItem[];
  subtotalCents?: number;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function onlyDigits(value: unknown) {
  return normalizeText(value).replace(/\D/g, "");
}

function normalizeQuantity(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.max(0, Math.floor(numberValue));
}

function hasValidApiKey(request: Request) {
  const expectedKey = process.env.ECOMMERCE_API_KEY?.trim();
  if (!expectedKey) return false;

  const headerKey =
    request.headers.get("x-ecommerce-key") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return headerKey === expectedKey;
}

// --- Regras de pagamento do site (atacado) --------------------------------
// Boleto so a vista (1x); parcelamento so no cartao de credito; "pagamento
// na entrega" so pra quem tem expositor ativo (checado no banco, nao so no
// site - o site so espelha essa regra pra UX). Combinacao fora do padrao
// (ex: entrada + boletos parcelados) e aceita mas marcada pra atencao
// redobrada do financeiro - toda solicitacao ja passa por aprovacao mesmo.
const MAX_CARD_INSTALLMENTS = 6;

type PaymentPlan = {
  paymentMethod: PaymentMethod | null;
  isCashOnDelivery: boolean;
  installments: number;
  customPlanRequested: boolean;
};

function normalizeRequestedPaymentMethod(value: unknown): PaymentMethod | "CASH_ON_DELIVERY" | null {
  const raw = String(value ?? "").toUpperCase().trim();
  switch (raw) {
    case "CASH":
    case "A_VISTA":
    case "AVISTA":
      return PaymentMethod.CASH;
    case "PIX":
      return PaymentMethod.PIX;
    case "BOLETO":
    case "BANK_SLIP":
      return PaymentMethod.BOLETO;
    case "CARD_CREDIT":
    case "CREDIT":
    case "CREDIT_CARD":
      return PaymentMethod.CARD_CREDIT;
    case "CARD_DEBIT":
    case "DEBIT":
    case "DEBIT_CARD":
      return PaymentMethod.CARD_DEBIT;
    case "CASH_ON_DELIVERY":
    case "PAGAMENTO_NA_ENTREGA":
    case "ENTREGA":
      return "CASH_ON_DELIVERY";
    default:
      return null;
  }
}

function buildPaymentPlan(customer: EcommerceCustomer): { plan: PaymentPlan; error?: string } {
  const requested = normalizeRequestedPaymentMethod(customer.paymentMethod);
  const installmentsRaw = Number(customer.installments);
  const installments = Number.isFinite(installmentsRaw) && installmentsRaw > 0 ? Math.floor(installmentsRaw) : 1;

  if (requested === "CASH_ON_DELIVERY") {
    return {
      plan: { paymentMethod: null, isCashOnDelivery: true, installments: 1, customPlanRequested: false },
    };
  }

  if (requested === PaymentMethod.BOLETO) {
    // Boleto parcelado/entrada+boleto = plano customizado, precisa de
    // atencao manual do financeiro (nao rejeita, so sinaliza).
    return {
      plan: {
        paymentMethod: PaymentMethod.BOLETO,
        isCashOnDelivery: false,
        installments,
        customPlanRequested: installments > 1,
      },
    };
  }

  if (requested === PaymentMethod.CARD_CREDIT) {
    if (installments > MAX_CARD_INSTALLMENTS) {
      return { plan: { paymentMethod: null, isCashOnDelivery: false, installments: 1, customPlanRequested: false }, error: `Parcelamento maximo no cartao de credito e ${MAX_CARD_INSTALLMENTS}x.` };
    }
    return {
      plan: { paymentMethod: PaymentMethod.CARD_CREDIT, isCashOnDelivery: false, installments, customPlanRequested: false },
    };
  }

  if (requested === PaymentMethod.PIX || requested === PaymentMethod.CASH || requested === PaymentMethod.CARD_DEBIT) {
    return {
      plan: { paymentMethod: requested, isCashOnDelivery: false, installments: 1, customPlanRequested: false },
    };
  }

  return {
    plan: { paymentMethod: null, isCashOnDelivery: false, installments: 1, customPlanRequested: false },
  };
}

function paymentPlanLabel(plan: PaymentPlan) {
  if (plan.isCashOnDelivery) return "Pagamento na entrega (expositor ativo)";
  switch (plan.paymentMethod) {
    case PaymentMethod.PIX:
      return "Pix a vista";
    case PaymentMethod.CASH:
      return "A vista";
    case PaymentMethod.CARD_DEBIT:
      return "Cartao de debito";
    case PaymentMethod.CARD_CREDIT:
      return plan.installments > 1 ? `Cartao de credito em ${plan.installments}x` : "Cartao de credito a vista";
    case PaymentMethod.BOLETO:
      return plan.installments > 1
        ? `Boleto - entrada + ${plan.installments - 1}x (plano customizado, aguardando financeiro)`
        : "Boleto a vista (liberado apos pagamento)";
    default:
      return "Nao informada";
  }
}

function buildNotes(params: {
  body: EcommerceOrderRequest;
  customer: EcommerceCustomer;
  items: Array<EcommerceItem & { quantity: number }>;
  plan: PaymentPlan;
}) {
  const { body, customer, items, plan } = params;
  const lines = [
    `Origem: ${normalizeText(body.source) || "site"}`,
    body.marketplaceOrderId
      ? `Pedido externo: ${normalizeText(body.marketplaceOrderId)}`
      : null,
    `Forma de pagamento desejada: ${paymentPlanLabel(plan)}`,
    plan.customPlanRequested
      ? "*** ATENCAO: plano de pagamento customizado, precisa aprovacao financeira antes de liberar. ***"
      : null,
    `Frete/entrega: ${normalizeText(customer.shippingMode) || "a combinar"}`,
    customer.contactName ? `Contato: ${normalizeText(customer.contactName)}` : null,
    customer.whatsapp ? `WhatsApp: ${normalizeText(customer.whatsapp)}` : null,
    customer.email ? `Email: ${normalizeText(customer.email)}` : null,
    customer.cep ? `CEP: ${normalizeText(customer.cep)}` : null,
    customer.city || customer.state
      ? `Cidade/UF: ${normalizeText(customer.city)} ${normalizeText(customer.state)}`
      : null,
    customer.notes ? `Observacoes do cliente: ${normalizeText(customer.notes)}` : null,
    "Itens solicitados:",
    ...items.map((item) => {
      const code = normalizeText(item.sku || item.productId || item.name);
      return `- ${code}: ${item.quantity} un.`;
    }),
  ];

  return lines.filter(Boolean).join("\n");
}

async function notifyClientOrderReceived(params: { whatsapp: string; contactName: string | null; companyName: string }) {
  try {
    const greetingName = params.contactName || params.companyName;
    await sendText({
      phone: params.whatsapp,
      message:
        `Olá, ${greetingName}! 😊\n\n` +
        `Recebemos seu pedido feito pelo site da V2 Distribuidora. ` +
        `Ele já está em análise e em breve nossa equipe entra em contato por aqui pra confirmar a aprovação e o prazo de entrega.\n\n` +
        `Qualquer dúvida, é só chamar por aqui mesmo.`,
    });
  } catch (error) {
    // Nao derruba a criacao do pedido se o WhatsApp falhar (ex: credenciais
    // Z-API ausentes em ambiente de teste) - so registra no log.
    if (error instanceof ZApiConfigError) {
      console.warn("WhatsApp nao configurado - aviso de pedido recebido nao enviado.");
    } else {
      console.error("Falha ao enviar aviso de pedido recebido via WhatsApp:", error);
    }
  }
}

export async function POST(request: Request) {
  try {
    if (!hasValidApiKey(request)) {
      return NextResponse.json({ error: "Acesso nao autorizado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as EcommerceOrderRequest | null;
    const customer = body?.customer ?? {};
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    const items = rawItems
      .map((item) => ({
        ...item,
        productId: normalizeText(item.productId),
        sku: normalizeText(item.sku),
        name: normalizeText(item.name),
        quantity: normalizeQuantity(item.quantity),
      }))
      .filter((item) => item.quantity > 0 && (item.productId || item.sku || item.name));

    if (!items.length) {
      return NextResponse.json(
        { error: "Informe pelo menos um item valido." },
        { status: 400 },
      );
    }

    const document = onlyDigits(customer.document);
    const whatsapp = onlyDigits(customer.whatsapp);
    const companyName = normalizeText(customer.companyName);

    if (!companyName || document.length < 11 || whatsapp.length < 10) {
      return NextResponse.json(
        { error: "Empresa, CPF/CNPJ e WhatsApp sao obrigatorios." },
        { status: 400 },
      );
    }

    const { plan, error: planError } = buildPaymentPlan(customer);
    if (planError) {
      return NextResponse.json({ error: planError }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: {
        OR: [
          document.length === 14 ? { cnpj: document } : undefined,
          document.length === 11 ? { cpf: document } : undefined,
          { whatsapp },
          { phone: whatsapp },
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        name: true,
        regionId: true,
      },
    });

    const productLookup = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { id: { in: items.map((item) => item.productId).filter(Boolean) } },
          { sku: { in: items.map((item) => item.sku).filter(Boolean) } },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
      },
    });

    const productsById = new Map(productLookup.map((product) => [product.id, product]));
    const productsBySku = new Map(productLookup.map((product) => [product.sku, product]));

    if (!client) {
      const notes = buildNotes({ body: body ?? {}, customer, items, plan });
      const prospect = await prisma.prospect.create({
        data: {
          name: companyName,
          tradeName: companyName,
          cnpj: document.length === 14 ? document : null,
          phone: whatsapp,
          email: normalizeText(customer.email) || null,
          contactName: normalizeText(customer.contactName) || null,
          cep: normalizeText(customer.cep) || null,
          city: normalizeText(customer.city) || null,
          state: normalizeText(customer.state).toUpperCase() || null,
          status: ProspectStatus.PENDING,
          notes,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          type: "prospect",
          prospectId: prospect.id,
          message: "Cliente ainda nao cadastrado. Prospect criado para atendimento.",
        },
        { status: 201 },
      );
    }

    // "Pagamento na entrega" so e valido pra cliente com expositor ativo -
    // checagem no banco e a autoridade final, o site so espelha isso na UI.
    if (plan.isCashOnDelivery) {
      const activeExhibitor = await prisma.exhibitor.findFirst({
        where: { clientId: client.id, status: ExhibitorStatus.ACTIVE },
        select: { id: true },
      });
      if (!activeExhibitor) {
        return NextResponse.json(
          {
            error:
              "Pagamento na entrega disponivel apenas para clientes com expositor ativo. Escolha outra forma de pagamento.",
          },
          { status: 403 },
        );
      }
    }

    const notes = buildNotes({ body: body ?? {}, customer, items, plan });

    const requestItems = items
      .map((item) => {
        const product = item.productId
          ? productsById.get(item.productId)
          : item.sku
            ? productsBySku.get(item.sku)
            : null;

        if (!product) return null;

        return {
          productId: product.id,
          quantity: item.quantity,
        };
      })
      .filter((item): item is { productId: string; quantity: number } => Boolean(item));

    if (!requestItems.length) {
      const prospect = await prisma.prospect.create({
        data: {
          name: companyName,
          tradeName: companyName,
          cnpj: document.length === 14 ? document : null,
          phone: whatsapp,
          email: normalizeText(customer.email) || null,
          contactName: normalizeText(customer.contactName) || null,
          cep: normalizeText(customer.cep) || null,
          city: normalizeText(customer.city) || null,
          state: normalizeText(customer.state).toUpperCase() || null,
          regionId: client.regionId,
          status: ProspectStatus.PENDING,
          notes: `${notes}\n\nAtencao: os produtos enviados nao foram encontrados no catalogo ativo.`,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          type: "prospect",
          prospectId: prospect.id,
          message: "Produtos nao encontrados no catalogo. Prospect criado para conferencia.",
        },
        { status: 201 },
      );
    }

    const portalRequest = await prisma.portalOrderRequest.create({
      data: {
        clientId: client.id,
        regionId: client.regionId,
        status: PortalOrderRequestStatus.PENDING,
        notes,
        source: "site",
        requestedPaymentMethod: plan.paymentMethod ?? undefined,
        requestedInstallments: plan.installments,
        isCashOnDelivery: plan.isCashOnDelivery,
        customPlanRequested: plan.customPlanRequested,
        items: {
          create: requestItems,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    await notifyClientOrderReceived({
      whatsapp,
      contactName: normalizeText(customer.contactName) || null,
      companyName,
    });

    return NextResponse.json(
      {
        ok: true,
        type: "portalOrderRequest",
        request: portalRequest,
        message: "Solicitacao de pedido criada no CRM.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/ecommerce/order-request error:", error);

    return NextResponse.json(
      { error: "Nao foi possivel registrar o pedido online." },
      { status: 500 },
    );
  }
}
