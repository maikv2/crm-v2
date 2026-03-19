import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeName(value) {
  return String(value ?? "").trim();
}

async function main() {
  const regions = await prisma.region.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      active: true,
      stockLocationId: true,
    },
  });

  let createdCount = 0;
  let linkedCount = 0;
  let representativeSyncCount = 0;

  for (const region of regions) {
    const regionName = normalizeName(region.name);

    if (!regionName) continue;

    let stockLocation = null;

    if (region.stockLocationId) {
      stockLocation = await prisma.stockLocation.findUnique({
        where: { id: region.stockLocationId },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });
    }

    if (!stockLocation) {
      stockLocation = await prisma.stockLocation.findFirst({
        where: {
          name: {
            equals: regionName,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });
    }

    if (!stockLocation) {
      stockLocation = await prisma.stockLocation.create({
        data: {
          name: regionName,
          active: true,
        },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });

      createdCount += 1;
      console.log(`Estoque criado para região: ${regionName}`);
    } else if (!stockLocation.active) {
      stockLocation = await prisma.stockLocation.update({
        where: { id: stockLocation.id },
        data: { active: true },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });
    }

    if (region.stockLocationId !== stockLocation.id) {
      await prisma.region.update({
        where: { id: region.id },
        data: {
          stockLocationId: stockLocation.id,
        },
      });

      linkedCount += 1;
      console.log(`Região vinculada ao estoque: ${regionName} -> ${stockLocation.name}`);
    }

    const repResult = await prisma.user.updateMany({
      where: {
        role: "REPRESENTATIVE",
        regionId: region.id,
      },
      data: {
        stockLocationId: stockLocation.id,
      },
    });

    representativeSyncCount += repResult.count;
  }

  console.log("");
  console.log("Processo concluído.");
  console.log(`Estoques criados: ${createdCount}`);
  console.log(`Regiões vinculadas/corrigidas: ${linkedCount}`);
  console.log(`Representantes sincronizados: ${representativeSyncCount}`);
}

main()
  .catch((error) => {
    console.error("Erro ao vincular regiões aos estoques:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });