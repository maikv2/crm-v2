import { prisma } from "@/lib/prisma";

/**
 * Cria no CRM a versao "atacado" dos cabos, carregadores, fones, fones
 * bluetooth e fontes que tem preco de site (atacado) diferente do preco de
 * expositor. O produto original fica como esta (preco de expositor e SKU
 * usado pelo site); a copia vai para a categoria "<CATEGORIA> ATACADO" com
 * priceCents = sitePriceCents do original, pra poder tirar pedido de atacado
 * pelo sistema escolhendo o grupo de atacado.
 *
 * Somente cria registros (nao altera nem apaga nada). Sem --apply roda em
 * modo simulacao.
 *   npx tsx scripts/create-wholesale-products.ts          (simula)
 *   npx tsx scripts/create-wholesale-products.ts --apply  (grava)
 */

const CATEGORY_MAP: Record<string, string> = {
  CABOS: "CABOS ATACADO",
  CARREGADORES: "CARREGADORES ATACADO",
  FONES: "FONES ATACADO",
  "FONES BLUETOOTHS": "FONES BLUETOOTH ATACADO",
  FONTES: "FONTES ATACADO",
};

const SKU_SUFFIX = "-AT";

async function main() {
  const apply = process.argv.includes("--apply");

  const originals = await prisma.product.findMany({
    where: { active: true, category: { in: Object.keys(CATEGORY_MAP) } },
    orderBy: [{ category: "asc" }, { sku: "asc" }],
  });

  // So os que tem preco de atacado diferente do preco de expositor.
  const candidates = originals.filter(
    (p) => p.sitePriceCents != null && p.sitePriceCents !== p.priceCents
  );

  for (const p of candidates) {
    const sku = `${p.sku}${SKU_SUFFIX}`;
    const category = CATEGORY_MAP[p.category];
    const exists = await prisma.product.findFirst({ where: { sku }, select: { id: true } });
    if (exists) {
      console.log("ja existe, pulando:", sku);
      continue;
    }
    console.log(
      `${apply ? "criando" : "[simulacao]"} ${sku} | ${p.name} | ${category} | ` +
        `R$ ${(p.sitePriceCents! / 100).toFixed(2)} (expositor R$ ${(p.priceCents / 100).toFixed(2)})`
    );
    if (!apply) continue;

    await prisma.product.create({
      data: {
        sku,
        name: p.name,
        category,
        active: true,
        priceCents: p.sitePriceCents!,
        sitePriceCents: p.sitePriceCents,
        commissionCents: p.commissionCents,
        ncm: p.ncm,
        cest: p.cest,
        origem: p.origem,
        cfop: p.cfop,
        cst: p.cst,
        icmsRate: p.icmsRate,
        commercialUnit: p.commercialUnit,
        imageUrl: p.imageUrl,
        purchaseCostCents: p.purchaseCostCents,
        extraCostCents: p.extraCostCents,
        freightCostCents: p.freightCostCents,
        packagingCostCents: p.packagingCostCents,
        taxCostCents: p.taxCostCents,
      },
    });
  }

  console.log(`${candidates.length} produto(s) ${apply ? "processados" : "seriam criados"}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
