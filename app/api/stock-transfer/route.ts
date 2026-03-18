import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = String(body.productId ?? "");
    const fromLocationId = String(body.fromLocationId ?? "");
    const toLocationId = String(body.toLocationId ?? "");
    const quantity = Number(body.quantity ?? 0);
    const note = body.note ?? null;

    if (!productId || !fromLocationId || !toLocationId || quantity <= 0) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Origem e destino não podem ser iguais" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {

      await tx.stockMovement.create({
        data: {
          productId,
          stockLocationId: fromLocationId,
          type: "TRANSFER_OUT",
          quantity,
          note
        }
      });

      await tx.stockMovement.create({
        data: {
          productId,
          stockLocationId: toLocationId,
          type: "TRANSFER_IN",
          quantity,
          note
        }
      });

    });

    return NextResponse.json({ success: true });

  } catch (error:any) {

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );

  }
}