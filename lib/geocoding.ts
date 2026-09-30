export type GeocodedPoint = {
  latitude: number;
  longitude: number;
  /** true quando achou rua/numero (nao so bairro/cidade) */
  precise?: boolean;
};

/**
 * De onde veio a localizacao do cliente (Client.locationSource):
 * MANUAL = marcada por uma pessoa no mapa/coordenadas;
 * ADDRESS = achada pelo endereco com precisao de rua;
 * APPROXIMATE = so bairro/cidade/CEP - precisa conferir no mapa.
 */
export type LocationSource = "MANUAL" | "ADDRESS" | "APPROXIMATE";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function onlyDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeAddressPart(value?: string | null) {
  const text = normalizeText(value);

  if (!text) return null;

  return text
    .replace(/\bs\/n\b/gi, "SN")
    .replace(/\bnº\b/gi, "")
    .replace(/\bnumero\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => normalizeAddressPart(part))
    .filter(Boolean)
    .join(", ");
}

// O Nominatim (gratuito) aceita no maximo 1 consulta por segundo - mais que
// isso ele bloqueia o servidor (429) e todo endereco passa a "nao achar".
let nominatimQueue: Promise<unknown> = Promise.resolve();
let lastNominatimAt = 0;

function nominatimFetch(url: string): Promise<Response> {
  const run = nominatimQueue.then(async () => {
    const waitMs = lastNominatimAt + 1100 - Date.now();
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastNominatimAt = Date.now();
    return fetch(url, {
      headers: {
        "User-Agent": "v2-crm/1.0 (crm v2 distribuidora)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  });
  nominatimQueue = run.catch(() => undefined);
  return run;
}

async function fetchNominatim(query: string): Promise<GeocodedPoint | null> {
  const normalized = normalizeText(query);

  if (!normalized) return null;

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(normalized)}` +
      `&format=json` +
      `&limit=1` +
      `&addressdetails=1` +
      `&countrycodes=br`;

    const response = await nominatimFetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const first = data[0];
    const latitude = Number(first?.lat);
    const longitude = Number(first?.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      // place_rank 26+ = rua/predio; abaixo disso e bairro/cidade.
      precise: Number(first?.place_rank) >= 26,
    };
  } catch {
    return null;
  }
}

export type ReverseGeocodedAddress = {
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
};

const BR_STATE_CODES: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapá: "AP", amazonas: "AM", bahia: "BA",
  ceará: "CE", "distrito federal": "DF", "espírito santo": "ES", goiás: "GO",
  maranhão: "MA", "mato grosso": "MT", "mato grosso do sul": "MS",
  "minas gerais": "MG", pará: "PA", paraíba: "PB", paraná: "PR",
  pernambuco: "PE", piauí: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondônia: "RO",
  roraima: "RR", "santa catarina": "SC", "são paulo": "SP", sergipe: "SE",
  tocantins: "TO",
};

/**
 * Descobre o endereco aproximado de uma coordenada (usado quando o ponto e
 * marcado direto no mapa, pra preencher cidade/UF e os filtros funcionarem).
 * Retorna null se o Nominatim nao responder.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodedAddress | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${latitude}&lon=${longitude}` +
      `&format=json&addressdetails=1&zoom=18&accept-language=pt-BR`;

    const response = await nominatimFetch(url);

    if (!response.ok) return null;

    const data = await response.json();
    const address = data?.address;
    if (!address) return null;

    const stateName = normalizeText(address.state);
    const isoState = normalizeText(address["ISO3166-2-lvl4"])?.replace(/^BR-/, "") ?? null;

    return {
      street: normalizeText(address.road),
      number: normalizeText(address.house_number),
      district: normalizeText(address.suburb || address.neighbourhood || address.quarter),
      city: normalizeText(address.city || address.town || address.village || address.municipality),
      state: isoState || (stateName ? BR_STATE_CODES[stateName.toLowerCase()] ?? null : null),
      cep: onlyDigits(address.postcode) || null,
    };
  } catch {
    return null;
  }
}

function uniqueQueries(queries: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const query of queries) {
    const normalized = normalizeText(query);

    if (!normalized) continue;

    const key = normalized.toLowerCase();

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export async function geocodeAddress(
  address: string
): Promise<GeocodedPoint | null> {
  const normalized = normalizeText(address);

  if (!normalized) return null;

  const parts = normalized
    .split(",")
    .map((part) => normalizeAddressPart(part))
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) return null;

  const cepPart =
    parts.find((part) => onlyDigits(part).length === 8) ?? null;

  const statePart =
    parts.find((part) => /^[A-Z]{2}$/i.test(part))?.toUpperCase() ?? null;

  const countryPart =
    parts.find((part) => part.toLowerCase() === "brasil") ?? "Brasil";

  const nonCepParts = parts.filter((part) => onlyDigits(part).length !== 8);

  const queries = uniqueQueries([
    normalized,
    buildAddress(parts),
    buildAddress(nonCepParts),
    buildAddress(
      nonCepParts.filter(
        (part) => part.toLowerCase() !== "brasil"
      )
    ),
    buildAddress([
      ...nonCepParts,
      cepPart,
      countryPart,
    ]),
    buildAddress([
      ...nonCepParts.filter((part) => part !== cepPart),
      countryPart,
    ]),
    buildAddress([
      parts[0],
      parts[1],
      parts[2],
      parts[3],
      statePart,
      countryPart,
    ]),
    buildAddress([
      parts[0],
      parts[1],
      parts[3],
      statePart,
      countryPart,
    ]),
    buildAddress([
      parts[0],
      parts[1],
      parts[3],
      statePart,
    ]),
    buildAddress([
      parts[0],
      parts[3],
      statePart,
      countryPart,
    ]),
  ]);

  // No maximo 4 tentativas: cada uma espera 1 s na fila do Nominatim.
  for (const query of queries.slice(0, 4)) {
    const point = await fetchNominatim(query);

    if (point) {
      return point;
    }
  }

  return null;
}

/**
 * Centro aproximado da cidade sem depender de servico externo: mediana das
 * posicoes dos estabelecimentos dessa cidade na tabela MapPlace (Overture).
 */
async function cityCenterFromPlaces(
  city?: string | null,
  state?: string | null
): Promise<GeocodedPoint | null> {
  const name = normalizeText(city);
  if (!name) return null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const uf = normalizeText(state)?.toUpperCase().slice(0, 2) ?? null;
    const rows = await prisma.$queryRaw<{ lat: number | null; lng: number | null; n: bigint }[]>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY latitude) AS lat,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY longitude) AS lng,
             count(*) AS n
      FROM "MapPlace"
      WHERE lower(city) = lower(${name})
        AND (${uf}::text IS NULL OR state = ${uf})
    `;
    const row = rows[0];
    if (!row || row.lat == null || row.lng == null || Number(row.n) < 3) return null;
    return { latitude: Number(row.lat), longitude: Number(row.lng), precise: false };
  } catch {
    return null;
  }
}

function normalizeCity(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Coordenada pelo CEP (AwesomeAPI, gratuita). CEP de rua cai na rua; CEP
 * geral da cidade (terminado em 000) cai no centro. So aceita se o CEP for
 * da mesma cidade do cadastro (evita CEP digitado errado mandar pra longe).
 */
export async function geocodeCep(
  cep?: string | null,
  city?: string | null
): Promise<GeocodedPoint | null> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://cep.awesomeapi.com.br/json/${digits}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const latitude = Number(data?.lat);
    const longitude = Number(data?.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    if (city && data?.city && normalizeCity(data.city) !== normalizeCity(city)) {
      return null;
    }

    return { latitude, longitude, precise: false };
  } catch {
    return null;
  }
}

/**
 * Melhor localizacao possivel pro endereco de um cliente, so com servicos
 * gratuitos: OpenStreetMap pelo endereco; se nao achar a rua, CEP; se nada
 * der certo, o que o OpenStreetMap achou (bairro/cidade). Diz se ficou
 * preciso (ADDRESS) ou aproximado (APPROXIMATE - aparece em "para ajustar").
 */
export async function locateAddress(parts: {
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  country?: string | null;
}): Promise<(GeocodedPoint & { source: LocationSource }) | null> {
  const hasMinimum = Boolean(parts.city) || Boolean(onlyDigits(parts.cep));
  if (!hasMinimum) return null;

  // Centro da cidade: referencia pra validar o CEP e ultimo recurso. Primeiro
  // pelos estabelecimentos do banco (instantaneo); senao, Nominatim.
  const cityPoint = parts.city
    ? (await cityCenterFromPlaces(parts.city, parts.state)) ??
      (await fetchNominatim(buildAddress([parts.city, parts.state, "Brasil"])))
    : null;

  const byAddress = await geocodeAddress(
    buildAddress([
      parts.street,
      parts.number,
      parts.district,
      parts.city,
      parts.state,
      parts.cep,
      parts.country || "Brasil",
    ])
  );

  if (byAddress?.precise) return { ...byAddress, source: "ADDRESS" };

  let byCep = await geocodeCep(parts.cep, parts.city);

  // Base de CEP as vezes tem coordenada errada: descarta se ficar a mais de
  // ~30 km do bairro/cidade que o OpenStreetMap achou.
  const reference = byAddress ?? cityPoint;
  if (byCep && reference) {
    const km = Math.hypot(
      (byCep.latitude - reference.latitude) * 111,
      (byCep.longitude - reference.longitude) * 111 * Math.cos((reference.latitude * Math.PI) / 180)
    );
    if (km > 30) byCep = null;
  }

  if (byCep) return { ...byCep, source: "APPROXIMATE" };

  if (byAddress) return { ...byAddress, source: "APPROXIMATE" };

  if (cityPoint) return { ...cityPoint, precise: false, source: "APPROXIMATE" };

  return null;
}