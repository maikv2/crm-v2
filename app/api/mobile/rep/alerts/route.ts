import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { PortalOrderRequestStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (user.role !== "REPRESENTATIVE") {
      return NextResponse.json(
        { error: "Acesso permitido apenas para representantes." },
        { status: 403 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json(
        { error: "Representante sem região vinculada." },
        { status: 400 }
      );
    }

    const requests = await prisma.portalOrderRequest.findMany({
      where: {
        regionId: user.regionId,
        status: PortalOrderRequestStatus.PENDING,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                priceCents: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("MOBILE REP ALERTS ERROR:", error);
    return NextResponse.json(
      { error: "Erro ao carregar alertas." },
      { status: 500 }
    );
  }
}
