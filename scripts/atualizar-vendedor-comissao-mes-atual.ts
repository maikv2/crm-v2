// Atualiza retroativamente as vendas do mês (padrão: mês atual) pra regra
// nova: vendedor único (Maiquiel) + comissão fixa de 16% sobre o total do
// pedido. Só mexe em `sellerId` e `commissionTotalCents` — nenhum outro
// campo, nenhuma linha é apagada.
//
// Por segurança, roda em modo "dry-run" por padrão (só mostra o que mudaria).
// Antes de aplicar de verdade, grava um backup em JSON com o estado atual de
// cada pedido afetado, pra poder reverter se precisar.
//
// Uso:
//   npx tsx scripts/atualizar-vendedor-comissao-mes-atual.ts                 (dry-run, mês atual)
//   npx tsx scripts/atualizar-vendedor-comissao-mes-atual.ts --apply         (aplica, mês atual)
//   npx tsx scripts/atualizar-vendedor-comissao-mes-atual.ts --month=9 --year=2026 --apply
import { PrismaClient, UserRole } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const SELLER_COMMISSION_RATE_BPS = 1600;
function calculateSellerCommissionCents(totalCents: number) {
  return Math.round((Math.max(0, totalCents) * SELLER_COMMISSION_RATE_BPS) / 10000);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const monthArg = args.find((a) => a.startsWith("--month="));
  const yearArg = args.find((a) => a.startsWith("--year="));
  const now = new Date();
  const month = monthArg ? Number(monthArg.split("=")[1]) : now.getMonth() + 1;
  const year = yearArg ? Number(yearArg.split("=")[1]) : now.getFullYear();
  return { apply, month, year };
}

async function main() {
  const { apply, month, year } = parseArgs();

  const maiquiel = await prisma.user.findFirst({
    where: { role: UserRole.REPRESENTATIVE, name: { contains: "Maiquiel", mode: "insensitive" } },
  });

  if (!maiquiel) {
    console.error("Não encontrei nenhum representante com o nome 'Maiquiel'. Cadastre-o antes de rodar este script.");
    process.exitCode = 1;
    return;
  }

  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(year, month, 1, 0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      issuedAt: { gte: periodStart, lt: periodEnd },
      type: { in: ["SALE", "DEFECT_EXCHANGE"] },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      totalCents: true,
      sellerId: true,
      commissionTotalCents: true,
      type: true,
      client: { select: { name: true } },
      seller: { select: { name: true } },
    },
    orderBy: { number: "asc" },
  });

  if (orders.length === 0) {
    console.log(`Nenhum pedido de venda encontrado em ${String(month).padStart(2, "0")}/${year}.`);
    return;
  }

  const changes = orders
    .map((order) => {
      const newCommissionCents = calculateSellerCommissionCents(order.totalCents);
      const willChange =
        order.sellerId !== maiquiel.id || order.commissionTotalCents !== newCommissionCents;

      return { order, newCommissionCents, willChange };
    })
    .filter((item) => item.willChange);

  console.log(
    `Período ${String(month).padStart(2, "0")}/${year}: ${orders.length} pedido(s) encontrados, ${changes.length} precisam de ajuste.\n`
  );

  for (const { order, newCommissionCents } of changes) {
    const oldSellerLabel = order.seller?.name ?? "(sem vendedor)";
    console.log(
      `PED-${String(order.number).padStart(4, "0")} | ${order.client.name} | ` +
        `vendedor: ${oldSellerLabel} -> Maiquiel | ` +
        `comissão: R$ ${(order.commissionTotalCents / 100).toFixed(2)} -> R$ ${(newCommissionCents / 100).toFixed(2)}`
    );
  }

  if (changes.length === 0) {
    console.log("Nada a atualizar — todos os pedidos do período já estão na regra nova.");
    return;
  }

  if (!apply) {
    console.log(`\nModo dry-run (nada foi alterado). Pra aplicar de verdade, rode com --apply.`);
    return;
  }

  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `orders-seller-commission-backup_${year}-${String(month).padStart(2, "0")}_${Date.now()}.json`
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      changes.map(({ order }) => ({
        orderId: order.id,
        number: order.number,
        sellerId: order.sellerId,
        commissionTotalCents: order.commissionTotalCents,
      })),
      null,
      2
    )
  );
  console.log(`\nBackup salvo em: ${backupPath}`);

  await prisma.$transaction(
    changes.map(({ order, newCommissionCents }) =>
      prisma.order.update({
        where: { id: order.id },
        data: {
          sellerId: maiquiel.id,
          commissionTotalCents: newCommissionCents,
        },
      })
    )
  );

  console.log(`\n${changes.length} pedido(s) atualizado(s) com sucesso.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
