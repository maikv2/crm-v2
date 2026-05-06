import { StockMovementType } from "@prisma/client";
import { prisma } from "../lib/prisma";

const updates = [
  { name: "cabo de dados v8", quantity: 69 },
  { name: "cabo de dados tc", quantity: 28 },
  { name: "cabo de dados ios", quantity: 18 },
  { name: "Carregador fonte tomada", quantity: 15 },
  { name: "Carregador fonte veicular", quantity: 43 },
  { name: "Kit Carregador v8", quantity: 34 },
  { name: "Kit Carregador tc", quantity: 35 },
  { name: "Kit Carregador ios", quantity: 8 },
  { name: "fone de ouvido p2", quantity: 57 },
  { name: "fone de ouvido tc", quantity: 7 },
  { name: "fone de ouvido ios", quantity: 5 },
  { name: "Fone Bluetooth blue one", quantity: 9 },
  { name: "Fone Bluetooth blue pro", quantity: 8 },
];

async function main() {
  const region = await prisma.region.findFirst({
    where: {
      name: {
        equals: "Oeste_SC_Chapecó",
        mode: "insensitive",
      },
    },
    include: {
      stockLocation: true,
    },
  });

  if (!region?.stockLocationId) {
    throw new Error("Região Oeste_SC_Chapecó não encontrada ou sem estoque vinculado");
  }

  for (const item of updates) {
    const product = await prisma.product.findFirst({
      where: {
        name: {
          equals: item.name,
          mode: "insensitive",
        },
      },
    });

    if (!product) {
      throw new Error(`Produto não encontrado: ${item.name}`);
    }

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        stockLocationId: region.stockLocationId,
        type: StockMovementType.ADJUSTMENT,
        quantity: item.quantity,
        note: "Ajuste manual estoque região Oeste",
      },
    });

    await prisma.stockBalance.upsert({
      where: {
        productId_stockLocationId: {
          productId: product.id,
          stockLocationId: region.stockLocationId,
        },
      },
      update: {
        quantity: item.quantity,
      },
      create: {
        productId: product.id,
        stockLocationId: region.stockLocationId,
        quantity: item.quantity,
      },
    });
  }

  console.log("Estoque da região Oeste atualizado com sucesso.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());