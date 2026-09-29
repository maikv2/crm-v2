import { prisma } from "@/lib/prisma";

/**
 * Cadastra no CRM os 10 produtos novos da planilha CATALOGO.xlsx
 * (27/09/2026), no mesmo padrao do sync anterior: preco de venda = preco do
 * site, custo da planilha, NCM estimado (a conferir com o contador), CEST em
 * branco, foto apontando pro site.
 *
 * Cabos HDMI (CB0007 a CB0011) vao direto no grupo "CABOS ATACADO", como
 * esta na planilha (so tem preco de atacado). Todos usam a mesma foto.
 *
 * Somente cria registros (nao altera nem apaga nada). Sem --apply roda em
 * modo simulacao.
 *   npx tsx scripts/sync-site-catalog-3.ts          (simula)
 *   npx tsx scripts/sync-site-catalog-3.ts --apply  (grava)
 */
const products = [
  { sku: "LX0001", name: "Lixa Elétrica para Pés BL-3331", category: "CUIDADOS", priceCents: 1990, costCents: 1050, ncm: "85437099" },
  { sku: "FRR014", name: "Pistola de Fixação Finca Pino com Maleta", category: "FERRAMENTAS", priceCents: 9990, costCents: 5500, ncm: "82055900" },
  { sku: "FRR015", name: "Esmerilhadeira Angular 1000W 115mm BOM-9412", category: "FERRAMENTAS", priceCents: 25990, costCents: 14500, ncm: "84672993" },
  { sku: "CC0007", name: "Fita de LED RGB 16 Cores 5m + Fonte + Controle", category: "CASA", priceCents: 4990, costCents: 2500, ncm: "94054200" },
  { sku: "CC0008", name: "Controle Remoto Copiador KA-1168", category: "CASA", priceCents: 1990, costCents: 800, ncm: "85269200" },
  { sku: "CB0007", name: "Cabo HDMI 1,5 Metros", category: "CABOS ATACADO", priceCents: 1200, costCents: 650, ncm: "85444200" },
  { sku: "CB0008", name: "Cabo HDMI 2 Metros", category: "CABOS ATACADO", priceCents: 1690, costCents: 830, ncm: "85444200" },
  { sku: "CB0009", name: "Cabo HDMI 3 Metros", category: "CABOS ATACADO", priceCents: 1990, costCents: 930, ncm: "85444200" },
  { sku: "CB0010", name: "Cabo HDMI 5 Metros", category: "CABOS ATACADO", priceCents: 2490, costCents: 1350, ncm: "85444200" },
  { sku: "CB0011", name: "Cabo HDMI 10 Metros", category: "CABOS ATACADO", priceCents: 4600, costCents: 2300, ncm: "85444200" },
];

async function main() {
  const apply = process.argv.includes("--apply");
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { sku: p.sku }, select: { id: true } });
    if (exists) {
      console.log("ja existe, pulando:", p.sku);
      continue;
    }
    console.log(`${apply ? "criando" : "[simulacao]"} ${p.sku} | ${p.name} | ${p.category} | R$ ${(p.priceCents / 100).toFixed(2)}`);
    if (!apply) continue;
    await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        priceCents: p.priceCents,
        sitePriceCents: p.priceCents,
        purchaseCostCents: p.costCents,
        ncm: p.ncm,
        cest: null,
        imageUrl: `https://v2distribuidora.com/produtos/${p.sku.toLowerCase()}/5.jpg`,
        active: true,
      },
    });
  }
  const total = await prisma.product.count({ where: { active: true } });
  console.log("total ativos no CRM:", total);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
