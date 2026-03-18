import { prisma } from "../lib/prisma";

async function main() {
  const chapecoRegion = await prisma.region.findFirst({
    where: { name: "Chapecó" },
  });

  const joinvilleRegion = await prisma.region.findFirst({
    where: { name: "Joinville" },
  });

  const chapecoStock = await prisma.stockLocation.findFirst({
    where: { name: "Chapecó" },
  });

  const joinvilleStock = await prisma.stockLocation.findFirst({
    where: { name: "Joinville" },
  });

  if (!chapecoRegion || !joinvilleRegion || !chapecoStock || !joinvilleStock) {
    throw new Error("Regiões ou estoques não encontrados");
  }

  await prisma.region.update({
    where: { id: chapecoRegion.id },
    data: { stockLocationId: chapecoStock.id },
  });

  await prisma.region.update({
    where: { id: joinvilleRegion.id },
    data: { stockLocationId: joinvilleStock.id },
  });

  console.log("Regiões ligadas aos estoques com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());