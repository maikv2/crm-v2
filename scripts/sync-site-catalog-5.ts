import { prisma } from "@/lib/prisma";

/**
 * Cadastra no CRM os 9 produtos novos da planilha CATALOGO.xlsx
 * (30/09/2026), no mesmo padrao do sync anterior: preco de venda = preco do
 * site, custo da planilha, NCM estimado (a conferir com o contador), CEST em
 * branco, foto de capa apontando pro site.
 *
 * Farois de bike (BK0001 e BK0002) entram no grupo novo "BICICLETA", como
 * esta na planilha. A TV Box (CC0010) so tem 4 fotos, capa e a 4.
 *
 * Somente cria registros (nao altera nem apaga nada). Sem --apply roda em
 * modo simulacao.
 *   npx tsx scripts/sync-site-catalog-5.ts          (simula)
 *   npx tsx scripts/sync-site-catalog-5.ts --apply  (grava)
 */
const products = [
  { sku: "SP0009", name: "Suporte de Peito para Celular S79", category: "SUPORTES", priceCents: 2990, costCents: 1350, ncm: "39269090", cover: 5 },
  { sku: "MS0004", name: "Massageador Elétrico Profissional F1830", category: "CUIDADOS", priceCents: 19290, costCents: 11200, ncm: "90191000", cover: 5 },
  { sku: "FRR016", name: "Ferro de Solda 60W Profissional", category: "FERRAMENTAS", priceCents: 2990, costCents: 1550, ncm: "85151100", cover: 5 },
  { sku: "CC0009", name: "Descascador Picador Elétrico S189", category: "CASA", priceCents: 8990, costCents: 5300, ncm: "85094050", cover: 5 },
  { sku: "CC0010", name: "TV Box BRTV Smart TV V15 Total", category: "CASA", priceCents: 38990, costCents: 28800, ncm: "85287190", cover: 4 },
  { sku: "BR0022", name: "Cavalinho Upa Upa Grande H124", category: "BRINQUEDOS", priceCents: 7990, costCents: 4000, ncm: "95030080", cover: 5 },
  { sku: "BR0023", name: "Bolinha Spinner Giratória", category: "BRINQUEDOS", priceCents: 3990, costCents: 2000, ncm: "95030080", cover: 5 },
  { sku: "BK0001", name: "Farol para Bikes LED Vermelho X146", category: "BICICLETA", priceCents: 2990, costCents: 1480, ncm: "85121000", cover: 5 },
  { sku: "BK0002", name: "Farol para Bikes LEDs X145 Luz Branca", category: "BICICLETA", priceCents: 2990, costCents: 1480, ncm: "85121000", cover: 5 },
];

async function main() {
  const apply = process.argv.includes("--apply");
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { sku: p.sku }, select: { id: true } });
    if (exists) {
      console.log("ja existe, pulando:", p.sku);
      continue;
    }
    console.log(`${apply ? "criando" : "[simulacao]"} ${p.sku} | ${p.name} | ${p.category} | R$ ${(p.priceCents / 100).toFixed(2)} | custo R$ ${(p.costCents / 100).toFixed(2)} | NCM ${p.ncm}`);
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
        imageUrl: `https://v2distribuidora.com/produtos/${p.sku.toLowerCase()}/${p.cover}.jpg`,
        active: true,
      },
    });
  }
  const total = await prisma.product.count({ where: { active: true } });
  console.log("total ativos no CRM:", total);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
