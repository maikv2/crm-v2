import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.portalOrderRequest.findMany({
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

    return NextResponse.json({
      requests,
    });
  } catch (error) {
    console.error("Erro ao listar pedidos do portal:", error);

    return NextResponse.json(
      {
        error: "Erro ao listar pedidos",
      },
      { status: 500 }
    );
  }
}