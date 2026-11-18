import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaClient, OrderType } from "@prisma/client";

// Somente leitura: exporta vendas e despesas de setembro/2026 (horario de Brasilia) em JSON.
const prisma = new PrismaClient();

const FROM = new Date("2026-09-01T00:00:00.000-03:00");
const TO = new Date("2026-10-01T00:00:00.000-03:00");

async function main() {
  const out = process.argv[2];
  if (!out) throw new Error("Informe o caminho do JSON de saida");

  const orders = await prisma.order.findMany({
    where: { issuedAt: { gte: FROM, lt: TO }, type: OrderType.SALE },
    include: {
      client: { select: { name: true, cnpj: true, cpf: true } },
      region: { select: { name: true } },
      seller: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { issuedAt: "asc" },
  });

  // Despesa entra se a competencia for 09/2026, ou (sem competencia) se foi lancada em setembro.
  const expenses = await prisma.financeTransaction.findMany({
    where: {
      type: "EXPENSE",
      OR: [
        { competenceMonth: 9, competenceYear: 2026 },
        { competenceMonth: null, createdAt: { gte: FROM, lt: TO } },
      ],
    },
    include: {
      region: { select: { name: true } },
      investor: { select: { name: true } },
      commissionConfirmations: { select: { weekStart: true, weekEnd: true, amountCents: true, pendingCents: true, metadata: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Distribuicoes a investidor referenciadas nas notas ("investor_payment_request:monthly:<id>").
  const distributionIds = expenses
    .map((e) => e.notes?.match(/investor_payment_request:monthly:([0-9a-f-]{36})/)?.[1])
    .filter((id): id is string => Boolean(id));
  const distributions = await prisma.investorDistribution.findMany({
    where: { id: { in: distributionIds } },
    include: { regionMonthlyResult: true },
  });

  await writeFile(out, JSON.stringify({ orders, expenses, distributions }, null, 2));
  console.log(`pedidos=${orders.length} despesas=${expenses.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
