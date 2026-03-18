import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolved =
      "then" in params ? await params : params;

    const id = resolved?.id;

    if (!id) {
      return NextResponse.json({ error: "ID não recebido" }, { status: 400 });
    }

    const items = await prisma.exhibitorMaintenance.findMany({
      where: {
        exhibitorId: id,
      },
      orderBy: {
        performedAt: "desc",
      },
    });

    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar manutenções",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}