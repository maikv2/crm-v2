import { PrismaClient, ExhibitorType } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";

const ORDER_NUMBERS = [
  2, 3, 4, 5, 6, 11, 14, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
];

const ITEMS = [
  { sku: "CB001", qty: 4 }, // Cabo de dados V8
  { sku: "CB002", qty: 4 }, // Cabo de dados TC
  { sku: "CB003", qty: 4 }, // Cabo de dados iOS
  { sku: "CR003", qty: 3 }, // Kit carregador V8
  { sku: "CR004", qty: 3 }, // Kit carregador TC
  { sku: "FN001", qty: 4 }, // Fone de ouvido P2
];

async function main() {
  console.log("Criando expositores acrílico fechado...");

  const orders = await prisma.order.findMany({
    where: {
      number: { in: ORDER_NUMBERS },
    },
    include: {
      client: true,
    },
    orderBy: {
      number: "asc",
    },
  });

  const products = await prisma.product.findMany({
    where: {
      sku: { in: ITEMS.map((item) => item.sku) },
    },
  });

  const getProduct = (sku: string) => {
    const product = products.find((p) => p.sku === sku);

    if (!product) {
      throw new Error(`Produto não encontrado: ${sku}`);
    }

    return product;
  };

  for (const order of orders) {
    const existing = await prisma.exhibitor.findFirst({
      where: {
        clientId: order.clientId,
        regionId: REGION_ID,
        removedAt: null,
      },
    });

    if (existing) {
      console.log(`Já existe expositor ativo para ${order.client.name}. Pulando.`);
      continue;
    }

    const exhibitor = await prisma.exhibitor.create({
      data: {
        clientId: order.clientId,
        regionId: REGION_ID,
        installedAt: order.createdAt,
        status: "ACTIVE",
        type: ExhibitorType.ACRYLIC_CLOSED,
        model: "ACRILICO_FECHADO",
        name: `Acrílico fechado - ${order.client.name}`,
        notes: `Expositor acrílico fechado criado por importação manual com base no pedido ${order.number}. Não altera estoque geral.`,
        initialStockNote:
          "Itens iniciais padrão: 4x CB001, 4x CB002, 4x CB003, 3x CR003, 3x CR004, 4x FN001.",
      },
    });

    for (const item of ITEMS) {
      const product = getProduct(item.sku);

      await prisma.exhibitorInitialItem.upsert({
        where: {
          exhibitorId_productId: {
            exhibitorId: exhibitor.id,
            productId: product.id,
          },
        },
        update: {
          quantity: item.qty,
        },
        create: {
          exhibitorId: exhibitor.id,
          productId: product.id,
          quantity: item.qty,
        },
      });

      await prisma.exhibitorStock.upsert({
        where: {
          exhibitorId_productId: {
            exhibitorId: exhibitor.id,
            productId: product.id,
          },
        },
        update: {
          quantity: item.qty,
        },
        create: {
          exhibitorId: exhibitor.id,
          productId: product.id,
          quantity: item.qty,
        },
      });
    }

    console.log(`Expositor acrílico fechado criado para ${order.client.name} - pedido ${order.number}`);
  }

  console.log("Finalizado.");
}

main()
  .catch((e) => {
    console.error("Erro:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());