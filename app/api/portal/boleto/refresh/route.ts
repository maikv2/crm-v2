import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  EfiChargesApiError,
  EfiChargesConfigError,
  ensureEfiBilletsForOrder,
} from "@/lib/efi-payment-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const clientId = cookieStore.get("portal_session")?.value;

    if (!clientId) {
      return NextResponse.json(
        { error: "Sessão do portal não encontrada." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const installmentId =
      typeof body.installmentId === "string" ? body.installmentId.trim() : "";

    if (!orderId || !installmentId) {
      return NextResponse.json(
        { error: "Pedido e parcela são obrigatórios." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true },
    });

    if (!order || order.clientId !== clientId) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const payment = await prisma.externalPayment.findFirst({
      where: { orderId, installmentId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Cobrança não encontrada para esta parcela." },
        { status: 404 }
      );
    }

    if (payment.status !== "OVERDUE") {
      return NextResponse.json(
        { error: "Só é possível atualizar boletos vencidos." },
        { status: 400 }
      );
    }

    const results = await ensureEfiBilletsForOrder(
      orderId,
      request.url,
      installmentId
    );

    const updated = results.find((item) => item.payment.installmentId === installmentId)
      ?.payment;

    if (!updated) {
      return NextResponse.json(
        { error: "Não foi possível atualizar o boleto." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      payment: {
        id: updated.id,
        type: updated.type,
        status: updated.status,
        amountCents: updated.amountCents,
        paidCents: updated.paidCents,
        dueDate: updated.dueDate,
        paidAt: updated.paidAt,
        boletoLink: updated.boletoLink,
        boletoPdfUrl: updated.boletoPdfUrl,
        barcode: updated.barcode,
        pixCopyPaste: updated.pixCopyPaste,
        installmentId: updated.installmentId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof EfiChargesConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof EfiChargesApiError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("POST /api/portal/boleto/refresh error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o boleto.",
      },
      { status: 500 }
    );
  }
}
