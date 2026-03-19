import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: RouteContext<"/api/regions/[id]/quota-map">
) {
  try {
    const { id } = await context.params;

    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        shares: {
          where: { isActive: true },
          include: {
            investor: true,
          },
          orderBy: {
            quotaNumber: "asc",
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(region);
  } catch (error) {
    console.error("quota-map error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar mapa de cotas." },
      { status: 500 }
    );
  }
}