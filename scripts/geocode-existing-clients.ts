import { prisma } from "../lib/prisma";
import { buildAddress, geocodeAddress } from "../lib/geocoding";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function hasCompleteAddress(client: {
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}) {
  return Boolean(
    normalizeText(client.street) &&
      normalizeText(client.number) &&
      normalizeText(client.district) &&
      normalizeText(client.city) &&
      normalizeText(client.state) &&
      normalizeText(client.cep)
  );
}

async function main() {
  console.log("Iniciando geocodificação dos clientes existentes...\n");

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
      region: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { city: "asc" },
      { name: "asc" },
    ],
  });

  let updatedCount = 0;
  let alreadyOkCount = 0;
  let incompleteCount = 0;
  let failedCount = 0;

  for (const client of clients) {
    const displayName = client.tradeName || client.name || client.id;

    if (
      typeof client.latitude === "number" &&
      typeof client.longitude === "number"
    ) {
      alreadyOkCount += 1;
      console.log(`OK JÁ EXISTENTE | ${displayName}`);
      continue;
    }

    if (!hasCompleteAddress(client)) {
      incompleteCount += 1;
      console.log(`ENDEREÇO INCOMPLETO | ${displayName}`);
      console.log(
        `Região: ${client.region?.name || "-"} | Cidade: ${client.city || "-"}`
      );
      console.log("");
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

        updatedCount += 1;

        console.log(`ATUALIZADO | ${displayName}`);
        console.log(`Endereço: ${fullAddress}`);
        console.log(
          `Coords: ${geocoded.latitude}, ${geocoded.longitude}`
        );
        console.log("");
      } else {
        failedCount += 1;

        console.log(`SEM COORDENADAS | ${displayName}`);
        console.log(`Endereço: ${fullAddress}`);
        console.log("");
      }
    } catch (error) {
      failedCount += 1;

      console.log(`ERRO | ${displayName}`);
      console.log(`Endereço: ${fullAddress}`);
      console.log(
        `Motivo: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log("");
    }
  }

  console.log("==================================");
  console.log("Resumo final");
  console.log(`Já tinham coordenadas: ${alreadyOkCount}`);
  console.log(`Atualizados agora: ${updatedCount}`);
  console.log(`Endereço incompleto: ${incompleteCount}`);
  console.log(`Falharam na geocodificação: ${failedCount}`);
  console.log("==================================");
}

main()
  .catch((error) => {
    console.error("Erro geral ao geocodificar clientes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });