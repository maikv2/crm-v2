import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Estabelecimentos dentro de uma area do mapa comercial, ja classificados
 * nos tipos de comercio que a V2 procura. Usado pra mostrar os pontinhos
 * vermelhos e virar cliente, prospecto ou "levar expositor".
 *
 * Fonte principal: tabela MapPlace (base aberta Overture Maps, importada por
 * scripts/import-map-places.py) - rapida e bem mais completa. Onde nada foi
 * importado, cai no OpenStreetMap (API Overpass, gratuita, consulta na hora).
 *
 * GET /api/map-places?south=..&west=..&north=..&east=..
 */

export type MapPlaceCategory =
  | "SUPERMARKET"
  | "MARKET"
  | "CONVENIENCE"
  | "TELEBIER"
  | "BAKERY"
  | "PHARMACY"
  | "FUEL"
  | "WAREHOUSE"
  | "PHONE"
  | "COMPUTER"
  | "BOOKS"
  | "RESTAURANT";

export type MapPlace = {
  id: string;
  category: MapPlaceCategory;
  name: string | null;
  latitude: number;
  longitude: number;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  phone: string | null;
};

// Servidor principal + espelho (se um estiver lento/fora, tenta o outro).
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const SHOP_TAGS = [
  "supermarket", "grocery", "greengrocer", "general", "convenience",
  "alcohol", "beverages", "bakery", "pastry", "chemist",
  "mobile_phone", "computer", "electronics", "books",
];

// Area maxima por consulta (graus). O mapa pede em quadrados de 0.1 grau -
// area maior que isso em capital (ex.: centro de SP) estoura o tempo do
// Overpass.
const MAX_SPAN = 0.25;

// Cache simples por area (vale enquanto a funcao estiver quente).
const cache = new Map<string, { at: number; places: MapPlace[] }>();
const CACHE_MS = 6 * 60 * 60 * 1000;

