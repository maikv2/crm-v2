import { prisma } from "../lib/prisma";
import { StockMovementType } from "@prisma/client";

async function rebuildStockBalances() {
  console.log("Recalculando saldos de estoque...");

  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      productId: true,
      stockLocationId: true,
      quantity: true,
      type: true,
    },
  });

  const map = new Map<string, number>();

  for (const m of movements) {
    const key = `${m.productId}_${m.stockLocationId}`;

    const prev = map.get(key) ?? 0;

    let next = prev;

    if (
      m.type === StockMovementType.IN ||
      m.type === StockMovementType.TRANSFER_IN
    ) {
      next += m.quantity;
    }

    if (
      m.type === StockMovementType.OUT ||
      m.type === StockMovementType.TRANSFER_OUT
    ) {
      next -= m.quantity;
    }

    if (m.type === StockMovementType.ADJUSTMENT) {
      next += m.quantity;
    }

    map.set(key, next);
  }

  console.log("Atualizando stockBalance...");

  for (const [key, quantity] of map.entries()) {
    const [productId, stockLocationId] = key.split("_");

    await prisma.stockBalance.upsert({
      where: {
        productId_stockLocationId: {
          productId,
          stockLocationId,
        },
      },
      update: {
        quantity,
      },
      create: {
        productId,
        stockLocationId,
        quantity,
      },
    });
  }

  console.log("✔ Estoque reconstruído com sucesso.");
}

rebuildStockBalances()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });