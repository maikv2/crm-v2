import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_RESET !== "YES") {
    console.log("");
    console.log("⚠️  RESET BLOQUEADO");
    console.log(
      'Para executar, rode com CONFIRM_RESET=YES no comando.'
    );
    console.log("");
    process.exit(1);
  }

  console.log("");
  console.log("⚠️  INICIANDO RESET DE REGIÕES + INVESTIDORES");
  console.log("Isso vai apagar dados vinculados a regiões e investidores.");
  console.log("");

  // Soltar vínculos de usuários com regiões
  await prisma.user.updateMany({
    where: {
      regionId: { not: null },
    },
    data: {
      regionId: null,
    },
  });

  // =========================
  // MÓDULO INVESTIDORES
  // =========================

  await prisma.investorDistribution.deleteMany();

  await prisma.financeTransaction.deleteMany({
    where: {
      OR: [
        { investorId: { not: null } },
        { regionId: { not: null } },
        { orderId: { not: null } },
      ],
    },
  });

  await prisma.share.deleteMany();

  await prisma.investor.deleteMany();

  // =========================
  // MÓDULO REGIÕES / OPERAÇÃO
  // =========================

  await prisma.cashTransfer.deleteMany();
  await prisma.receipt.deleteMany();

  await prisma.accountsReceivableInstallment.deleteMany();
  await prisma.accountsReceivable.deleteMany();

  await prisma.stockMovement.deleteMany();
  await prisma.visit.deleteMany();

  await prisma.exhibitorMaintenance.deleteMany();
  await prisma.exhibitorInitialItem.deleteMany();

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  await prisma.clientOtherContact.deleteMany();
  await prisma.exhibitor.deleteMany();
  await prisma.client.deleteMany();

  await prisma.representativeCommission.deleteMany();
  await prisma.representativeSettlement.deleteMany();

  await prisma.regionMonthlyResult.deleteMany();

  await prisma.region.deleteMany();

  console.log("");
  console.log("✅ RESET CONCLUÍDO COM SUCESSO");
  console.log("Regiões, investidores e vínculos relacionados foram zerados.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ ERRO AO EXECUTAR RESET");
    console.error(error);
    console.error("");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
