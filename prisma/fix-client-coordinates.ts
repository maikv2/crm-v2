/**
 * Script de manutenção: popula latitude/longitude de clientes existentes
 * que ainda não têm coordenadas.
 *
 * Estratégia:
 *  - Pega todos os clientes ativos onde latitude OU longitude é null.
 *  - Aceita endereço parcial: basta city+state OU CEP.
 *  - Usa lib/geocoding.geocodeAddress (que faz múltiplos fallbacks).
 *  - Respeita o rate limit do Nominatim (1 req/s) com pausa de 1.2s.
 *  - Não toca em clientes já com coordenadas.
 *
 * Uso:
 *   npm run fix:client-coords
 */

import { prisma } from "../lib/prisma";
import { buildAddress, geocodeAddress } from "../lib/geocoding";

type Summary = {
  totalScanned: number;
  alreadyHadCoords: number;
  updated: number;
  noMatch: number;
  skippedNoAddress: number;
  errors: number;
};

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function hasMinimumAddress(client: {
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}) {
  const hasCityAndState =
    Boolean(normalizeText(client.city)) &&
    Boolean(normalizeText(client.state));
  const hasCep = Boolean(normalizeText(client.cep));
  return hasCityAndState || hasCep;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const summary: Summary = {
    totalScanned: 0,
    alreadyHadCoords: 0,
    updated: 0,
    noMatch: 0,
    skippedNoAddress: 0,
    errors: 0,
  };

  console.log("\n[fix:client-coords] Iniciando varredura de clientes...\n");

  const clients = await prisma.client.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      name: true,
      tradeName: true,
      street: true,
      number: true,
      district: true,
      city: true,
      state: true,
      cep: true,
      country: true,
      latitude: true,
      longitude: true,
      region: { select: { name: true } },
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  summary.totalScanned = clients.length;

  console.log(`Total de clientes ativos: ${clients.length}\n`);

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const displayName =
      client.tradeName ||
      client.name ||
      `cliente ${client.id.slice(0, 8)}`;

    if (
      typeof client.latitude === "number" &&
      typeof client.longitude === "number"
    ) {
      summary.alreadyHadCoords += 1;
      continue;
    }

    if (!hasMinimumAddress(client)) {
      summary.skippedNoAddress += 1;
      console.log(
        `  [SKIP]    ${displayName} — sem city/state nem CEP`
      );
      continue;
    }

    const fullAddress = buildAddress([
      client.street,
      client.number,
      client.district,
      client.city,
      client.state,
      client.cep,
      client.country || "Brasil",
    ]);

    try {
      const geocoded = await geocodeAddress(fullAddress);

      if (
        geocoded &&
        typeof geocoded.latitude === "number" &&
        typeof geocoded.longitude === "number"
      ) {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          },
        });

        summary.updated += 1;
        console.log(
          `  [UPDATE]  ${displayName} → ${geocoded.latitude.toFixed(4)}, ${geocoded.longitude.toFixed(4)}`
        );
        console.log(`            (${fullAddress})`);
      } else {
        summary.noMatch += 1;
        console.log(
          `  [NO_MATCH] ${displayName} — Nominatim não encontrou`
        );
        console.log(`             (${fullAddress})`);
      }
    } catch (error) {
      summary.errors += 1;
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`  [ERROR]   ${displayName}: ${message}`);
    }

    // Rate limit: Nominatim aceita ~1 req/s. 1.2s pra ter margem.
    if (i < clients.length - 1) {
      await sleep(1200);
    }
  }

  console.log("\n[fix:client-coords] Resumo:");
  console.log(`  Clientes verificados:           ${summary.totalScanned}`);
  console.log(`  Já tinham coordenadas:          ${summary.alreadyHadCoords}`);
  console.log(`  Coordenadas preenchidas agora:  ${summary.updated}`);
  console.log(`  Endereço não encontrado:        ${summary.noMatch}`);
  console.log(`  Pulados (sem city/state/CEP):   ${summary.skippedNoAddress}`);
  console.log(`  Erros de execução:              ${summary.errors}`);
  console.log("\n[fix:client-coords] Concluído.\n");
}

run()
  .catch((error) => {
    console.error("[fix:client-coords] Falha geral:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
