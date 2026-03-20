import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAddress, geocodeAddress } from "@/lib/geocoding";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function canTryGeocoding(client: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}) {
  return Boolean(client.street && client.city && client.state) || Boolean(client.cep);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = normalizeText(searchParams.get("regionId"));

    const [rawClients, prospects] = await Promise.all([
      prisma.client.findMany({
        where: {
          active: true,
          ...(regionId ? { regionId } : {}),
        },
        select: {
          id: true,
          name: true,
          tradeName: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          mapStatus: true,
          lastVisitAt: true,
          needsReturn: true,
          notes: true,
          street: true,
          number: true,
          district: true,
          cep: true,
          country: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            city: "asc",
          },
          {
            name: "asc",
          },
        ],
      }),
      prisma.prospect.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          ...(regionId ? { regionId } : {}),
        },
        select: {
          id: true,
          name: true,
          tradeName: true,
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          status: true,
          notes: true,
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const clients = [...rawClients];

    for (let index = 0; index < clients.length; index++) {
      const client = clients[index];

      if (
        typeof client.latitude === "number" &&
        typeof client.longitude === "number"
      ) {
        continue;
      }

      if (!canTryGeocoding(client)) {
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

          clients[index] = {
            ...client,
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
          };
        }
      } catch (error) {
        console.error(
          `Erro ao geocodificar cliente ${client.id} (${client.name}):`,
          error
        );
      }
    }

    const points = [
      ...clients
        .filter(
          (client) =>
            typeof client.latitude === "number" &&
            typeof client.longitude === "number"
        )
        .map((client) => ({
          id: client.id,
          kind: "CLIENT" as const,
          name: client.name,
          tradeName: client.tradeName,
          city: client.city,
          state: client.state,
          latitude: client.latitude as number,
          longitude: client.longitude as number,
          status: client.needsReturn ? "RETURN" : client.mapStatus || "CLIENT",
          notes: client.notes,
          lastVisitAt: client.lastVisitAt,
          region: client.region,
        })),
      ...prospects.map((prospect) => ({
        id: prospect.id,
        kind: "PROSPECT" as const,
        name: prospect.name,
        tradeName: prospect.tradeName,
        city: prospect.city,
        state: prospect.state,
        latitude: prospect.latitude as number,
        longitude: prospect.longitude as number,
        status: prospect.status,
        notes: prospect.notes,
        lastVisitAt: null,
        region: prospect.region,
      })),
    ];

    return NextResponse.json(points);
  } catch (error) {
    console.error("GET /api/commercial-map error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o mapa comercial" },
      { status: 500 }
    );
  }
}