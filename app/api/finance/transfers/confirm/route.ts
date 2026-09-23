import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { TransferStatus } from "@prisma/client";

function normalizeIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const single = String(value || "").trim();
  return single ? [single] : [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.from(new Set(normalizeIds(body?.ids ?? body?.id)));

    if (!ids.length) {
      return NextResponse.json(
        { error: "Selecione pelo menos um repasse para confirmar." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const pending = await tx.cashTransfer.findMany({
        where: { id: { in: ids }, status: TransferStatus.PENDING },
        select: { id: true, amountCents: true },
      });

      if (pending.length !== ids.length) {
        throw new Error(
          "Um ou mais repasses selecionados não estão mais pendentes. Atualize a tela e tente novamente."
        );
      }

      const now = new Date();

      await tx.cashTransfer.updateMany({
        where: { id: { in: ids }, status: TransferStatus.PENDING },
        data: { status: TransferStatus.TRANSFERRED, transferredAt: now },
      });

      return {
        count: pending.length,
        totalCents: pending.reduce((sum, item) => sum + Number(item.amountCents || 0), 0),
        transferredAt: now,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);

    const message = error instanceof Error ? error.message : "Erro ao confirmar repasse";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}