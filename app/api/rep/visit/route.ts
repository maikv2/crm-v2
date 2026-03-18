import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isValidUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const rawClientId = body.clientId as string | undefined;
    const notes = (body.notes as string | undefined)?.trim() || null;
    const visitDate = body.visitDate as string | undefined;

    if (!isValidUuid(rawClientId)) {
      return NextResponse.json(
        { error: "Cliente inválido." },
        { status: 400 }
      );
    }

    const clientId: string = rawClientId!;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const visitedAt =
      visitDate && !Number.isNaN(new Date(visitDate).getTime())
        ? new Date(visitDate)
        : new Date();

    const visit = await prisma.visit.create({
      data: {
        clientId: clientId,
        visitedAt: visitedAt,
        notes: notes,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Visita registrada com sucesso.",
        visit,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/rep/visit error:", error);

    return NextResponse.json(
      { error: "Erro ao registrar visita." },
      { status: 500 }
    );
  }
}