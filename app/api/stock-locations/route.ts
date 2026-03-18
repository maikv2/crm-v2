import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.stockLocation.findMany({
      where: {
        active: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("STOCK LOCATIONS GET ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar locais de estoque." },
      { status: 500 }
    );
  }
}