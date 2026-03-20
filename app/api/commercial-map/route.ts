import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = normalizeText(searchParams.get("regionId"));

    const [clients, prospects] = await Promise.all([
      prisma.client.findMany({
        where: {
          active: true,
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
          mapStatus: true,
          lastVisitAt: true,
          needsReturn: true,
          notes: true,
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

    const points = [
      ...clients.map((client) => ({
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