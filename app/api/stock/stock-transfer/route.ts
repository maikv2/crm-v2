import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = String(body.productId ?? "").trim();
    const fromLocationId = String(body.fromLocationId ?? "").trim();
    const toLocationId = String(body.toLocationId ?? "").trim();
    const quantity = Number(body.quantity ?? 0);
    const note = body.note ? String(body.note).trim() : null;

    if (!productId || !fromLocationId || !toLocationId || quantity <= 0) {
      return NextResponse.json(
        { error: "productId, fromLocationId, toLocationId e quantity são obrigatórios" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Origem e destino não podem ser iguais" },
        { status: 400 }
      );
    }

    const movements = await prisma.$transaction(async (tx) => {
      const outMovement = await tx.stockMovement.create({
        data: {
          productId,
          stockLocationId: fromLocationId,
          type: "TRANSFER_OUT",
          quantity,
          note: note || "Transferência de estoque",
        },
      });

      const inMovement = await tx.stockMovement.create({
        data: {
          productId,
          stockLocationId: toLocationId,
          type: "TRANSFER_IN",
          quantity,
          note: note || "Transferência de estoque",
        },
      });

      return { outMovement, inMovement };
    });

    return NextResponse.json(movements, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao transferir estoque", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}