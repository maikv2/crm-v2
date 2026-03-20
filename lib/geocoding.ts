export type GeocodedPoint = {
  latitude: number;
  longitude: number;
};

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

    const response = await fetch(url, {
      headers: {
        "User-Agent": "v2-crm/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

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

  for (const query of queries) {
    const point = await fetchNominatim(query);

    if (point) {
      return point;
    }
  }

  return null;
}