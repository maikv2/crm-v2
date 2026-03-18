import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const clientId = cookieStore.get("portal_session")?.value;

    if (!clientId) {
      return NextResponse.json(
        { error: "Sessão do portal não encontrada." },
        { status: 401 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 401 }
      );
    }

    const orders = await prisma.order.findMany({
      where: {
        clientId: client.id,
      },
      orderBy: {
        issuedAt: "desc",
      },
      select: {
        id: true,
        number: true,
        status: true,
        issuedAt: true,
        totalCents: true,
        subtotalCents: true,
        discountCents: true,
        paymentMethod: true,
        notes: true,
        items: {
          select: {
            id: true,
            qty: true,
            unitCents: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      orders,
    });
  } catch (error: any) {
    console.error("GET /api/portal/orders error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os pedidos do portal.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}