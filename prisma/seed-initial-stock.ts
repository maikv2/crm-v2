import { prisma } from "../lib/prisma";

async function main() {
  const matriz = await prisma.stockLocation.findFirst({
    where: { name: "Matriz V2" },
  });

  if (!matriz) {
    throw new Error("Matriz V2 não encontrada");
  }

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  for (const product of products) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: matriz.id,
        type: "IN",
        quantity: 100,
        note: "Estoque inicial na matriz",
      },
    });
  }

  console.log("Estoque inicial lançado na Matriz V2!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());