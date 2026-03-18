import { prisma } from "../lib/prisma";

async function geocodeAddress(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "crm-v2",
    },
  });

  const data = await res.json();

  if (!data || data.length === 0) {
    return null;
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function run() {
  const clients = await prisma.client.findMany({
    where: {
      latitude: null,
      city: { not: null },
    },
  });

  console.log(`Clientes para geocodificar: ${clients.length}`);

  for (const client of clients) {
    const address = [
      client.street,
      client.number,
      client.city,
      client.state,
      "Brasil",
    ]
      .filter(Boolean)
      .join(", ");

    console.log("Buscando:", address);

    const geo = await geocodeAddress(address);

    if (!geo) {
      console.log("Não encontrado:", client.name);
      continue;
    }

    await prisma.client.update({
      where: { id: client.id },
      data: {
        latitude: geo.lat,
        longitude: geo.lon,
      },
    });

    console.log("Atualizado:", client.name, geo.lat, geo.lon);

    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log("Geocodificação finalizada.");
}

run();