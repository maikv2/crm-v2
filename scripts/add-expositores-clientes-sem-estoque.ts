import { randomUUID } from "crypto";
import { ExhibitorType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DRY_RUN =
  process.argv.includes("--dry-run") || process.env.DRY_RUN === "1";

const KIT_ITEMS = [
  { sku: "CB001", quantity: 4, description: "cabos V8" },
  { sku: "CB002", quantity: 4, description: "cabos TC" },
  { sku: "CB003", quantity: 4, description: "cabos iOS" },
  { sku: "CR003", quantity: 3, description: "carregadores kit V8" },
  { sku: "CR004", quantity: 3, description: "carregadores kit TC" },
  { sku: "CR005", quantity: 3, description: "carregadores kit iOS" },
  { sku: "FN001", quantity: 4, description: "fones simples P2" },
  { sku: "FN004", quantity: 1, description: "fone Blue One" },
  { sku: "FN005", quantity: 1, description: "fone Blue Pro" },
];

function formatExhibitorCode(number: number) {
  return `EXP-${String(number).padStart(4, "0")}`;
}

async function getNextExhibitorCodeNumber() {
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
    const match = exhibitor.code?.match(/^EXP-(\d+)$/);
    if (!match) continue;

    const currentNumber = Number(match[1]);
    if (!Number.isNaN(currentNumber) && currentNumber > maxNumber) {
      maxNumber = currentNumber;
    }
  }

  return maxNumber + 1;
}

async function main() {
  const skus = KIT_ITEMS.map((item) => item.sku);

  const products = await prisma.product.findMany({
    where: {
      sku: { in: skus },
      active: true,
    },
    select: {
      id: true,
      sku: true,
      name: true,
    },
  });

  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const missingSkus = skus.filter((sku) => !productsBySku.has(sku));

  if (missingSkus.length > 0) {
    throw new Error(`Produtos não encontrados ou inativos: ${missingSkus.join(", ")}`);
  }

  const clients = await prisma.client.findMany({
    where: {
      active: true,
      exhibitors: {
        none: {
          removedAt: null,
        },
      },
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      tradeName: true,
      regionId: true,
      region: {
        select: {
          name: true,
        },
      },
    },
  });

  const kit = KIT_ITEMS.map((item) => {
    const product = productsBySku.get(item.sku);

    if (!product) {
      throw new Error(`Produto não encontrado no mapa interno: ${item.sku}`);
    }

    return {
      productId: product.id,
      sku: item.sku,
      productName: product.name,
      quantity: item.quantity,
      description: item.description,
    };
  });

  const initialStockNote = kit
    .map((item) => `${item.quantity}x ${item.sku}`)
    .join(", ");

  if (DRY_RUN) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          clientsWithoutExhibitor: clients.length,
          kit: kit.map(({ sku, productName, quantity }) => ({
            sku,
            productName,
            quantity,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  let nextCodeNumber = await getNextExhibitorCodeNumber();
  const created: Array<{ code: string; client: string; region: string | null }> =
    [];
  const skippedAlreadyHadExhibitor: Array<{ client: string; code: string | null }> =
    [];
  const skippedWithoutRegion: string[] = [];

  for (const client of clients) {
    const clientName = client.tradeName || client.name;

    const regionId = client.regionId;

    if (!regionId) {
      skippedWithoutRegion.push(clientName);
      continue;
    }

    const code = formatExhibitorCode(nextCodeNumber);
    const exhibitorId = randomUUID();
    let wasCreated = false;
    let existingCode: string | null = null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.exhibitor.findFirst({
        where: {
          clientId: client.id,
          removedAt: null,
        },
        select: {
          code: true,
        },
      });

      if (existing) {
        existingCode = existing.code;
        return;
      }

      await tx.exhibitor.create({
        data: {
          id: exhibitorId,
          code,
          clientId: client.id,
          regionId,
          installedAt: new Date(),
          status: "ACTIVE",
          type: ExhibitorType.ACRYLIC_CLOSED,
          model: "ACRILICO_FECHADO",
          name: `Acrílico fechado - ${clientName}`,
          notes:
            "Expositor criado por rotina de inclusão em massa. Não altera estoque geral.",
          initialStockNote: `Itens iniciais padrão: ${initialStockNote}. Não altera estoque geral.`,
          initialItems: {
            createMany: {
              data: kit.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
          stocks: {
            createMany: {
              data: kit.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
            },
          },
        },
      });

      wasCreated = true;
    });

    if (wasCreated) {
      created.push({
        code,
        client: clientName,
        region: client.region?.name ?? null,
      });
      nextCodeNumber += 1;
    } else {
      skippedAlreadyHadExhibitor.push({
        client: clientName,
        code: existingCode,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        createdCount: created.length,
        skippedAlreadyHadExhibitorCount: skippedAlreadyHadExhibitor.length,
        skippedWithoutRegionCount: skippedWithoutRegion.length,
        created,
        skippedAlreadyHadExhibitor,
        skippedWithoutRegion,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Erro:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
