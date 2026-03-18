import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PortalOrderRequestStatus, OrderType } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const body = await request.json();
    const status = body?.status as PortalOrderRequestStatus | undefined;

    if (!status) {
      return NextResponse.json(
        { error: "Status inválido" },
        { status: 400 }
      );
    }

    const portalRequest = await prisma.portalOrderRequest.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
      },
    });

    if (!portalRequest) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    if (
      status === PortalOrderRequestStatus.APPROVED ||
      status === PortalOrderRequestStatus.REJECTED
    ) {
      const updated = await prisma.portalOrderRequest.update({
        where: { id },
        data: { status },
      });

      return NextResponse.json({ request: updated });
    }

    if (status === PortalOrderRequestStatus.CONVERTED_TO_ORDER) {
      const items = portalRequest.items;

      if (!items.length) {
        return NextResponse.json(
          { error: "Pedido sem itens" },
          { status: 400 }
        );
      }

      const productIds = items.map((item) => item.productId);

      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
      });

      const productMap = new Map(products.map((product) => [product.id, product]));

      let subtotal = 0;

      const orderItems = items.map((item) => {
        const product = productMap.get(item.productId);

        const unit = product?.priceCents ?? 0;
        const line = unit * item.quantity;

        subtotal += line;

        return {
          productId: item.productId,
          qty: item.quantity,
          unitCents: unit,
        };
      });

      const order = await prisma.order.create({
        data: {
          clientId: portalRequest.clientId,
          regionId: portalRequest.regionId!,
          type: OrderType.SALE,
          subtotalCents: subtotal,
          totalCents: subtotal,
          financialMovement: false,
          notes: "Pedido criado a partir do portal do cliente",
          items: {
            create: orderItems,
          },
        },
      });

      await prisma.portalOrderRequest.update({
        where: { id },
        data: {
          status: PortalOrderRequestStatus.CONVERTED_TO_ORDER,
        },
      });

      return NextResponse.json({
        orderId: order.id,
      });
    }

    return NextResponse.json(
      { error: "Status não suportado" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);

    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}