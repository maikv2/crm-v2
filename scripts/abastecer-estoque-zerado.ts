// Acrescenta +1000 pecas em todo produto ativo, em cada local de estoque ativo
// (matriz + regioes): zerado vira 1000, quem ja tem soma 1000 ao saldo atual.
//
// Lanca uma entrada (StockMovement IN) e atualiza o StockBalance na mesma
// transacao, igual a tela de entrada de estoque, pra que o saldo continue
// batendo se alguem rodar o rebuild-stock-balance.
//
// Uso:
//   npx tsx scripts/abastecer-estoque-zerado.ts          -> so simula (nao grava)
//   npx tsx scripts/abastecer-estoque-zerado.ts --apply  -> grava no banco

import "dotenv/config";
import { PrismaClient, StockMovementType } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_QTY = 1000;
const NOTE = "Abastecimento automatico: +1000 pecas";
const APPLY = process.argv.includes("--apply");

async function main() {
  const [locations, products, balances] = await Promise.all([
    prisma.stockLocation.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        regions: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, name: true },
      orderBy: { sku: "asc" },
    }),
    prisma.stockBalance.findMany({
      select: { productId: true, stockLocationId: true, quantity: true },
    }),
  ]);

  const balanceMap = new Map<string, number>();
  for (const b of balances) {
    balanceMap.set(`${b.productId}_${b.stockLocationId}`, b.quantity);
  }

  type Entry = {
    productId: string;
    sku: string;
    stockLocationId: string;
    locationName: string;
    current: number;
    add: number;
  };

  const entries: Entry[] = [];

  for (const location of locations) {
    for (const product of products) {
      const current = balanceMap.get(`${product.id}_${location.id}`) ?? 0;

      entries.push({
        productId: product.id,
        sku: product.sku,
        stockLocationId: location.id,
        locationName: location.name,
        current,
        add: TARGET_QTY,
      });
    }
  }

  console.log(`Modo: ${APPLY ? "GRAVAR NO BANCO" : "SIMULACAO (nada sera gravado)"}`);
  console.log(`Produtos ativos: ${products.length}`);
  console.log(`Locais de estoque ativos: ${locations.length}`);
  console.log("");

  for (const location of locations) {
    const items = entries.filter((e) => e.stockLocationId === location.id);
    const regions = location.regions.map((r) => r.name).join(", ") || "sem regiao vinculada";
    const negatives = items.filter((e) => e.current < 0);
    const withStock = items.filter((e) => e.current > 0).length;

    console.log(
      `- ${location.name} (${regions}): ${items.length} produto(s), ${withStock} ja com estoque` +
        (negatives.length
          ? ` | ${negatives.length} com saldo negativo: ${negatives
              .map((e) => `${e.sku}=${e.current}`)
              .join(", ")}`
          : "")
    );
  }

  console.log("");
  console.log(`Total de lancamentos: ${entries.length}`);

  if (!APPLY) {
    console.log("\nSimulacao concluida. Rode com --apply para gravar.");
    return;
  }

  const CHUNK = 50;
  let done = 0;

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);

    await prisma.$transaction(
      async (tx) => {
        for (const e of chunk) {
          await tx.stockMovement.create({
            data: {
              productId: e.productId,
              stockLocationId: e.stockLocationId,
              type: StockMovementType.IN,
              quantity: e.add,
              note: NOTE,
            },
          });

          await tx.stockBalance.upsert({
            where: {
              productId_stockLocationId: {
                productId: e.productId,
                stockLocationId: e.stockLocationId,
              },
            },
            create: {
              productId: e.productId,
              stockLocationId: e.stockLocationId,
              quantity: e.add,
            },
            update: {
              quantity: { increment: e.add },
            },
          });
        }
      },
      { timeout: 60000, maxWait: 10000 }
    );

    done += chunk.length;
    console.log(`Gravados ${done}/${entries.length}`);
  }

  console.log("\nConcluido.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
