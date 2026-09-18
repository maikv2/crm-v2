import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PortalOrderRequestStatus } from "@prisma/client";
import { readOrderApprovalToken } from "@/lib/order-approval-token";
import { notifyClientOrderApproved } from "@/lib/order-request-notify";

/**
 * Aprovacao rapida de pedido via link do WhatsApp - nao exige login no
 * CRM, so um token assinado (14 dias) que identifica a solicitacao. So
 * muda o status pra APPROVED; converter em pedido de verdade (escolher
 * vendedor pra comissao) ainda precisa ser feito dentro do CRM.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = readOrderApprovalToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Link invalido ou expirado." }, { status: 400 });
  }

  const portalRequest = await prisma.portalOrderRequest.findUnique({
    where: { id: payload.requestId },
    include: {
      client: { select: { name: true, code: true } },
      items: {
        include: { product: { select: { name: true, sku: true, priceCents: true, sitePriceCents: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!portalRequest) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  // Pedido do site usa o preco de atacado (sitePriceCents), nao o preco
  // normal/consignacao.
  const useSitePrice = portalRequest.source === "site";
  const itemPriceCents = (item: (typeof portalRequest.items)[number]) =>
    (useSitePrice ? item.product.sitePriceCents : null) ?? item.product.priceCents ?? 0;

  const subtotalCents = portalRequest.items.reduce(
    (sum, item) => sum + item.quantity * itemPriceCents(item),
    0
  );

  return NextResponse.json({
    request: {
      id: portalRequest.id,
      status: portalRequest.status,
      createdAt: portalRequest.createdAt,
      clientName: portalRequest.client.name,
      clientCode: portalRequest.client.code,
      subtotalCents,
      items: portalRequest.items.map((item) => ({
        name: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        priceCents: itemPriceCents(item),
      })),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token || "");
  const payload = readOrderApprovalToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Link invalido ou expirado." }, { status: 400 });
  }

  const portalRequest = await prisma.portalOrderRequest.findUnique({
    where: { id: payload.requestId },
    select: { id: true, status: true },
  });

  if (!portalRequest) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (portalRequest.status !== PortalOrderRequestStatus.PENDING) {
    return NextResponse.json(
      { error: "Este pedido ja foi analisado anteriormente.", status: portalRequest.status },
      { status: 409 }
    );
  }

  const updated = await prisma.portalOrderRequest.update({
    where: { id: portalRequest.id },
    data: { status: PortalOrderRequestStatus.APPROVED },
    select: { id: true, status: true },
  });

  await notifyClientOrderApproved({ requestId: portalRequest.id });

  return NextResponse.json({ ok: true, request: updated });
}