function normalize(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function clean(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

/**
 * Classifica pelo tipo do OSM e tambem pelo nome - muito "Mercado X" esta
 * cadastrado como supermercado/conveniencia, e tele bier como bebidas.
 */
function classify(tags: Record<string, string>): MapPlaceCategory | null {
  const shop = tags.shop;
  const amenity = tags.amenity;
  const name = normalize(tags.name);

  if (amenity === "pharmacy" || shop === "chemist") return "PHARMACY";
  if (amenity === "fuel") return "FUEL";
  if (amenity === "restaurant" || amenity === "fast_food") return "RESTAURANT";
  if (shop === "bakery" || shop === "pastry") return "BAKERY";
  if (shop === "mobile_phone") return "PHONE";
  if (shop === "computer" || shop === "electronics") return "COMPUTER";
  if (shop === "books") return "BOOKS";

  const foodShop = ["supermarket", "grocery", "greengrocer", "general", "convenience", "alcohol", "beverages"];
  if (!shop || !foodShop.includes(shop)) return null;

  if (/tele\s*-?\s*(bier|beer|bebida|cerveja|gelada)|disk\s*-?\s*(bebida|cerveja)|distribuidora? de bebida/.test(name)) {
    return "TELEBIER";
  }
  if (shop === "alcohol" || shop === "beverages") return "TELEBIER";
  if (/armazem/.test(name)) return "WAREHOUSE";
  if (/supermercad|hipermercad|\bsuper\b|atacad/.test(name)) return "SUPERMARKET";
  if (/mercad|mercearia|minimercado|fruteira|hortifruti/.test(name)) return "MARKET";
  if (shop === "supermarket") return "SUPERMARKET";
  if (shop === "convenience") return "CONVENIENCE";
  // "Loja geral" no OSM costuma ser variedades/agropecuaria - so entra
  // quando o nome indica mercado ou armazem (tratados acima).
  if (shop === "general") return null;
  return "MARKET"; // grocery / greengrocer
}

function toPlace(element: any): MapPlace | null {
  const tags: Record<string, string> = element?.tags ?? {};
  const category = classify(tags);
  if (!category) return null;

  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: `${element.type}/${element.id}`,
    category,
    name: clean(tags.name || tags.brand),
    latitude,
    longitude,
    street: clean(tags["addr:street"]),
    number: clean(tags["addr:housenumber"]),
    district: clean(tags["addr:suburb"] || tags["addr:neighbourhood"]),
    city: clean(tags["addr:city"]),
    state: clean(tags["addr:state"])?.toUpperCase().slice(0, 2) ?? null,
    cep: clean(tags["addr:postcode"])?.replace(/\D/g, "") || null,
    phone: clean(tags.phone || tags["contact:phone"] || tags["contact:whatsapp"] || tags.mobile),
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function queryOverpass(query: string) {
  // Principal, principal de novo (504/429 = sobrecarga momentanea) e espelho.
  const attempts = [OVERPASS_ENDPOINTS[0], OVERPASS_ENDPOINTS[0], ...OVERPASS_ENDPOINTS.slice(1)];

  for (let i = 0; i < attempts.length; i++) {
    try {
      const response = await fetch(attempts[i], {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "v2-crm/1.0",
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        if (response.status === 429 || response.status === 504) await wait(2000);
        continue;
      }
      const data = await response.json();
      if (Array.isArray(data?.elements)) return data.elements as any[];
    } catch {
      // tenta de novo / proximo servidor
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const south = Number(searchParams.get("south"));
  const west = Number(searchParams.get("west"));
  const north = Number(searchParams.get("north"));
  const east = Number(searchParams.get("east"));

  if (![south, west, north, east].every(Number.isFinite) || south >= north || west >= east) {
    return NextResponse.json({ error: "Área do mapa inválida." }, { status: 400 });
  }

  if (north - south > MAX_SPAN || east - west > MAX_SPAN) {
    return NextResponse.json(
      { error: "Aproxime o mapa para ver os estabelecimentos." },
      { status: 400 }
    );
  }

  // Tipos pedidos (so os ligados no mapa); sem o parametro, todos.
  const categories = (searchParams.get("categories") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean) as MapPlaceCategory[];
  const wanted = (place: { category: string }) =>
    categories.length === 0 || categories.includes(place.category as MapPlaceCategory);

  // 1) Base importada (Overture) no banco do CRM
  try {
    const stored = await prisma.mapPlace.findMany({
      where: {
        latitude: { gte: south, lte: north },
        longitude: { gte: west, lte: east },
        ...(categories.length ? { category: { in: categories } } : {}),
      },
      take: 10000,
    });

    if (stored.length > 0) {
      return NextResponse.json(
        stored.map<MapPlace>((p) => ({
          id: p.id,
          category: p.category as MapPlaceCategory,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          street: p.street,
          number: null,
          district: null,
          city: p.city,
          state: p.state,
          cep: p.cep,
          phone: p.phone,
        }))
      );
    }

    // Area vazia (zona rural) numa regiao ja importada: nao precisa do OSM.
    const importedNearby = await prisma.mapPlace.findFirst({
      where: {
        latitude: { gte: south - 0.5, lte: north + 0.5 },
        longitude: { gte: west - 0.5, lte: east + 0.5 },
      },
      select: { id: true },
    });
    if (importedNearby) return NextResponse.json([]);
  } catch (error) {
    console.error("GET /api/map-places MapPlace error:", error);
    // segue pro OpenStreetMap
  }

  // 2) OpenStreetMap na hora (regiao ainda nao importada)
  const bbox = [south, west, north, east].map((v) => v.toFixed(4)).join(",");
  const cached = cache.get(bbox);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.places.filter(wanted));
  }

  const query = `
    [out:json][timeout:25];
    (
      nwr["shop"~"^(${SHOP_TAGS.join("|")})$"](${bbox});
      nwr["amenity"~"^(pharmacy|fuel|restaurant|fast_food)$"](${bbox});
    );
    out center tags 6000;
  `;

  const elements = await queryOverpass(query);
  if (!elements) {
    return NextResponse.json(
      { error: "O serviço de estabelecimentos (OpenStreetMap) não respondeu. Tente de novo em instantes." },
      { status: 502 }
    );
  }

  const places = elements.map(toPlace).filter((p): p is MapPlace => p !== null);

  if (cache.size > 200) cache.clear();
  cache.set(bbox, { at: Date.now(), places });

  return NextResponse.json(places.filter(wanted));
}
