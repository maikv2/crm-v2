import { prisma } from "@/lib/prisma";

/**
 * Cadastra no CRM a GF0003 (Garrafa Termica Infantil Lata Stitch 500 ml), que
 * estava na planilha CATALOGO.xlsx mas ficou de fora do CRM e do site.
 * Preco e custo da planilha; NCM e CEST copiados da GF0005 (garrafa infantil
 * 500 ml). Foto apontando pro site (so tem a foto 1 por enquanto).
 *
 * Somente cria o registro (nao altera nem apaga nada). Sem --apply roda em
 * modo simulacao.
 *   npx tsx scripts/sync-site-catalog-4.ts          (simula)
 *   npx tsx scripts/sync-site-catalog-4.ts --apply  (grava)
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const exists = await prisma.product.findFirst({ where: { sku: "GF0003" }, select: { id: true } });
  if (exists) {
    console.log("ja existe, pulando: GF0003");
    return;
  }
  const ref = await prisma.product.findFirst({ where: { sku: "GF0005" }, select: { ncm: true, cest: true } });
  const data = {
    sku: "GF0003",
    name: "Garrafa Térmica Infantil Lata Stitch 500 Ml",
    category: "GARRAFAS",
    priceCents: 4990,
    sitePriceCents: 4990,
    purchaseCostCents: 2600,
    ncm: ref?.ncm ?? null,
    cest: ref?.cest ?? null,
    imageUrl: "https://v2distribuidora.com/produtos/gf0003/1.jpg",
    active: true,
  };
  console.log(`${apply ? "criando" : "[simulacao]"}`, data);
  if (!apply) return;
  await prisma.product.create({ data });
  console.log("total ativos no CRM:", await prisma.product.count({ where: { active: true } }));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
