import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json({ items: [] });
    }

    const items = await prisma.order.findMany({
      where: {
        regionId: user.regionId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        type: true,
        totalCents: true,
        paymentMethod: true,
        paymentStatus: true,
        issuedAt: true,
        createdAt: true,

        client: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },

        exhibitor: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        items: {
          select: {
            qty: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const normalized = items.map((order) => {
      const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);

      return {
        id: order.id,
        number: order.number,
        status: order.status,
        type: order.type,
        totalCents: order.totalCents,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        issuedAt: order.issuedAt,
        createdAt: order.createdAt,

        totalItems,

        client: order.client,
        exhibitor: order.exhibitor,
      };
    });

    return NextResponse.json({ items: normalized });
  } catch (error) {
    console.error("REP ORDERS ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar pedidos do representante." },
      { status: 500 }
    );
  }
}