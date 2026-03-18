require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Região (cria se não existir)
  const region = await prisma.region.upsert({
    where: { name: "Joinville" },
    update: {},
    create: { name: "Joinville", targetClients: 600 },
  });

  // 2) Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@v2.com" },
    update: { name: "Vilmar Vieira", role: "ADMIN", regionId: region.id },
    create: {
      name: "Vilmar Vieira",
      email: "admin@v2.com",
      role: "ADMIN",
      regionId: region.id,
    },
  });

  // 3) Produtos básicos
  const products = [
    { sku: "CABO-V8", name: "Cabo Micro USB V8", category: "cabo", commissionCents: 100 },
    { sku: "CABO-TYPEC", name: "Cabo Type-C", category: "cabo", commissionCents: 100 },
    { sku: "CABO-IOS", name: "Cabo iPhone (Lightning)", category: "cabo", commissionCents: 100 },
    { sku: "CARREG-V8", name: "Carregador V8", category: "carregador", commissionCents: 150 },
    { sku: "CARREG-TYPEC", name: "Carregador Type-C", category: "carregador", commissionCents: 150 },
    { sku: "CARREG-IOS", name: "Carregador iPhone", category: "carregador", commissionCents: 150 },
    { sku: "FONE-P2", name: "Fone com fio P2", category: "fone", commissionCents: 200 },
    { sku: "FONE-BT", name: "Fone Bluetooth", category: "fone", commissionCents: 300 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { name: p.name, category: p.category, commissionCents: p.commissionCents, active: true },
      create: p,
    });
  }

  console.log("✅ Seed completo!");
  console.log({ region, admin, products: products.length });
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });