import { prisma } from "@/lib/prisma";
import { locateAddress } from "@/lib/geocoding";

/**
 * Coloca no mapa os clientes ativos que estao sem coordenada, usando a busca
 * gratuita (OpenStreetMap pelo endereco; sem rua exata, CEP). Os que ficarem
 * so aproximados (bairro/cidade/CEP) sao marcados como APPROXIMATE e
 * aparecem em "Clientes para ajustar" no mapa comercial.
 *
 * So preenche latitude/longitude/locationSource de quem esta SEM coordenada -
 * nao mexe em nenhum cliente que ja esta no mapa nem em outros campos.
 *
 *   npx tsx scripts/locate-clients-without-coords.ts          (simula)
 *   npx tsx scripts/locate-clients-without-coords.ts --apply  (grava)
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const apply = process.argv.includes("--apply");

  const clients = await prisma.client.findMany({
    where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
    select: {
      id: true, code: true, name: true, tradeName: true,
      street: true, number: true, district: true, city: true, state: true, cep: true, country: true,
    },
    orderBy: { code: "asc" },
  });

  let found = 0;
  for (const c of clients) {
    const label = `${c.code ?? "-"} ${c.tradeName || c.name}`;
    const located = await locateAddress(c);
    // Nominatim pede no maximo 1 consulta por segundo
    await wait(1100);

    if (!located) {
      console.log(`sem localização  | ${label} | ${[c.street, c.number, c.city, c.cep].filter(Boolean).join(", ") || "(sem endereço)"}`);
      continue;
    }

    found++;
    console.log(
      `${apply ? "gravado" : "[simulação]"} ${located.source === "ADDRESS" ? "EXATO    " : "APROXIMADO"} | ${label} | ${located.latitude.toFixed(5)}, ${located.longitude.toFixed(5)}`
    );

    if (apply) {
      await prisma.client.update({
        where: { id: c.id },
        data: {
          latitude: located.latitude,
          longitude: located.longitude,
          locationSource: located.source,
        },
      });
    }
  }

  console.log(`\n${found} de ${clients.length} cliente(s) sem coordenada ${apply ? "foram colocados" : "seriam colocados"} no mapa.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
