import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderAccessError, requireOrderAccess } from "@/lib/order-auth";
import {
  EfiChargesApiError,
  EfiChargesConfigError,
  ensureEfiPaymentLinkForOrder,
} from "@/lib/efi-payment-service";
import {
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function orderNumber(value: number) {
  return String(value).padStart(6, "0");
}

function dateToBR(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildMessage(params: {
  clientName: string;
  orderNumber: number;
  paymentUrl: string;
  expireAt: Date | null;
}) {
  const lines = [
    `Olá, ${params.clientName}!`,
    "",
    `Segue o link para pagamento do pedido #${orderNumber(params.orderNumber)} da V2 Distribuidora.`,
    "",
    "Você pode pagar no cartão de crédito e parcelar direto na página de pagamento:",
    `👉 ${params.paymentUrl}`,
    "",
    params.expireAt ? `Válido até ${dateToBR(params.expireAt)}.` : "",
    "",
    "Se já realizou o pagamento, pode desconsiderar esta mensagem.",
    "Qualquer dúvida, é só nos chamar por aqui.",
  ];

  return lines.filter((line, index, all) => line || all[index - 1]).join("\n");
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");
    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const orderId =
      (typeof body.orderId === "string" && body.orderId) || idFromQuery || "";

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório." },
        { status: 400 }
      );
    }

    await requireOrderAccess(orderId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        paymentMethod: true,
        client: {
          select: {
            name: true,
            tradeName: true,
            whatsapp: true,
            phone: true,
          },
        },
        // Pedido pode ter forma de pagamento dividida — só habilita o envio
        // se alguma divisão realmente for cartão de crédito.
        accountsReceivables: {
          where: { paymentMethod: "CARD_CREDIT" },
          select: { id: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (!order.accountsReceivables.length) {
      return NextResponse.json(
        { error: "Este pedido não tem nenhuma forma de pagamento em cartão de crédito." },
        { status: 400 }
      );
    }

    const phoneOverride =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = phoneOverride || order.client?.whatsapp || order.client?.phone || "";

    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const { payment, created } = await ensureEfiPaymentLinkForOrder(
      order.id,
      request.url
    );

    if (!payment.paymentUrl) {
      return NextResponse.json(
        { error: "Efí não retornou o link de pagamento." },
        { status: 502 }
      );
    }

    const message = buildMessage({
      clientName: order.client?.tradeName || order.client?.name || "cliente",
      orderNumber: order.number,
      paymentUrl: payment.paymentUrl,
      expireAt: payment.dueDate,
    });

    const textResult = await sendText({ phone, message });

    return NextResponse.json({
      ok: true,
      message: "Link de pagamento enviado ao cliente pelo WhatsApp.",
      phone,
      payment: {
        id: payment.id,
        chargeId: payment.providerChargeId,
        status: payment.status,
        paymentUrl: payment.paymentUrl,
        created,
      },
      zapi: {
        text: textResult,
      },
    });
  } catch (error: any) {
    if (error instanceof OrderAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof EfiChargesConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof EfiChargesApiError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("POST /api/whatsapp/send-payment-link error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao enviar link de pagamento." },
      { status: 500 }
    );
  }
}
