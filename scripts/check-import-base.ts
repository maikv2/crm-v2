import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const region = await prisma.region.findFirst({
    where: {
      OR: [
        { name: "Oeste_SC_Chapecó" },
        { name: "Oeste de Chapecó" },
        { name: { contains: "Chapecó", mode: "insensitive" } },
      ],
    },
  });

  const representative = await prisma.user.findFirst({
    where: {
      role: "REPRESENTATIVE",
      name: { contains: "Branco", mode: "insensitive" },
    },
  });

  const products = await prisma.product.findMany({
    where: {
      sku: { in: ["CB002", "CR004"] },
    },
    select: {
      id: true,
      sku: true,
      name: true,
      priceCents: true,
      commissionCents: true,
    },
  });

  console.log({
    region,
    representative,
    products,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });