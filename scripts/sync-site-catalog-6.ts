import { prisma } from "@/lib/prisma";

/**
 * Cadastra no CRM os 21 produtos novos da planilha CATALOGO.xlsx (grifados
 * em amarelo, 02/10/2026), no mesmo padrao do sync anterior: preco de venda
 * = preco do site, custo da planilha, NCM estimado (a conferir com o
 * contador), CEST em branco, foto de capa apontando pro site.
 *
 * Cabos de rede (CB0012 a CB0017) vao no grupo "CABOS ATACADO", como esta na
 * planilha. Grupos novos: "CARTAO DE MEMORIA" e "TECNOLOGIA".
 *
 * Somente cria registros (nao altera nem apaga nada). Sem --apply roda em
 * modo simulacao.
 *   npx tsx scripts/sync-site-catalog-6.ts          (simula)
 *   npx tsx scripts/sync-site-catalog-6.ts --apply  (grava)
 */
const products = [
  { sku: "LT0011", name: "Lanterna LED Portátil com Pilha X900 Quad Core P90", category: "LANTERNAS", priceCents: 11990, costCents: 6000, ncm: "85131010" },
  { sku: "LT0012", name: "Lanterna de Cabeça T6 com Pilhas Potente", category: "LANTERNAS", priceCents: 4990, costCents: 2500, ncm: "85131010" },
  { sku: "NBL0001", name: "Inalador Nebulizador Portátil F96", category: "CUIDADOS", priceCents: 3990, costCents: 1750, ncm: "90192020" },
  { sku: "BLA0001", name: "Balança Digital Bioimpedância", category: "CUIDADOS", priceCents: 4990, costCents: 2600, ncm: "84231000" },
  { sku: "CC0011", name: "Luminária de Leitura Flexível L199", category: "CASA", priceCents: 2990, costCents: 1400, ncm: "94052100" },
  { sku: "BR0024", name: "Skate Elétrico Vyron 25V 4000mAh com Controle", category: "BRINQUEDOS", priceCents: 159990, costCents: 138000, ncm: "95069900" },
  { sku: "VEI0004", name: "Inversor Veicular 1500W 12V/24V para 110V/220V", category: "CARRO", priceCents: 8990, costCents: 3500, ncm: "85044090" },
  { sku: "CB0012", name: "Cabo de Rede 3 Metros", category: "CABOS ATACADO", priceCents: 1200, costCents: 330, ncm: "85444200" },
  { sku: "CB0013", name: "Cabo de Rede 5 Metros", category: "CABOS ATACADO", priceCents: 1600, costCents: 430, ncm: "85444200" },
  { sku: "CB0014", name: "Cabo de Rede 10 Metros", category: "CABOS ATACADO", priceCents: 1990, costCents: 830, ncm: "85444200" },
  { sku: "CB0015", name: "Cabo de Rede 15 Metros", category: "CABOS ATACADO", priceCents: 2290, costCents: 1050, ncm: "85444200" },
  { sku: "CB0016", name: "Cabo de Rede 20 Metros", category: "CABOS ATACADO", priceCents: 2990, costCents: 1350, ncm: "85444200" },
  { sku: "CB0017", name: "Cabo de Rede 30 Metros", category: "CABOS ATACADO", priceCents: 3990, costCents: 1900, ncm: "85444200" },
  { sku: "CDM0001", name: "Cartão de Memória Micro SD 8GB", category: "CARTAO DE MEMORIA", priceCents: 2990, costCents: 1600, ncm: "85235110" },
  { sku: "CDM0002", name: "Cartão de Memória Micro SD 16GB", category: "CARTAO DE MEMORIA", priceCents: 4990, costCents: 2550, ncm: "85235110" },
  { sku: "CDM0003", name: "Cartão de Memória Micro SD 32GB", category: "CARTAO DE MEMORIA", priceCents: 9290, costCents: 6300, ncm: "85235110" },
  { sku: "CDM0004", name: "Cartão de Memória Micro SD 64GB", category: "CARTAO DE MEMORIA", priceCents: 11990, costCents: 5800, ncm: "85235110" },
  { sku: "CDM0005", name: "Cartão de Memória Micro SD 128GB", category: "CARTAO DE MEMORIA", priceCents: 19290, costCents: 12000, ncm: "85235110" },
  { sku: "CDM0006", name: "Cartão de Memória Micro SD 256GB", category: "CARTAO DE MEMORIA", priceCents: 32990, costCents: 24000, ncm: "85235110" },
  { sku: "CDM0007", name: "Cartão de Memória Micro SD 512GB", category: "CARTAO DE MEMORIA", priceCents: 86990, costCents: 52000, ncm: "85235110" },
  { sku: "TRD0001", name: "Tradutor Instantâneo Portátil", category: "TECNOLOGIA", priceCents: 48990, costCents: 37300, ncm: "85437099" },
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
        imageUrl: `https://v2distribuidora.com/produtos/${p.sku.toLowerCase()}/5.jpg`,
        active: true,
      },
    });
  }
  const total = await prisma.product.count({ where: { active: true } });
  console.log("total ativos no CRM:", total);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
