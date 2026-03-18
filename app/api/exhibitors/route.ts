import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExhibitorType, StockMovementType } from "@prisma/client";

type InitialItemInput = {
  productId: string;
  quantity: number;
};

async function generateNextExhibitorCode() {
  const exhibitors = await prisma.exhibitor.findMany({
    where: {
      code: {
        not: null,
        startsWith: "EXP-",
      },
    },
    select: {
      code: true,
    },
  });

  let maxNumber = 0;

  for (const exhibitor of exhibitors) {
    const code = exhibitor.code ?? "";
    const match = code.match(/^EXP-(\d+)$/);

    if (!match) continue;

    const currentNumber = Number(match[1]);
    if (!Number.isNaN(currentNumber) && currentNumber > maxNumber) {
      maxNumber = currentNumber;
    }
  }

  const nextNumber = maxNumber + 1;
  return `EXP-${String(nextNumber).padStart(4, "0")}`;
}

function normalizeExhibitorType(value: unknown): ExhibitorType | null {
  if (typeof value !== "string" || !value.trim()) return null;

  return Object.values(ExhibitorType).includes(value as ExhibitorType)
    ? (value as ExhibitorType)
    : null;
}

async function getAvailableStockByProduct(
  stockLocationId: string,
  productIds: string[]
) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      stockLocationId,
      productId: { in: productIds },
    },
    select: {
      productId: true,
      type: true,
      quantity: true,
    },
  });

  const balances = new Map<string, number>();

  for (const productId of productIds) {
    balances.set(productId, 0);
  }

  for (const movement of movements) {
    const current = balances.get(movement.productId) ?? 0;
    const qty = movement.quantity ?? 0;

    if (
      movement.type === StockMovementType.IN ||
      movement.type === StockMovementType.TRANSFER_IN
    ) {
      balances.set(movement.productId, current + qty);
    } else if (
      movement.type === StockMovementType.OUT ||
      movement.type === StockMovementType.TRANSFER_OUT
    ) {
      balances.set(movement.productId, current - qty);
    } else if (movement.type === StockMovementType.ADJUSTMENT) {
      balances.set(movement.productId, qty);
    }
  }

  return balances;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const regionId = searchParams.get("regionId")?.trim() || undefined;

    const exhibitors = await prisma.exhibitor.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(regionId ? { regionId } : {}),
      },
      orderBy: [{ installedAt: "desc" }],
      select: {
        id: true,
        code: true,
        name: true,
        model: true,
        status: true,
        type: true,
        installedAt: true,
        nextVisitAt: true,
        lastVisitAt: true,
        client: {
          select: {
            id: true,
            name: true,
            tradeName: true,
          },
        },
        region: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      exhibitors.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        model: item.model,
        status: item.status,
        type: item.type,
        installedAt: item.installedAt,
        nextVisitAt: item.nextVisitAt,
        lastVisitAt: item.lastVisitAt,
        client: {
          id: item.client.id,
          name: item.client.tradeName || item.client.name,
        },
        region: {
          id: item.region.id,
          name: item.region.name,
        },
      }))
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao carregar expositores",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const regionId = body.regionId as string | undefined;
    const clientId = body.clientId as string | undefined;
    const type = normalizeExhibitorType(body.type);

    const initialStockNote =
      (body.initialStockNote as string | undefined) ?? null;

    const installedAt = body.installedAt
      ? new Date(body.installedAt)
      : new Date();

    const nextVisitAt = body.nextVisitAt ? new Date(body.nextVisitAt) : null;

    const rawInitialItems = Array.isArray(body.initialItems)
      ? (body.initialItems as InitialItemInput[])
      : [];

    if (!regionId || !clientId) {
      return NextResponse.json(
        { error: "regionId e clientId são obrigatórios" },
        { status: 400 }
      );
    }

    const [client, region] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: {
          id: true,
          regionId: true,
          name: true,
          tradeName: true,
        },
      }),
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          stockLocationId: true,
        },
      }),
    ]);

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada" },
        { status: 404 }
      );
    }

    if (!region.stockLocationId) {
      return NextResponse.json(
        { error: "A região não possui local de estoque vinculado." },
        { status: 400 }
      );
    }

    if (client.regionId && client.regionId !== regionId) {
      return NextResponse.json(
        { error: "O cliente informado não pertence à região selecionada." },
        { status: 400 }
      );
    }

    const cleanItems = rawInitialItems
      .filter((item) => item?.productId && Number(item?.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

    const productIds = [...new Set(cleanItems.map((item) => item.productId))];

    if (productIds.length > 0) {
      const foundProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: { id: true },
      });

      const foundIds = new Set(foundProducts.map((p) => p.id));
      const invalidIds = productIds.filter((id) => !foundIds.has(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: "Um ou mais produtos não existem",
            invalidProductIds: invalidIds,
          },
          { status: 400 }
        );
      }

      const requestedByProduct = new Map<string, number>();

      for (const item of cleanItems) {
        requestedByProduct.set(
          item.productId,
          (requestedByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const availableByProduct = await getAvailableStockByProduct(
        region.stockLocationId,
        [...requestedByProduct.keys()]
      );

      const insufficient: any[] = [];

      for (const [productId, requested] of requestedByProduct.entries()) {
        const available = availableByProduct.get(productId) ?? 0;

        if (requested > available) {
          insufficient.push({
            productId,
            requested,
            available,
          });
        }
      }

      if (insufficient.length > 0) {
        return NextResponse.json(
          {
            error:
              "O estoque da região é insuficiente para lançar o estoque inicial do expositor.",
            insufficient,
          },
          { status: 400 }
        );
      }
    }

    let newCode = await generateNextExhibitorCode();

    const exhibitor = await prisma.$transaction(async (tx) => {
      const createdExhibitor = await tx.exhibitor.create({
        data: {
          code: newCode,
          regionId,
          clientId,
          type,
          installedAt,
          nextVisitAt,
          initialStockNote,
          initialItems: {
            create: cleanItems,
          },
        },
      });

      if (cleanItems.length > 0) {
        for (const item of cleanItems) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              stockLocationId: region.stockLocationId!,
              exhibitorId: createdExhibitor.id,
              type: StockMovementType.OUT,
              quantity: item.quantity,
              note: `Abastecimento inicial do expositor ${createdExhibitor.code}`,
            },
          });

          await tx.exhibitorStock.upsert({
            where: {
              exhibitorId_productId: {
                exhibitorId: createdExhibitor.id,
                productId: item.productId,
              },
            },
            create: {
              exhibitorId: createdExhibitor.id,
              productId: item.productId,
              quantity: item.quantity,
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      return tx.exhibitor.findUnique({
        where: { id: createdExhibitor.id },
        include: {
          client: true,
          region: true,
          stocks: true,
        },
      });
    });

    return NextResponse.json(exhibitor, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao criar expositor",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}