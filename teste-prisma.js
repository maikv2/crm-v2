const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const regions = await prisma.region.findMany();
  console.log("Regions:", regions);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });