/**
 * Script de manutenção: vincula automaticamente um StockLocation a cada
 * Region que esteja sem `stockLocationId`.
 *
 * Regras:
 *  - Procura um StockLocation com o mesmo nome da região (case-insensitive).
 *  - Se não existir, cria um novo StockLocation com o nome da região.
 *  - Se existir mas estiver inativo, reativa.
 *  - Atualiza a Region com o stockLocationId resolvido.
 *
 * Uso:
 *   npm run fix:region-stock
 */

import { prisma } from "../lib/prisma";

type Summary = {
  totalRegionsScanned: number;
  alreadyLinked: number;
  linkedExistingStock: number;
  reactivatedStock: number;
  createdNewStock: number;
  skippedNoName: number;
  errors: { regionId: string; regionName: string | null; message: string }[];
};

async function run() {
  const summary: Summary = {
    totalRegionsScanned: 0,
    alreadyLinked: 0,
    linkedExistingStock: 0,
    reactivatedStock: 0,
    createdNewStock: 0,
    skippedNoName: 0,
    errors: [],
  };

  console.log("\n[fix:region-stock] Iniciando varredura de regiões...\n");

  const regions = await prisma.region.findMany({
    select: {
      id: true,
      name: true,
      stockLocationId: true,
    },
    orderBy: { name: "asc" },
  });

  summary.totalRegionsScanned = regions.length;

  for (const region of regions) {
    if (region.stockLocationId) {
      summary.alreadyLinked += 1;
      console.log(
        `  [OK]      Região "${region.name}" já tem estoque vinculado.`
      );
      continue;
    }

    const trimmedName = (region.name ?? "").trim();

    if (!trimmedName) {
      summary.skippedNoName += 1;
      console.warn(
        `  [SKIP]    Região ${region.id} sem nome — pulando.`
      );
      continue;
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        let stockLocation = await tx.stockLocation.findFirst({
          where: {
            name: {
              equals: trimmedName,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
            active: true,
          },
        });

        let action: "created" | "reactivated" | "linked-existing";

        if (!stockLocation) {
          stockLocation = await tx.stockLocation.create({
            data: {
              name: trimmedName,
              active: true,
            },
            select: {
              id: true,
              name: true,
              active: true,
            },
          });
          action = "created";
        } else if (!stockLocation.active) {
          stockLocation = await tx.stockLocation.update({
            where: { id: stockLocation.id },
            data: { active: true },
            select: {
              id: true,
              name: true,
              active: true,
            },
          });
          action = "reactivated";
        } else {
          action = "linked-existing";
        }

        await tx.region.update({
          where: { id: region.id },
          data: { stockLocationId: stockLocation.id },
        });

        return { stockLocation, action };
      });

      if (result.action === "created") {
        summary.createdNewStock += 1;
        console.log(
          `  [CREATE]  Região "${region.name}" → estoque "${result.stockLocation.name}" criado e vinculado.`
        );
      } else if (result.action === "reactivated") {
        summary.reactivatedStock += 1;
        console.log(
          `  [REACT]   Região "${region.name}" → estoque "${result.stockLocation.name}" reativado e vinculado.`
        );
      } else {
        summary.linkedExistingStock += 1;
        console.log(
          `  [LINK]    Região "${region.name}" → estoque existente "${result.stockLocation.name}" vinculado.`
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      summary.errors.push({
        regionId: region.id,
        regionName: region.name,
        message,
      });
      console.error(
        `  [ERROR]   Região "${region.name}" (${region.id}): ${message}`
      );
    }
  }

  console.log("\n[fix:region-stock] Resumo:");
  console.log(`  Regiões verificadas:                  ${summary.totalRegionsScanned}`);
  console.log(`  Já estavam com estoque vinculado:     ${summary.alreadyLinked}`);
  console.log(`  Vinculadas a estoque existente:       ${summary.linkedExistingStock}`);
  console.log(`  Estoque inativo reativado e vinculado:${summary.reactivatedStock}`);
  console.log(`  Estoque novo criado e vinculado:      ${summary.createdNewStock}`);
  console.log(`  Puladas (sem nome):                   ${summary.skippedNoName}`);
  console.log(`  Erros:                                ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    console.log("\nDetalhe dos erros:");
    for (const err of summary.errors) {
      console.log(
        `  - ${err.regionName ?? "(sem nome)"} [${err.regionId}]: ${err.message}`
      );
    }
  }

  console.log("\n[fix:region-stock] Concluído.\n");
}

run()
  .catch((error) => {
    console.error("[fix:region-stock] Falha geral:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
