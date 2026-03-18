import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExhibitorMaintenanceType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const exhibitorId = body.exhibitorId as string | undefined;
    const rawType = body.type as ExhibitorMaintenanceType | undefined;

    const description = (body.description as string | undefined) ?? null;
    const solution = (body.solution as string | undefined) ?? null;
    const notes = (body.notes as string | undefined) ?? null;

    const costCents =
      body.costCents != null && body.costCents !== ""
        ? Number(body.costCents)
        : null;

    const nextActionAt = body.nextActionAt
      ? new Date(body.nextActionAt)
      : null;

    if (!exhibitorId || !rawType) {
      return NextResponse.json(
        { error: "exhibitorId e type são obrigatórios" },
        { status: 400 }
      );
    }

    const type: ExhibitorMaintenanceType = rawType;

    const exhibitor = await prisma.exhibitor.findUnique({
      where: { id: exhibitorId },
      select: { id: true },
    });

    if (!exhibitor) {
      return NextResponse.json(
        { error: "Expositor não encontrado" },
        { status: 404 }
      );
    }

    const maintenance = await prisma.$transaction(async (tx) => {
      const created = await tx.exhibitorMaintenance.create({
        data: {
          exhibitorId,
          type,
          description,
          solution,
          notes,
          costCents,
          nextActionAt,
        },
      });

      await tx.exhibitor.update({
        where: { id: exhibitorId },
        data: {
          lastMaintenanceAt: new Date(),
        },
      });

      return created;
    });

    return NextResponse.json(maintenance, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao registrar manutenção",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}