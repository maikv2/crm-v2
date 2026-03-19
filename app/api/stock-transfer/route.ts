import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

type TransferItemInput = {
  productId: string;
  quantity: number;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fromLocationId = normalizeText(body.fromLocationId);
    const toLocationId = normalizeText(body.toLocationId);
    const note = normalizeText(body.note) || null;

    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];

    const items: TransferItemInput[] = rawItems
      .map((rawItem: unknown) => {
        const item = (rawItem ?? {}) as Record<string, unknown>;

        return {
          productId: normalizeText(item.productId),
          quantity: Number(item.quantity ?? 0),
        };
      })
      .filter((item: TransferItemInput) => item.productId && item.quantity > 0);

    if (!fromLocationId || !toLocationId || items.length === 0) {
      return NextResponse.json(
        { error: "Origem, destino e itens são obrigatórios." },
        { status: 400 }
      );
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json(
        { error: "Origem e destino não podem ser iguais." },
        { status: 400 }
      );
    }

    const [fromLocation, toLocation] = await Promise.all([
      prisma.stockLocation.findUnique({
        where: { id: fromLocationId },
        select: { id: true, name: true, active: true },
      }),
      prisma.stockLocation.findUnique({
        where: { id: toLocationId },
        select: { id: true, name: true, active: true },
      }),
    ]);

    if (!fromLocation) {
      return NextResponse.json(
        { error: "Local de origem não encontrado." },
        { status: 404 }
      );
    }

    if (!toLocation) {
      return NextResponse.json(
        { error: "Local de destino não encontrado." },
        { status: 404 }
      );
    }

    if (!fromLocation.active) {
      return NextResponse.json(
        { error: "O local de origem está inativo." },
        { status: 400 }
      );
    }

    if (!toLocation.active) {
      return NextResponse.json(
        { error: "O local de destino está inativo." },
        { status: 400 }
      );
    }

    const uniqueProductIds = Array.from(
      new Set(items.map((item: TransferItemInput) => item.productId))
    );

    const products = await prisma.product.findMany({
      where: {
        id: { in: uniqueProductIds },
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: "Existe produto inválido na transferência." },
          { status: 400 }
        );
      }

      if (product.active === false) {
        return NextResponse.json(
          { error: `O produto ${product.name} está inativo.` },
          { status: 400 }
        );
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: `Quantidade inválida para o produto ${product.name}.` },
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdMovements: Array<{
        productId: string;
        productName: string;
        quantity: number;
        outMovementId: string;
        inMovementId: string;
      }> = [];

      for (const item of items) {
        const product = productMap.get(item.productId)!;

        const fromBalance = await tx.stockBalance.findUnique({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId: fromLocationId,
            },
          },
          select: {
            id: true,
            quantity: true,
          },
        });

        const toBalance = await tx.stockBalance.findUnique({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId: toLocationId,
            },
          },
          select: {
            id: true,
            quantity: true,
          },
        });

        const currentFromQty = fromBalance?.quantity ?? 0;
        const currentToQty = toBalance?.quantity ?? 0;

        if (currentFromQty < item.quantity) {
          throw new Error(
            `Estoque insuficiente para ${product.name} em ${fromLocation.name}. Saldo atual: ${currentFromQty}.`
          );
        }

        const nextFromQty = currentFromQty - item.quantity;
        const nextToQty = currentToQty + item.quantity;

        const outMovement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId: fromLocationId,
            type: StockMovementType.TRANSFER_OUT,
            quantity: item.quantity,
            note,
          },
        });

        const inMovement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId: toLocationId,
            type: StockMovementType.TRANSFER_IN,
            quantity: item.quantity,
            note,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId: fromLocationId,
            },
          },
          create: {
            productId: item.productId,
            stockLocationId: fromLocationId,
            quantity: nextFromQty,
          },
          update: {
            quantity: nextFromQty,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId: toLocationId,
            },
          },
          create: {
            productId: item.productId,
            stockLocationId: toLocationId,
            quantity: nextToQty,
          },
          update: {
            quantity: nextToQty,
          },
        });

        createdMovements.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          outMovementId: outMovement.id,
          inMovementId: inMovement.id,
        });
      }

      return createdMovements;
    });

    return NextResponse.json({
      success: true,
      items: result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Erro ao transferir estoque.",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}