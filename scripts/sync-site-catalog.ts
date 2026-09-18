import { prisma } from "@/lib/prisma";
import * as fs from "fs";

/**
 * Sincroniza o catalogo do site (v2-storefront) com o CRM:
 *  - Produtos que ja existem no CRM (por nome): so ajusta o SKU pro formato
 *    do site e grava o preco de atacado (sitePriceCents). Preco de
 *    consignacao, NCM, CEST e custo continuam como estao.
 *  - Produtos que so existem no site: cadastra no CRM com NCM estimado
 *    (a conferir com o contador) e custo da planilha CATALOGO.xlsx quando
 *    disponivel.
 *
 * Gerado a partir de scripts/plano-catalogo-crm.xlsx (revisado antes de rodar).
 */

const plan = JSON.parse(
  fs.readFileSync(
    "C:/Users/eumai/AppData/Local/Temp/claude/C--Users-eumai-v2-crm/09d14d0b-3a36-4cff-ab49-4c9ace9911ab/scratchpad/plan.json",
    "utf-8"
  )
);

function toTitleCase(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((w: string) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function main() {
  let updated = 0;
  for (const u of plan.updates) {
    await prisma.product.update({
      where: { id: u.crm.id },
      data: {
        sku: u.site.sku,
        sitePriceCents: u.site.priceCents,
      },
    });
    updated++;
  }
  console.log(`Atualizados: ${updated}`);

  let created = 0;
  for (const i of plan.inserts) {
    await prisma.product.create({
      data: {
        sku: i.sku,
        name: toTitleCase(i.name),
        category: i.category,
        priceCents: i.priceCents,
        sitePriceCents: i.priceCents,
        purchaseCostCents: i.costCents ?? 0,
        ncm: i.ncm ?? null,
        cest: i.cest ?? null,
        active: true,
      },
    });
    created++;
  }
  console.log(`Criados: ${created}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
