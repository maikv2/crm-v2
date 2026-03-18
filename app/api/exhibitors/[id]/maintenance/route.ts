import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const exhibitorId = parts[parts.length - 2];

    if (!exhibitorId) {
      return NextResponse.json(
        { error: "ID do expositor não recebido" },
        { status: 400 }
      );
    }

    const maintenances = await prisma.exhibitorMaintenance.findMany({
      where: {
        exhibitorId,
      },
      orderBy: {
        performedAt: "desc",
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(maintenances);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar histórico de manutenção",
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}