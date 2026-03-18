import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = (searchParams.get("region") ?? "").trim();

    if (!region) {
      return NextResponse.json(
        { error: "Região é obrigatória." },
        { status: 400 }
      );
    }

    const rows = await prisma.representativeSettlement.findMany({
      where: {
        region: {
          name: region,
        },
      },
      orderBy: {
        weekStart: "desc",
      },
      include: {
        region: {
          select: {
            name: true,
          },
        },
        representative: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Erro ao buscar histórico de fechamentos:", error);
    return NextResponse.json(
      { error: "Erro ao buscar histórico de fechamentos." },
      { status: 500 }
    );
  }
}