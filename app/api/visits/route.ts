import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientId = String(body.clientId ?? "");
    const exhibitorId = body.exhibitorId ? String(body.exhibitorId) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId é obrigatório" },
        { status: 400 }
      );
    }

    const visit = await prisma.visit.create({
      data: {
        clientId,
        exhibitorId,
        notes,
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao registrar visita", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}