import { prisma } from "../lib/prisma";

async function main() {
  const matriz = await prisma.stockLocation.findFirst({
    where: { name: "Matriz V2" },
  });

  const chapeco = await prisma.stockLocation.findFirst({
    where: { name: "Chapecó" },
  });

  const joinville = await prisma.stockLocation.findFirst({
    where: { name: "Joinville" },
  });

  if (!matriz || !chapeco || !joinville) {
    throw new Error("Um ou mais locais de estoque não foram encontrados");
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  for (const product of products) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: matriz.id,
        type: "TRANSFER_OUT",
        quantity: 20,
        note: "Transferência inicial para Chapecó",
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: chapeco.id,
        type: "TRANSFER_IN",
        quantity: 20,
        note: "Transferência inicial recebida da Matriz",
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: matriz.id,
        type: "TRANSFER_OUT",
        quantity: 15,
        note: "Transferência inicial para Joinville",
      },
    });

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: joinville.id,
        type: "TRANSFER_IN",
        quantity: 15,
        note: "Transferência inicial recebida da Matriz",
      },
    });
  }

  console.log("Transferências iniciais concluídas!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());