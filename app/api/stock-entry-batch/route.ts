import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

type ItemInput = {
  productId: string;
  quantity: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const stockLocationId = String(body.stockLocationId ?? "").trim();
    const note = body.note ? String(body.note).trim() : null;
    const items: ItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!stockLocationId) {
      return NextResponse.json(
        { error: "stockLocationId é obrigatório." },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Adicione pelo menos um produto." },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { error: "Cada item precisa de productId e quantity > 0." },
          { status: 400 }
        );
      }
    }

    const stockLocation = await prisma.stockLocation.findUnique({
      where: { id: stockLocationId },
      select: { id: true, name: true, active: true },
    });

    if (!stockLocation) {
      return NextResponse.json(
        { error: "Local de estoque não encontrado." },
        { status: 404 }
      );
    }

    if (!stockLocation.active) {
      return NextResponse.json(
        { error: "O local de estoque está inativo." },
        { status: 400 }
      );
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, active: true },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Um ou mais produtos não foram encontrados." },
        { status: 404 }
      );
    }

    const inactiveProduct = products.find((p) => !p.active);
    if (inactiveProduct) {
      return NextResponse.json(
        { error: `O produto "${inactiveProduct.name}" está inativo.` },
        { status: 400 }
      );
    }

    const movements = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of items) {
        const qty = Math.floor(Number(item.quantity));

        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId,
            type: StockMovementType.IN,
            quantity: qty,
            note,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId,
            },
          },
          create: {
            productId: item.productId,
            stockLocationId,
            quantity: qty,
          },
          update: {
            quantity: { increment: qty },
          },
        });

        results.push(movement);
      }

      return results;
    });

    return NextResponse.json(
      { ok: true, count: movements.length, movements },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao registrar entradas de estoque.", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
