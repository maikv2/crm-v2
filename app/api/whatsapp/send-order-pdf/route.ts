import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";
import {
  sendDocument,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id?: string }> };

function buildCaption(orderNumber: number, clientName: string | null) {
  const num = String(orderNumber ?? "").padStart(6, "0");
  const greeting = clientName ? `Olá, ${clientName}!` : "Olá!";
  return (
    `${greeting} 😊\n\n` +
    `Segue em anexo o PDF do pedido *#${num}*.\n` +
    `Qualquer dúvida, estamos à disposição.`
  );
}

export async function POST(request: Request, _context: RouteContext) {
  try {
    await requireAdminUser();

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");

    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const orderId =
      (typeof body.orderId === "string" && body.orderId) ||
      idFromQuery ||
      "";

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        client: {
          select: {
            id: true,
            name: true,
            whatsapp: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const phoneOverride =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const phone =
      phoneOverride ||
      order.client?.whatsapp ||
      order.client?.phone ||
      "";

    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const origin = url.origin;
    const cookie = request.headers.get("cookie") ?? "";
    const pdfRes = await fetch(`${origin}/api/orders/${order.id}/pdf`, {
      method: "GET",
      headers: cookie ? { cookie } : undefined,
      cache: "no-store",
    });

    if (!pdfRes.ok) {
      const text = await pdfRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Não foi possível gerar o PDF do pedido.",
          status: pdfRes.status,
          detalhes: text.slice(0, 400),
        },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

    const fileName = `pedido-${order.number}.pdf`;
    const caption = buildCaption(order.number, order.client?.name ?? null);

    const result = await sendDocument({
      phone,
      document: pdfBuffer,
      extension: "pdf",
      fileName,
      caption,
    });

    return NextResponse.json({
      ok: true,
      message: "PDF do pedido enviado pelo WhatsApp.",
      phone,
      fileName,
      zapi: result,
    });
  } catch (error: any) {
    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }
    console.error("POST /api/whatsapp/send-order-pdf error:", error);
    if (error?.message === "Usuário não autenticado") {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }
    if (error?.message?.includes("Acesso permitido")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error?.message || "Erro ao enviar PDF do pedido." },
      { status: 500 }
    );
  }
}