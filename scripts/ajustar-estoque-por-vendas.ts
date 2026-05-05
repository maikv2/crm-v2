import { PrismaClient, StockMovementType } from "@prisma/client";

const prisma = new PrismaClient();

const STOCK_LOCATION_ID = "b0307a56-ba6e-47b4-a719-035cc592f3f9";

const ORDER_NUMBERS = [
  2, 3, 4, 5, 6, 11, 14, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
];

const INITIAL_STOCK: Record<string, number> = {
  CB001: 92,
  CB002: 101,
  CB003: 90,
  CR001: 51,
  CR003: 52,
  CR004: 90,
  CR005: 54,
  FN001: 84,
  FN004: 11,
  FN005: 20,
};

async function main() {
  await prisma.$transaction(async (tx) => {
    const orders = await tx.order.findMany({
      where: {
        number: { in: ORDER_NUMBERS },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const soldBySku: Record<string, number> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const sku = item.product.sku;
        soldBySku[sku] = (soldBySku[sku] ?? 0) + item.qty;
      }
    }

    console.log("Resumo de vendas encontradas:");
    console.log(soldBySku);

    for (const [sku, initialQty] of Object.entries(INITIAL_STOCK)) {
      const product = await tx.product.findFirst({
        where: { sku },
      });

      if (!product) {
        console.log(`Produto não encontrado: ${sku}`);
        continue;
      }

      const soldQty = soldBySku[sku] ?? 0;
      const finalQty = initialQty - soldQty;

      await tx.stockBalance.upsert({
        where: {
          productId_stockLocationId: {
            productId: product.id,
            stockLocationId: STOCK_LOCATION_ID,
          },
        },
        update: {
          quantity: finalQty,
        },
        create: {
          productId: product.id,
          stockLocationId: STOCK_LOCATION_ID,
          quantity: finalQty,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          stockLocationId: STOCK_LOCATION_ID,
          type: StockMovementType.ADJUSTMENT,
          quantity: finalQty,
          note: `Ajuste manual pós-importação. Estoque inicial ${initialQty}, vendido ${soldQty}, saldo final ${finalQty}.`,
        },
      });

      console.log(`${sku}: inicial ${initialQty} - vendido ${soldQty} = saldo ${finalQty}`);
    }
  });

  console.log("Ajuste de estoque finalizado com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());