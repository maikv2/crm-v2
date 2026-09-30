import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Clientes ativos que precisam de ajuste no mapa comercial:
 *  - NO_ADDRESS: sem endereco (nao da pra achar automaticamente)
 *  - NOT_FOUND: tem endereco, mas a localizacao nao foi encontrada
 *  - APPROXIMATE: no mapa so pelo bairro/cidade/CEP
 *  - SHARED_POINT: exatamente no mesmo ponto de outro cliente (costuma ser
 *    o centro da cidade/bairro)
 *
 * GET /api/commercial-map/pending?regionId=...
 */

export type PendingReason = "NO_ADDRESS" | "NOT_FOUND" | "APPROXIMATE" | "SHARED_POINT";

export type PendingClient = {
  id: string;
  code: string | null;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  reason: PendingReason;
  region: { id: string; name: string } | null;
};

export async function GET(request: NextRequest) {
  try {
    const regionId = new URL(request.url).searchParams.get("regionId")?.trim() || null;

    const clients = await prisma.client.findMany({
      where: { active: true, ...(regionId ? { regionId } : {}) },
      select: {
        id: true,
        code: true,
        name: true,
        tradeName: true,
        street: true,
        number: true,
        district: true,
        city: true,
        state: true,
        cep: true,
        latitude: true,
        longitude: true,
        locationSource: true,
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });

    // Quantos clientes em cada coordenada exata
    const pointCount = new Map<string, number>();
    for (const c of clients) {
      if (c.latitude == null || c.longitude == null) continue;
      const key = `${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`;
      pointCount.set(key, (pointCount.get(key) ?? 0) + 1);
    }

    const pending: PendingClient[] = [];
    for (const c of clients) {
      const hasAddress = Boolean((c.street && c.city) || c.cep || c.city);
      let reason: PendingReason | null = null;

      if (c.latitude == null || c.longitude == null) {
        reason = hasAddress ? "NOT_FOUND" : "NO_ADDRESS";
      } else if (c.locationSource === "APPROXIMATE") {
        reason = "APPROXIMATE";
      } else if (
        c.locationSource !== "MANUAL" &&
        (pointCount.get(`${c.latitude.toFixed(5)},${c.longitude.toFixed(5)}`) ?? 0) > 1
      ) {
        reason = "SHARED_POINT";
      }

      if (!reason) continue;

      pending.push({
        id: c.id,
        code: c.code,
        name: c.tradeName || c.name,
        address: [[c.street, c.number].filter(Boolean).join(", "), c.district, c.city, c.state]
          .filter(Boolean)
          .join(" - "),
        city: c.city,
        state: c.state,
        latitude: c.latitude,
        longitude: c.longitude,
        reason,
        region: c.region,
      });
    }

    // Sem localizacao primeiro (nao aparecem no mapa), depois os aproximados.
    const order: Record<PendingReason, number> = { NOT_FOUND: 0, NO_ADDRESS: 1, APPROXIMATE: 2, SHARED_POINT: 3 };
    pending.sort((a, b) => order[a.reason] - order[b.reason] || a.name.localeCompare(b.name, "pt-BR"));

    return NextResponse.json(pending);
  } catch (error) {
    console.error("GET /api/commercial-map/pending error:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os clientes para ajustar" },
      { status: 500 }
    );
  }
}
