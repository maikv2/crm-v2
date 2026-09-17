// Atualiza retroativamente a "última visita" de clientes/expositores com
// base nos pedidos já lançados no mês (padrão: mês atual) — mesma regra que
// passou a rodar automaticamente pra pedidos novos.
//
// Só avança a data (nunca regride): se o cliente/expositor já tem uma visita
// registrada mais recente que a data do pedido, não mexe. Só mexe em
// `lastVisitAt` (e `nextVisitAt` do expositor) — nenhum outro campo, nenhuma
// linha é apagada.
//
// Roda em modo dry-run por padrão e grava backup em JSON antes de aplicar.
//
// Uso:
//   npx tsx scripts/atualizar-ultima-visita-mes-atual.ts                 (dry-run, mês atual)
//   npx tsx scripts/atualizar-ultima-visita-mes-atual.ts --apply         (aplica, mês atual)
//   npx tsx scripts/atualizar-ultima-visita-mes-atual.ts --month=9 --year=2026 --apply
import { PrismaClient, OrderType } from "@prisma/client";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main() {
  const { apply, month, year } = parseArgs();

  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(year, month, 1, 0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      issuedAt: { gte: periodStart, lt: periodEnd },
      type: { in: [OrderType.SALE, OrderType.DEFECT_EXCHANGE] },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      number: true,
      issuedAt: true,
      clientId: true,
      exhibitorId: true,
      client: { select: { name: true, lastVisitAt: true } },
    },
    orderBy: { issuedAt: "asc" },
  });

  if (orders.length === 0) {
    console.log(`Nenhum pedido encontrado em ${String(month).padStart(2, "0")}/${year}.`);
    return;
  }

  // Última data de pedido por cliente e por expositor (o mais recente do mês).
  const latestByClient = new Map<string, { date: Date; clientName: string }>();
  const latestByExhibitor = new Map<string, Date>();

  for (const order of orders) {
    const current = latestByClient.get(order.clientId);
    if (!current || order.issuedAt > current.date) {
      latestByClient.set(order.clientId, {
        date: order.issuedAt,
        clientName: order.client.name,
      });
    }

    if (order.exhibitorId) {
      const currentExhibitor = latestByExhibitor.get(order.exhibitorId);
      if (!currentExhibitor || order.issuedAt > currentExhibitor) {
        latestByExhibitor.set(order.exhibitorId, order.issuedAt);
      }
    }
  }

  const clientIds = [...latestByClient.keys()];
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, name: true, lastVisitAt: true },
  });
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const exhibitorIds = [...latestByExhibitor.keys()];
  const exhibitors = await prisma.exhibitor.findMany({
    where: { id: { in: exhibitorIds } },
    select: { id: true, name: true, code: true, lastVisitAt: true, nextVisitAt: true },
  });
  const exhibitorMap = new Map(exhibitors.map((e) => [e.id, e]));

  const clientChanges = clientIds
    .map((id) => {
      const client = clientMap.get(id);
      const latest = latestByClient.get(id)!;
      if (!client) return null;
      const needsUpdate = !client.lastVisitAt || client.lastVisitAt < latest.date;
      return needsUpdate ? { id, name: client.name, from: client.lastVisitAt, to: latest.date } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const exhibitorChanges = exhibitorIds
    .map((id) => {
      const exhibitor = exhibitorMap.get(id);
      const latestDate = latestByExhibitor.get(id)!;
      if (!exhibitor) return null;
      const needsUpdate = !exhibitor.lastVisitAt || exhibitor.lastVisitAt < latestDate;
      return needsUpdate
        ? {
            id,
            label: exhibitor.name || exhibitor.code || id,
            from: exhibitor.lastVisitAt,
            to: latestDate,
            nextVisitAt: addDays(latestDate, 45),
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  console.log(
    `Período ${String(month).padStart(2, "0")}/${year}: ${orders.length} pedido(s), ` +
      `${clientChanges.length} cliente(s) e ${exhibitorChanges.length} expositor(es) a atualizar.\n`
  );

  for (const change of clientChanges) {
    console.log(
      `Cliente: ${change.name} | última visita: ${change.from ? change.from.toLocaleDateString("pt-BR") : "(nunca)"} -> ${change.to.toLocaleDateString("pt-BR")}`
    );
  }

  for (const change of exhibitorChanges) {
    console.log(
      `Expositor: ${change.label} | última visita: ${change.from ? change.from.toLocaleDateString("pt-BR") : "(nunca)"} -> ${change.to.toLocaleDateString("pt-BR")} | próxima: ${change.nextVisitAt.toLocaleDateString("pt-BR")}`
    );
  }

  if (clientChanges.length === 0 && exhibitorChanges.length === 0) {
    console.log("Nada a atualizar — todo mundo já está com a última visita em dia.");
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
    `last-visit-backup_${year}-${String(month).padStart(2, "0")}_${Date.now()}.json`
  );
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        clients: clientChanges.map((c) => ({ clientId: c.id, lastVisitAt: c.from })),
        exhibitors: exhibitorChanges.map((e) => ({
          exhibitorId: e.id,
          lastVisitAt: e.from,
        })),
      },
      null,
      2
    )
  );
  console.log(`\nBackup salvo em: ${backupPath}`);

  await prisma.$transaction([
    ...clientChanges.map((change) =>
      prisma.client.update({
        where: { id: change.id },
        data: { lastVisitAt: change.to },
      })
    ),
    ...exhibitorChanges.map((change) =>
      prisma.exhibitor.update({
        where: { id: change.id },
        data: { lastVisitAt: change.to, nextVisitAt: change.nextVisitAt },
      })
    ),
  ]);

  console.log(
    `\n${clientChanges.length} cliente(s) e ${exhibitorChanges.length} expositor(es) atualizado(s) com sucesso.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
