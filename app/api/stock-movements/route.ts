import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = String(body.productId ?? "").trim();
    const stockLocationId = String(body.stockLocationId ?? "").trim();
    const type = String(body.type ?? "").trim() as StockMovementType;
    const quantity = Number(body.quantity ?? 0);
    const note = body.note ? String(body.note).trim() : null;

    if (!productId || !stockLocationId || !type || quantity <= 0) {
      return NextResponse.json(
        { error: "productId, stockLocationId, type e quantity são obrigatórios" },
        { status: 400 }
      );
    }

    if (!Object.values(StockMovementType).includes(type)) {
      return NextResponse.json(
        { error: "Tipo de movimentação inválido." },
        { status: 400 }
      );
    }

    const [product, stockLocation] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, active: true },
      }),
      prisma.stockLocation.findUnique({
        where: { id: stockLocationId },
        select: { id: true, name: true, active: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    if (!stockLocation) {
      return NextResponse.json(
        { error: "Local de estoque não encontrado." },
        { status: 404 }
      );
    }

    if (stockLocation.active === false) {
      return NextResponse.json(
        { error: "O local de estoque informado está inativo." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentBalance = await tx.stockBalance.findUnique({
        where: {
          productId_stockLocationId: {
            productId,
            stockLocationId,
          },
        },
        select: {
          id: true,
          quantity: true,
        },
      });

      const currentQty = currentBalance?.quantity ?? 0;

      let nextQty = currentQty;

      if (type === StockMovementType.IN || type === StockMovementType.TRANSFER_IN) {
        nextQty = currentQty + quantity;
      } else if (
        type === StockMovementType.OUT ||
        type === StockMovementType.TRANSFER_OUT
      ) {
        nextQty = currentQty - quantity;

        if (nextQty < 0) {
          throw new Error(
            `Estoque insuficiente em ${stockLocation.name}. Saldo atual: ${currentQty}.`
          );
        }
      } else if (type === StockMovementType.ADJUSTMENT) {
        nextQty = quantity;
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          stockLocationId,
          type,
          quantity,
          note,
        },
      });

      await tx.stockBalance.upsert({
        where: {
          productId_stockLocationId: {
            productId,
            stockLocationId,
          },
        },
        create: {
          productId,
          stockLocationId,
          quantity: nextQty,
        },
        update: {
          quantity: nextQty,
        },
      });

      return movement;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao criar movimentação",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}