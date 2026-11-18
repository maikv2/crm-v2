import { prisma } from "@/lib/prisma";

/**
 * Cadastra no CRM os 7 produtos novos marcados em amarelo na planilha
 * CATALOGO.xlsx (19/09/2026), no mesmo padrao do sync anterior:
 * preco de venda = preco do site, custo da planilha, NCM estimado (a
 * conferir com o contador), CEST em branco.
 */
const products = [
  { sku: "CC0006", name: "Lava Jato Portátil 48V", category: "CASA", priceCents: 15990, costCents: 8000, ncm: "84243090" },
  { sku: "BR0017", name: "Bonecos Super Ninjas", category: "BRINQUEDOS", priceCents: 1000, costCents: 550, ncm: "95030080" },
  { sku: "BR0018", name: "Carrinhos Sport", category: "BRINQUEDOS", priceCents: 1290, costCents: 750, ncm: "95030080" },
  { sku: "BR0019", name: "Asas com LED e Movimento", category: "BRINQUEDOS", priceCents: 6990, costCents: 3500, ncm: "95030080" },
  // Livro infantil de colorir: imune (CSOSN 300, sem ICMS) - conferir com o contador.
  { sku: "BR0020", name: "Livro para Colorir - Bobbie Goods", category: "BRINQUEDOS", priceCents: 990, costCents: 500, ncm: "49030000", cst: "300", icmsRate: 0 },
  { sku: "BR0021", name: "Lousa Mágica com Estojo", category: "BRINQUEDOS", priceCents: 1990, costCents: 1099, ncm: "95030080" },
  { sku: "VEI0003", name: "Protetor Solar de Parabrisas", category: "CARRO", priceCents: 2290, costCents: 1299, ncm: "39269090" },
];

async function main() {
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { sku: p.sku }, select: { id: true } });
    if (exists) {
      console.log("ja existe, pulando:", p.sku);
      continue;
    }
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
        active: true,
        ...(p.cst ? { cst: p.cst } : {}),
        ...(p.icmsRate !== undefined ? { icmsRate: p.icmsRate } : {}),
      },
    });
    console.log("criado:", p.sku, p.name);
  }
  const total = await prisma.product.count({ where: { active: true } });
  console.log("total ativos no CRM:", total);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
