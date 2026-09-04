import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderAccessError, requireOrderAccess } from "@/lib/order-auth";
import {
  EfiChargesApiError,
  EfiChargesConfigError,
  ensureEfiBilletsForOrder,
} from "@/lib/efi-payment-service";
import {
  sendDocument,
  sendImage,
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function centsToBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
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

function orderNumber(value: number) {
  return String(value).padStart(6, "0");
}

function buildMessage(params: {
  clientName: string;
  orderNumber: number;
  isPix: boolean;
  payments: Awaited<ReturnType<typeof ensureEfiBilletsForOrder>>;
}) {
  const { isPix } = params;
  const lines = [
    `Olá, ${params.clientName}!`,
    "",
    isPix
      ? `Segue o Pix para pagamento do pedido #${orderNumber(params.orderNumber)} da V2 Distribuidora.`
      : `Segue o boleto do pedido #${orderNumber(params.orderNumber)} da V2 Distribuidora.`,
    "",
  ];

  for (const item of params.payments) {
    const payment = item.payment;
    const rows = isPix
      ? [
          `Parcela: ${centsToBRL(payment.amountCents)}`,
          `Vencimento: ${dateToBR(payment.dueDate)}`,
          payment.pixCopyPaste ? `Pix copia e cola: ${payment.pixCopyPaste}` : "",
          payment.boletoLink
            ? `Se preferir, link do boleto: ${payment.boletoLink}`
            : "",
        ]
      : [
          `Parcela: ${centsToBRL(payment.amountCents)}`,
          `Vencimento: ${dateToBR(payment.dueDate)}`,
          payment.boletoLink ? `Link: ${payment.boletoLink}` : "",
          payment.barcode ? `Linha digitável: ${payment.barcode}` : "",
          payment.pixCopyPaste ? `Pix copia e cola: ${payment.pixCopyPaste}` : "",
        ];
    lines.push(...rows, "");
  }

  lines.push(
    "Se já realizou o pagamento, pode desconsiderar esta mensagem.",
    "Qualquer dúvida, é só nos chamar por aqui."
  );

  return lines.filter((line, index, all) => line || all[index - 1]).join("\n");
}

async function trySendSinglePdf(params: {
  phone: string;
  pdfUrl: string | null;
  orderNumber: number;
}) {
  if (!params.pdfUrl) {
    return { sent: false, skipped: "sem_pdf" };
  }

  try {
    const res = await fetch(params.pdfUrl, { cache: "no-store" });
    if (!res.ok) {
      return { sent: false, skipped: `pdf_http_${res.status}` };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `boleto-${orderNumber(params.orderNumber)}.pdf`;
    const zapi = await sendDocument({
      phone: params.phone,
      document: buffer,
      extension: "pdf",
      fileName,
      caption: "Boleto V2 Distribuidora",
    });

    return { sent: true, fileName, zapi };
  } catch (error) {
    return {
      sent: false,
      skipped: error instanceof Error ? error.message : "erro_pdf",
    };
  }
}

async function trySendPixQrCode(params: {
  phone: string;
  qrCodeImage: string | null;
  caption: string;
}) {
  if (!params.qrCodeImage) {
    return { sent: false, skipped: "sem_qrcode" };
  }

  try {
    const zapi = await sendImage({
      phone: params.phone,
      image: params.qrCodeImage,
      caption: params.caption,
    });

    return { sent: true, zapi };
  } catch (error) {
    return {
      sent: false,
      skipped: error instanceof Error ? error.message : "erro_qrcode",
    };
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");
    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const orderId =
      (typeof body.orderId === "string" && body.orderId) ||
      idFromQuery ||
      "";
    const installmentId =
      typeof body.installmentId === "string" ? body.installmentId : null;

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
        // se alguma divisão realmente for boleto ou Pix.
        accountsReceivables: {
          where: { paymentMethod: { in: ["BOLETO", "PIX"] } },
          select: { paymentMethod: true },
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
        { error: "Este pedido não tem nenhuma forma de pagamento em boleto ou Pix." },
        { status: 400 }
      );
    }

    const isPix = order.accountsReceivables.every((item) => item.paymentMethod === "PIX");

    const phoneOverride =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = phoneOverride || order.client?.whatsapp || order.client?.phone || "";

    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const payments = await ensureEfiBilletsForOrder(
      order.id,
      request.url,
      installmentId
    );

    const message = buildMessage({
      clientName: order.client?.tradeName || order.client?.name || "cliente",
      orderNumber: order.number,
      isPix,
      payments,
    });

    const textResult = await sendText({ phone, message });
    const pdfResult =
      !isPix && payments.length === 1
        ? await trySendSinglePdf({
            phone,
            pdfUrl: payments[0].payment.boletoPdfUrl,
            orderNumber: order.number,
          })
        : { sent: false, skipped: isPix ? "pedido_pix" : "multiplos_boletos" };

    const pixResults = [];
    if (isPix) {
      for (const [index, item] of payments.entries()) {
        const caption =
          payments.length > 1
            ? `QR Code Pix - Pedido #${orderNumber(order.number)} - Parcela ${
                index + 1
              }/${payments.length}`
            : `QR Code Pix - Pedido #${orderNumber(order.number)}`;

        pixResults.push({
          id: item.payment.id,
          ...(await trySendPixQrCode({
            phone,
            qrCodeImage: item.payment.pixQrCodeImage,
            caption,
          })),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: isPix
        ? "Pix enviado ao cliente pelo WhatsApp."
        : "Boleto enviado ao cliente pelo WhatsApp.",
      phone,
      payments: payments.map((item) => ({
        id: item.payment.id,
        chargeId: item.payment.providerChargeId,
        status: item.payment.status,
        created: item.created,
        synced: item.synced,
      })),
      zapi: {
        text: textResult,
        pdf: pdfResult,
        pix: pixResults,
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

    console.error("POST /api/whatsapp/send-boleto error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao enviar boleto." },
      { status: 500 }
    );
  }
}
