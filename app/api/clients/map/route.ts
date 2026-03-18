import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: {
        active: true,
        latitude: {
          not: null,
        },
        longitude: {
          not: null,
        },
      },
      orderBy: [
        {
          city: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        tradeName: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        mapStatus: true,
        lastVisitAt: true,
        needsReturn: true,
        region: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients/map error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os clientes do mapa",
      },
      { status: 500 }
    );
  }
}