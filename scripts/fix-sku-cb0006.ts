import { prisma } from "@/lib/prisma";

/**
 * Corrige o SKU do Cabo de Energia Bipolar no CRM: estava "CB006" (faltando
 * um zero), o site usa "CB0006". So troca o SKU, nada mais.
 * Sem --apply roda em modo simulacao.
 *   npx tsx scripts/fix-sku-cb0006.ts          (simula)
 *   npx tsx scripts/fix-sku-cb0006.ts --apply  (grava)
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const conflict = await prisma.product.findFirst({ where: { sku: "CB0006" }, select: { id: true } });
  if (conflict) throw new Error("ja existe produto com SKU CB0006, nada feito");
  const rows = await prisma.product.findMany({ where: { sku: "CB006" }, select: { id: true, name: true } });
  if (rows.length !== 1) throw new Error(`esperava 1 produto com SKU CB006, achei ${rows.length}`);
  console.log(`${apply ? "corrigindo" : "[simulacao]"} ${rows[0].name}: CB006 -> CB0006`);
  if (!apply) return;
  await prisma.product.update({ where: { id: rows[0].id }, data: { sku: "CB0006" } });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
