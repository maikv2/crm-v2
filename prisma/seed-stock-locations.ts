import { prisma } from "../lib/prisma";

async function main() {

  const locations = [
    { name: "Matriz V2" },
    { name: "Chapecó" },
    { name: "Joinville" }
  ];

  for (const loc of locations) {
    await prisma.stockLocation.upsert({
      where: { name: loc.name },
      update: {},
      create: {
        name: loc.name
      }
    });
  }

  console.log("Locais de estoque criados!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());