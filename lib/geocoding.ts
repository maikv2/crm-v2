export type GeocodedPoint = {
  latitude: number;
  longitude: number;
};

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export function buildAddress(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(", ");
}

export async function geocodeAddress(
  address: string
): Promise<GeocodedPoint | null> {
  const normalized = normalizeText(address);

  if (!normalized) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      normalized
    )}&format=json&limit=1&countrycodes=br`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "v2-crm/1.0",
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