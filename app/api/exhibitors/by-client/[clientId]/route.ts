import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await context.params;

    const exhibitors = await prisma.exhibitor.findMany({
      where: {
        clientId,
      },
      select: {
        id: true,
        name: true,
        model: true,
        status: true,
        installedAt: true,
      },
      orderBy: {
        installedAt: "desc",
      },
    });

    return NextResponse.json({ exhibitors });
  } catch (error) {
    console.error("EXHIBITORS BY CLIENT ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao buscar expositores." },
      { status: 500 }
    );
  }
}