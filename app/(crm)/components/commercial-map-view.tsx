"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getThemeColors } from "../../../lib/theme";
import type { MapPlace, MapPlaceCategory } from "@/app/api/map-places/route";
import type { PendingClient, PendingReason } from "@/app/api/commercial-map/pending/route";

const PENDING_LABELS: Record<PendingReason, { label: string; color: string; bg: string }> = {
  NOT_FOUND: { label: "Fora do mapa · endereço não encontrado", color: "#b91c1c", bg: "#fef2f2" },
  NO_ADDRESS: { label: "Fora do mapa · sem endereço", color: "#b91c1c", bg: "#fef2f2" },
  APPROXIMATE: { label: "Localização aproximada", color: "#c2410c", bg: "#fff7ed" },
  SHARED_POINT: { label: "Mesmo ponto de outro cliente", color: "#a16207", bg: "#fefce8" },
};

export type CommercialMapPointKind = "CLIENT" | "PROSPECT" | "EXHIBITOR";

export type CommercialMapPoint = {
  id: string;
  kind: CommercialMapPointKind;
  name: string;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  /** Cliente posicionado so pelo bairro/cidade/CEP - precisa conferir */
  approximate?: boolean;
  /** Cliente com expositor instalado ou que so compra */
  clientProfile?: "EXHIBITOR" | "BUYER";
  notes?: string | null;
  lastVisitAt?: string | Date | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

export type NewMapPointInput = {
  kind: CommercialMapPointKind;
  name: string;
  phone: string;
  notes: string;
  regionId: string;
  latitude: number;
  longitude: number;
  // Endereco vindo do estabelecimento do OpenStreetMap (quando tiver)
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
};

type DraftPrefill = {
  placeId: string;
  name: string;
  phone: string;
  street: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
};

// Tipos de comercio que a V2 procura (pontinhos vermelhos do OpenStreetMap)
const PLACE_CATEGORIES: { key: MapPlaceCategory; label: string }[] = [
  { key: "SUPERMARKET", label: "Supermercados" },
  { key: "MARKET", label: "Mercados" },
  { key: "CONVENIENCE", label: "Conveniência" },
  { key: "TELEBIER", label: "Tele Bier" },
  { key: "BAKERY", label: "Padaria" },
  { key: "PHARMACY", label: "Farmácia" },
  { key: "FUEL", label: "Posto de gasolina" },
  { key: "WAREHOUSE", label: "Armazém" },
  { key: "PHONE", label: "Lojas de celular" },
  { key: "COMPUTER", label: "Informática" },
  { key: "BOOKS", label: "Livrarias" },
  { key: "RESTAURANT", label: "Restaurantes" },
];

const PLACE_LABELS = Object.fromEntries(
  PLACE_CATEGORIES.map((c) => [c.key, c.label])
) as Record<MapPlaceCategory, string>;

const PLACE_COLOR = "#dc2626";
const PLACES_MIN_ZOOM = 13;
const PLACES_TILE = 0.1; // graus - a area e carregada em quadrados desse tamanho
const PLACES_STORAGE_KEY = "v2crm.map.placeCategories";

type DisplayPoint = CommercialMapPoint & {
  displayLatitude: number;
  displayLongitude: number;
};

type LatLng = { lat: number; lng: number };

export const KIND_COLORS: Record<CommercialMapPointKind, string> = {
  CLIENT: "#2563eb",
  PROSPECT: "#eab308",
  EXHIBITOR: "#16a34a",
};

export const KIND_LABELS: Record<CommercialMapPointKind, string> = {
  CLIENT: "Cliente",
  PROSPECT: "Prospecto",
  EXHIBITOR: "Levar expositor",
};

const KIND_ORDER: CommercialMapPointKind[] = ["PROSPECT", "EXHIBITOR", "CLIENT"];

// Cliente que so compra (sem expositor instalado) - roxo; com expositor - azul.
export const BUYER_COLOR = "#7c3aed";

function pointColor(point: CommercialMapPoint) {
  if (point.kind === "CLIENT" && point.clientProfile === "BUYER") return BUYER_COLOR;
  return KIND_COLORS[point.kind];
}

function pointLabel(point: CommercialMapPoint) {
  if (point.kind === "CLIENT") {
    return point.clientProfile === "BUYER" ? "Cliente que compra" : "Cliente com expositor";
  }
  return KIND_LABELS[point.kind];
}

function formatDateBR(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function formatCoord(value: number) {
  return value.toFixed(6);
}

function normalizeSearch(value?: string | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function pointKey(point: CommercialMapPoint) {
  return `${point.kind}-${point.id}`;
}

/**
 * Aceita "-26,95971" / "-26.95971" e tambem o par colado do Google Maps
 * ("-26.95971, -52.53521") no campo de latitude.
 */
function parseCoordinateInputs(latText: string, lngText: string): LatLng | null {
  const pair = latText.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  const lat = pair ? Number(pair[1]) : Number(latText.trim().replace(",", "."));
  const lng = pair ? Number(pair[2]) : Number(lngText.trim().replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const iconCache = new Map<string, L.DivIcon>();

const APPROXIMATE_COLOR = "#f97316";

function createMarkerIcon(color: string, highlighted = false, approximate = false) {
  const cacheKey = `${color}-${highlighted}-${approximate}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const size = highlighted ? 26 : 18;
  // Localizacao aproximada: anel laranja tracejado em volta do pino.
  const ring = approximate
    ? `outline: 2px dashed ${APPROXIMATE_COLOR}; outline-offset: 2px;`
    : "";
  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 999px;
        background: ${color};
        border: 3px solid white;
        ${ring}
        box-shadow: ${highlighted ? `0 0 0 6px ${color}55, 0 4px 12px rgba(0,0,0,0.35)` : "0 0 0 3px rgba(0,0,0,0.18)"};
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -8],
  });
  iconCache.set(cacheKey, icon);
  return icon;
}

function spreadPoints(points: CommercialMapPoint[]): DisplayPoint[] {
  const groups = new Map<string, CommercialMapPoint[]>();

  for (const point of points) {
    const key = `${point.latitude.toFixed(6)}_${point.longitude.toFixed(6)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point);
  }

  const result: DisplayPoint[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push({
        ...group[0],
        displayLatitude: group[0].latitude,
        displayLongitude: group[0].longitude,
      });
      continue;
    }

    const radius = 0.00018;
    group.forEach((point, index) => {
      const angle = (2 * Math.PI * index) / group.length;
      result.push({
        ...point,
        displayLatitude: point.latitude + Math.sin(angle) * radius,
        displayLongitude: point.longitude + Math.cos(angle) * radius,
      });
    });
  }

  return result;
}

/**
 * Reposiciona o mapa quando os filtros mudam (recenterKey). Nao reage a
 * edicoes de pontos (mover/adicionar), pra o mapa nao "pular" enquanto o
 * usuario trabalha nele.
 */
function MapRecenter({ recenterKey, center }: { recenterKey: string; center: [number, number] }) {
  const map = useMap();
  const centerRef = useRef(center);
  centerRef.current = center;
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    map.flyTo(centerRef.current, map.getZoom(), { animate: true, duration: 0.6 });
  }, [recenterKey, map]);

  return null;
}

/**
 * Botao direito (computador) ou toque longo (celular/tablet) abre o
 * cadastro rapido no ponto; toque simples, durante o "mover", leva o
 * ponto ate ali.
 */
function MapInteractions({
  onLongPress,
  onTap,
  onViewChange,
}: {
  onLongPress: (latlng: LatLng) => void;
  onTap: (latlng: LatLng) => void;
  onViewChange: () => void;
}) {
  useMapEvents({
    contextmenu(event) {
      onLongPress({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    click(event) {
      onTap({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    moveend() {
      onViewChange();
    },
  });
  return null;
}

type GpsPosition = { lat: number; lng: number; accuracy: number };

function gpsErrorMessage(error: GeolocationPositionError | Error) {
  if ("code" in error) {
    if (error.code === 1) {
      return "Localização bloqueada. Permita o acesso à localização para este site (ícone de cadeado na barra de endereço) e tente de novo.";
    }
    if (error.code === 3) return "O GPS demorou para responder. Tente de novo, de preferência em local aberto.";
    return "Não foi possível obter sua localização. Confira se o GPS do celular está ligado.";
  }
  return error.message;
}

/** Localizacao atual pelo GPS do aparelho (API do navegador, gratuita). */
function getGpsPosition(): Promise<GpsPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Este aparelho/navegador não tem localização disponível."));
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error("A localização só funciona no endereço seguro (https) do CRM."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );
  });
}

function readSavedCategories(): MapPlaceCategory[] {
  try {
    const raw = window.localStorage.getItem(PLACES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k) => k in PLACE_LABELS) : [];
  } catch {
    return [];
  }
}

function formatPlaceAddress(place: MapPlace) {
  const street = [place.street, place.number].filter(Boolean).join(", ");
  return [street, place.district, place.city].filter(Boolean).join(" - ");
}

export default function CommercialMapView({
  points,
  themeMode,
  mode,
  regions,
  fixedRegionId,
  recenterKey,
  onMovePoint,
  onCreatePoint,
  pendingClients,
  onPlaceClient,
}: {
  points: CommercialMapPoint[];
  themeMode: "light" | "dark";
  mode: "admin" | "representative";
  regions: { id: string; name: string }[];
  /** Regiao do representante logado - quando informada, nao mostra o seletor. */
  fixedRegionId?: string | null;
  recenterKey: string;
  onMovePoint: (point: CommercialMapPoint, position: LatLng) => Promise<void>;
  onCreatePoint: (input: NewMapPointInput) => Promise<void>;
  /** Clientes sem localizacao ou com localizacao aproximada */
  pendingClients: PendingClient[];
  /** Grava a posicao escolhida pra um cliente que estava fora do mapa */
  onPlaceClient: (client: PendingClient, position: LatLng) => Promise<void>;
}) {
  const safePoints = Array.isArray(points) ? points : [];
  const displayPoints = useMemo(() => spreadPoints(safePoints), [safePoints]);
  const theme = getThemeColors(themeMode);
  const border = theme.isDark ? "#1e293b" : theme.border;

  const [map, setMap] = useState<L.Map | null>(null);

  // Mover ponto (arrastar ou tocar no mapa)
  const [moving, setMoving] = useState<{ point: CommercialMapPoint; position: LatLng } | null>(null);
  // Mira no centro do mapa pra escolher onde adicionar
  const [aiming, setAiming] = useState<CommercialMapPointKind | null>(null);
  // Cadastro rapido aberto
  const [draft, setDraft] = useState<{
    id: number;
    position: LatLng;
    kind: CommercialMapPointKind;
    prefill?: DraftPrefill;
  } | null>(null);
  // Edicao de coordenadas dentro do painel do ponto
  const [coordEdit, setCoordEdit] = useState<{ key: string; lat: string; lng: string } | null>(null);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Pesquisa de ponto no mapa (nome, fantasia ou cidade)
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const markerRefs = useRef(new Map<string, L.Marker>());

  const searchResults = useMemo(() => {
    const term = normalizeSearch(search);
    if (term.length < 2) return [];
    return displayPoints
      .filter((p) =>
        [p.tradeName, p.name, p.city].some((field) => normalizeSearch(field).includes(term))
      )
      .sort((a, b) => {
        // Quem comeca com o termo vem primeiro
        const aStarts = [a.tradeName, a.name].some((f) => normalizeSearch(f).startsWith(term)) ? 0 : 1;
        const bStarts = [b.tradeName, b.name].some((f) => normalizeSearch(f).startsWith(term)) ? 0 : 1;
        return aStarts - bStarts || (a.tradeName || a.name).localeCompare(b.tradeName || b.name, "pt-BR");
      })
      .slice(0, 8);
  }, [search, displayPoints]);

  // Estabelecimentos do OpenStreetMap (pontinhos vermelhos)
  const [placeCategories, setPlaceCategories] = useState<MapPlaceCategory[]>([]);
  const [places, setPlaces] = useState<Map<string, MapPlace>>(new Map());
  const [placesStatus, setPlacesStatus] = useState<
    { type: "idle" | "loading" | "zoom" | "error"; text?: string }
  >({ type: "idle" });
  const [convertedPlaceIds, setConvertedPlaceIds] = useState<Set<string>>(new Set());
  const loadedTilesRef = useRef(new Set<string>());
  const loadingTilesRef = useRef(new Set<string>());
  const placesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesRenderer = useMemo(() => L.canvas({ padding: 0.5, tolerance: 10 }), []);

  useEffect(() => {
    setPlaceCategories(readSavedCategories());
  }, []);

  function togglePlaceCategory(key: MapPlaceCategory) {
    setPlaceCategories((current) => {
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      try {
        window.localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // sem localStorage: so nao lembra a escolha
      }
      return next;
    });
  }

  function setAllPlaceCategories(on: boolean) {
    const next = on ? PLACE_CATEGORIES.map((c) => c.key) : [];
    setPlaceCategories(next);
    try {
      window.localStorage.setItem(PLACES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignora
    }
  }

  // Carrega os quadrados da area visivel que ainda nao foram buscados.
  async function loadPlacesForView() {
    if (!map) return;
    if (map.getZoom() < PLACES_MIN_ZOOM) {
      setPlacesStatus({ type: "zoom" });
      return;
    }

    // O que falta carregar: cada quadrado visivel x cada tipo ligado (so os
    // tipos ligados vem do servidor - capital tem milhares de restaurantes).
    const bounds = map.getBounds();
    const pending: { x: number; y: number; categories: MapPlaceCategory[] }[] = [];
    for (let x = Math.floor(bounds.getWest() / PLACES_TILE); x <= Math.floor(bounds.getEast() / PLACES_TILE); x++) {
      for (let y = Math.floor(bounds.getSouth() / PLACES_TILE); y <= Math.floor(bounds.getNorth() / PLACES_TILE); y++) {
        const missing = placeCategories.filter((cat) => {
          const key = `${x},${y}|${cat}`;
          return !loadedTilesRef.current.has(key) && !loadingTilesRef.current.has(key);
        });
        if (missing.length) pending.push({ x, y, categories: missing });
      }
    }
    if (pending.length === 0) {
      if (loadingTilesRef.current.size === 0) setPlacesStatus({ type: "idle" });
      return;
    }
    pending.forEach((t) => t.categories.forEach((cat) => loadingTilesRef.current.add(`${t.x},${t.y}|${cat}`)));

    setPlacesStatus({ type: "loading" });
    let failed = 0;

    // Quadrado por quadrado, 2 de cada vez, mostrando conforme chega.
    async function loadTile(tile: { x: number; y: number; categories: MapPlaceCategory[] }) {
      const keys = tile.categories.map((cat) => `${tile.x},${tile.y}|${cat}`);
      const params = new URLSearchParams({
        south: (tile.y * PLACES_TILE).toFixed(4),
        west: (tile.x * PLACES_TILE).toFixed(4),
        north: ((tile.y + 1) * PLACES_TILE).toFixed(4),
        east: ((tile.x + 1) * PLACES_TILE).toFixed(4),
        categories: tile.categories.join(","),
      });
      try {
        // Onde cai no OpenStreetMap (publico), as vezes ele fica
        // sobrecarregado: tenta ate 3 vezes.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 4000 * attempt));
          try {
            const res = await fetch(`/api/map-places?${params.toString()}`, { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (!res.ok || !Array.isArray(data)) continue;
            keys.forEach((key) => loadedTilesRef.current.add(key));
            setPlaces((current) => {
              const next = new Map(current);
              for (const place of data as MapPlace[]) next.set(place.id, place);
              return next;
            });
            return;
          } catch {
            // tenta de novo
          }
        }
        failed++;
      } finally {
        keys.forEach((key) => loadingTilesRef.current.delete(key));
      }
    }

    const queue = [...pending];
    await Promise.all(
      [0, 1].map(async () => {
        while (queue.length) await loadTile(queue.shift()!);
      })
    );

    setPlacesStatus(
      failed > 0
        ? {
            type: "error",
            text:
              failed === pending.length
                ? "Os estabelecimentos não carregaram. Mexa no mapa para tentar de novo."
                : "Parte da área não carregou. Mexa no mapa para tentar de novo.",
          }
        : { type: "idle" }
    );
  }

  function schedulePlacesLoad() {
    if (placeCategories.length === 0) return;
    if (placesTimerRef.current) clearTimeout(placesTimerRef.current);
    placesTimerRef.current = setTimeout(() => {
      loadPlacesForView();
    }, 500);
  }

  // Ligou/desligou algum tipo (ou o mapa acabou de abrir): busca o que falta.
  useEffect(() => {
    schedulePlacesLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeCategories.join(","), map]);

  // Esconde o que ja e cliente/prospecto (a ~35 m) ou acabou de ser cadastrado.
  const visiblePlaces = useMemo(() => {
    if (placeCategories.length === 0) return [];
    const enabled = new Set(placeCategories);
    const near = 0.00035;
    return Array.from(places.values()).filter(
      (place) =>
        enabled.has(place.category) &&
        !convertedPlaceIds.has(place.id) &&
        !safePoints.some(
          (p) => Math.abs(p.latitude - place.latitude) < near && Math.abs(p.longitude - place.longitude) < near
        )
    );
  }, [places, placeCategories, convertedPlaceIds, safePoints]);

  function startFromPlace(place: MapPlace, kind: CommercialMapPointKind) {
    map?.closePopup();
    setMoving(null);
    setAiming(null);
    setFeedback(null);
    setDraft({
      id: Date.now(),
      position: { lat: place.latitude, lng: place.longitude },
      kind,
      prefill: {
        placeId: place.id,
        name: place.name ?? "",
        phone: place.phone ?? "",
        street: place.street,
        number: place.number,
        district: place.district,
        city: place.city,
        state: place.state,
        cep: place.cep,
      },
    });
  }

  // GPS do aparelho: ponto azul "voce esta aqui" + "usar meu GPS" nos modos
  // de mover/colocar/adicionar.
  const [myPosition, setMyPosition] = useState<GpsPosition | null>(null);
  const [locating, setLocating] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  async function locateMe() {
    try {
      setLocating(true);
      setFeedback(null);
      const pos = await getGpsPosition();
      setMyPosition(pos);
      map?.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 17), { duration: 0.8 });

      // Continua acompanhando enquanto a pessoa anda.
      if (watchIdRef.current == null && navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (p) => setMyPosition({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
        );
      }
      return pos;
    } catch (error: any) {
      setFeedback({ type: "error", text: gpsErrorMessage(error) });
      return null;
    } finally {
      setLocating(false);
    }
  }

  // Leva o ponto sendo movido pra onde a pessoa esta.
  async function moveToMyPosition() {
    const pos = await locateMe();
    if (pos) setMoving((current) => (current ? { ...current, position: { lat: pos.lat, lng: pos.lng } } : current));
  }

  // Clientes para ajustar: colocar no mapa (sem localizacao) ou mover
  // (aproximado / mesmo ponto de outro).
  const [pendingOpen, setPendingOpen] = useState(false);
  const [placing, setPlacing] = useState<PendingClient | null>(null);

  function startPlacing(client: PendingClient) {
    map?.closePopup();
    setMoving(null);
    setAiming(null);
    setDraft(null);
    setFeedback(null);

    // Ja esta no mapa (aproximado): vai ate ele e libera pra arrastar.
    if (client.latitude != null && client.longitude != null) {
      const point = safePoints.find((p) => p.kind === "CLIENT" && p.id === client.id);
      if (point) {
        map?.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 16), { duration: 0.8 });
        setMoving({ point, position: { lat: point.latitude, lng: point.longitude } });
        return;
      }
    }

    // Fora do mapa: mira no centro; comeca perto de um cliente da mesma cidade.
    const sameCity = client.city
      ? safePoints.find((p) => normalizeSearch(p.city) === normalizeSearch(client.city))
      : undefined;
    if (sameCity) map?.flyTo([sameCity.latitude, sameCity.longitude], 15, { duration: 0.8 });
    setPlacing(client);
  }

  async function confirmPlacing() {
    if (!map || !placing) return;
    const c = map.getCenter();
    try {
      setBusy(true);
      setFeedback(null);
      await onPlaceClient(placing, { lat: c.lat, lng: c.lng });
      setFeedback({ type: "success", text: `${placing.name} agora está no mapa.` });
      setPlacing(null);
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Não foi possível salvar a posição." });
    } finally {
      setBusy(false);
    }
  }

  function focusPoint(point: DisplayPoint) {
    if (!map) return;
    const key = pointKey(point);
    setSearch("");
    setSearchOpen(false);
    map.closePopup();
    map.flyTo([point.displayLatitude, point.displayLongitude], Math.max(map.getZoom(), 17), { duration: 0.8 });
    map.once("moveend", () => markerRefs.current.get(key)?.openPopup());
  }

  const center = useMemo<[number, number]>(() => {
    if (displayPoints.length > 0) {
      const avgLat =
        displayPoints.reduce((sum, item) => sum + item.displayLatitude, 0) /
        displayPoints.length;
      const avgLng =
        displayPoints.reduce((sum, item) => sum + item.displayLongitude, 0) /
        displayPoints.length;
      return [avgLat, avgLng];
    }
    return [-27.1004, -52.6152];
  }, [displayPoints]);

  useEffect(() => {
    if (!feedback || feedback.type !== "success") return;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const mapStyle = {
    height: "calc(100vh - 360px)",
    width: "100%",
    minHeight: 540,
  };

  function startMoving(point: CommercialMapPoint) {
    map?.closePopup();
    setCoordEdit(null);
    setAiming(null);
    setPlacing(null);
    setDraft(null);
    setFeedback(null);
    setMoving({ point, position: { lat: point.latitude, lng: point.longitude } });
  }

  async function saveMove() {
    if (!moving) return;
    try {
      setBusy(true);
      setFeedback(null);
      await onMovePoint(moving.point, moving.position);
      setFeedback({ type: "success", text: `Posição de ${moving.point.tradeName || moving.point.name} atualizada.` });
      setMoving(null);
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Não foi possível salvar a posição." });
    } finally {
      setBusy(false);
    }
  }

  async function saveCoordinates(point: CommercialMapPoint) {
    if (!coordEdit) return;
    const position = parseCoordinateInputs(coordEdit.lat, coordEdit.lng);
    if (!position) {
      setFeedback({ type: "error", text: "Latitude ou longitude inválida. Ex.: -26.95971 e -52.53521" });
      return;
    }
    try {
      setBusy(true);
      setFeedback(null);
      await onMovePoint(point, position);
      map?.closePopup();
      setCoordEdit(null);
      map?.flyTo([position.lat, position.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
      setFeedback({ type: "success", text: `Posição de ${point.tradeName || point.name} atualizada.` });
    } catch (error: any) {
      setFeedback({ type: "error", text: error?.message || "Não foi possível salvar a posição." });
    } finally {
      setBusy(false);
    }
  }

  function startAiming(kind: CommercialMapPointKind) {
    map?.closePopup();
    setMoving(null);
    setPlacing(null);
    setDraft(null);
    setFeedback(null);
    setAiming(kind);
  }

  function confirmAim() {
    if (!map || !aiming) return;
    const c = map.getCenter();
    setDraft({ id: Date.now(), position: { lat: c.lat, lng: c.lng }, kind: aiming });
    setAiming(null);
  }

  function handleLongPress(position: LatLng) {
    if (moving || placing || busy) return;
    map?.closePopup();
    setAiming(null);
    setFeedback(null);
    setDraft({ id: Date.now(), position, kind: "PROSPECT" });
  }

  function handleTap(position: LatLng) {
    if (moving) setMoving({ ...moving, position });
  }

  // Regiao sugerida: a do ponto ja cadastrado mais perto de onde vai o novo.
  function suggestRegionId(position: LatLng) {
    if (fixedRegionId) return fixedRegionId;
    let bestId = "";
    let bestDist = Infinity;
    for (const p of safePoints) {
      if (!p.region?.id) continue;
      const d = (p.latitude - position.lat) ** 2 + (p.longitude - position.lng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestId = p.region.id;
      }
    }
    return bestId;
  }

  const overlayCard: React.CSSProperties = {
    background: theme.isDark ? "#0f172a" : "#ffffff",
    color: theme.text,
    border: `1px solid ${border}`,
    borderRadius: 14,
    boxShadow: "0 10px 30px rgba(2,6,23,0.35)",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 14,
          color: theme.text,
          fontSize: 13,
          alignItems: "center",
        }}
      >
        <Legend color={KIND_COLORS.CLIENT} label="Cliente com expositor" />
        <Legend color={BUYER_COLOR} label="Cliente que compra" />
        <Legend color={KIND_COLORS.PROSPECT} label="Prospecto" />
        <Legend color={KIND_COLORS.EXHIBITOR} label="Levar expositor" />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: KIND_COLORS.CLIENT,
              outline: `2px dashed ${APPROXIMATE_COLOR}`,
              outlineOffset: 2,
              display: "inline-block",
            }}
          />
          Localização aproximada
        </div>
        <span style={{ color: theme.subtext, fontSize: 12 }}>
          Dica: toque longo (ou botão direito) no mapa para adicionar um ponto ali.
        </span>
      </div>

      {/* Clientes fora do mapa ou com localizacao aproximada */}
      {pendingClients.length > 0 ? (
        <div
          style={{
            marginBottom: 14,
            border: "1px solid #fed7aa",
            background: theme.isDark ? "rgba(249,115,22,0.10)" : "#fff7ed",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setPendingOpen((open) => !open)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              border: "none",
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              ⚠ {pendingClients.length} cliente(s) para ajustar no mapa
              <span style={{ fontWeight: 600, color: theme.subtext, fontSize: 13 }}>
                {" "}
                · {pendingClients.filter((c) => c.latitude == null).length} fora do mapa,{" "}
                {pendingClients.filter((c) => c.latitude != null).length} com posição a conferir
              </span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#c2410c", whiteSpace: "nowrap" }}>
              {pendingOpen ? "Fechar ▲" : "Ver lista ▼"}
            </span>
          </button>

          {pendingOpen ? (
            <div style={{ maxHeight: 360, overflowY: "auto", borderTop: "1px solid #fed7aa" }}>
              {pendingClients.map((client) => {
                const badge = PENDING_LABELS[client.reason];
                return (
                  <div
                    key={client.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      padding: "10px 14px",
                      borderBottom: `1px solid ${theme.isDark ? "#1e293b" : "#fde6cf"}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>
                        {client.code ? `${client.code} · ` : ""}
                        {client.name}
                      </div>
                      <div style={{ fontSize: 12, color: theme.subtext }}>
                        {client.address || "Sem endereço cadastrado"}
                      </div>
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 800,
                          color: badge.color,
                          background: badge.bg,
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          map?.getContainer().scrollIntoView({ behavior: "smooth", block: "center" });
                          startPlacing(client);
                        }}
                        style={{ ...popupButtonStyle(true), height: 36 }}
                      >
                        {client.latitude == null ? "Colocar no mapa" : "Ajustar no mapa"}
                      </button>
                      <a
                        href={mode === "representative" ? `/rep/clients/${client.id}` : `/clients/${client.id}/edit`}
                        style={{ ...popupButtonStyle(false), height: 36 }}
                      >
                        Editar cadastro
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ position: "relative", marginBottom: 14 }}>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchResults[0]) {
              e.preventDefault();
              focusPoint(searchResults[0]);
            }
            if (e.key === "Escape") setSearchOpen(false);
          }}
          placeholder="Pesquisar cliente, prospecto ou cidade no mapa..."
          style={{
            width: "100%",
            height: 44,
            padding: "0 14px",
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: theme.isDark ? "#0b1324" : "#ffffff",
            color: theme.text,
            fontSize: 15,
            outline: "none",
          }}
        />

        {searchOpen && normalizeSearch(search).length >= 2 ? (
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 0,
              right: 0,
              zIndex: 1300,
              background: theme.isDark ? "#0f172a" : "#ffffff",
              border: `1px solid ${border}`,
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(2,6,23,0.25)",
              overflow: "hidden",
            }}
          >
            {searchResults.length === 0 ? (
              <div style={{ padding: 12, fontSize: 13, color: theme.subtext }}>
                Nenhum ponto encontrado. Se estiver com filtro de cidade, região ou tipo, confira os filtros acima.
              </div>
            ) : (
              searchResults.map((point) => (
                <button
                  key={pointKey(point)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => focusPoint(point)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: `1px solid ${border}`,
                    background: "transparent",
                    color: theme.text,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 999,
                      background: pointColor(point),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ display: "grid", minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {point.tradeName || point.name}
                    </span>
                    <span style={{ fontSize: 12, color: theme.subtext }}>
                      {pointLabel(point)} · {point.city || "-"}{point.state ? ` / ${point.state}` : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* Estabelecimentos do OpenStreetMap: um botao por tipo pra mostrar/ocultar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>
            Estabelecimentos no mapa
            <span style={{ fontWeight: 600, color: theme.subtext }}>
              {" "}
              {placesStatus.type === "loading"
                ? "· carregando..."
                : placesStatus.type === "zoom" && placeCategories.length > 0
                  ? "· aproxime o mapa (nível de bairro) para ver"
                  : placesStatus.type === "error"
                    ? `· ${placesStatus.text}`
                    : placeCategories.length > 0
                      ? `· ${visiblePlaces.length} na área carregada`
                      : "· escolha os tipos para mostrar"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => setAllPlaceCategories(true)} style={chipStyle(false, theme)}>
              Mostrar todos
            </button>
            <button type="button" onClick={() => setAllPlaceCategories(false)} style={chipStyle(false, theme)}>
              Ocultar todos
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PLACE_CATEGORIES.map((category) => {
            const active = placeCategories.includes(category.key);
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => togglePlaceCategory(category.key)}
                aria-pressed={active}
                style={chipStyle(active, theme)}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: active ? PLACE_COLOR : "transparent",
                    border: `2px solid ${PLACE_COLOR}`,
                    opacity: active ? 0.8 : 0.5,
                  }}
                />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${border}`,
          background: theme.isDark ? "#0b1324" : "#f8fafc",
        }}
      >
        <MapContainer center={center} zoom={11} style={mapStyle} ref={setMap} tapHold>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Reposiciona o mapa quando os filtros mudam os pontos */}
          <MapRecenter recenterKey={recenterKey} center={center} />
          <MapInteractions onLongPress={handleLongPress} onTap={handleTap} onViewChange={schedulePlacesLoad} />

          {/* Voce esta aqui (GPS do aparelho) */}
          {myPosition ? (
            <>
              <Circle
                center={[myPosition.lat, myPosition.lng]}
                radius={Math.min(myPosition.accuracy, 500)}
                interactive={false}
                pathOptions={{ color: "#0ea5e9", weight: 1, fillColor: "#0ea5e9", fillOpacity: 0.12 }}
              />
              <CircleMarker
                center={[myPosition.lat, myPosition.lng]}
                radius={8}
                bubblingMouseEvents={false}
                pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0ea5e9", fillOpacity: 1 }}
              >
                <Popup>
                  <div style={{ fontWeight: 800 }}>Você está aqui</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Precisão de ~{Math.round(myPosition.accuracy)} m
                  </div>
                </Popup>
              </CircleMarker>
            </>
          ) : null}

          {/* Pontinhos vermelhos discretos: estabelecimentos do OpenStreetMap */}
          {visiblePlaces.map((place) => (
            <CircleMarker
              key={place.id}
              center={[place.latitude, place.longitude]}
              radius={5}
              renderer={placesRenderer}
              bubblingMouseEvents={false}
              pathOptions={{
                color: PLACE_COLOR,
                weight: 1,
                opacity: 0.7,
                fillColor: PLACE_COLOR,
                fillOpacity: 0.35,
              }}
            >
              <Popup>
                <div style={{ minWidth: 220, maxWidth: 270 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>
                    {place.name || "Sem nome no mapa"}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: PLACE_COLOR, marginBottom: 6 }}>
                    {PLACE_LABELS[place.category]}
                  </div>
                  {formatPlaceAddress(place) ? (
                    <Info label="Endereço">{formatPlaceAddress(place)}</Info>
                  ) : null}
                  {place.phone ? <Info label="Telefone">{place.phone}</Info> : null}
                  <div style={{ fontSize: 11, color: "#64748b", margin: "6px 0 8px" }}>
                    Dados do OpenStreetMap, podem estar desatualizados.
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {KIND_ORDER.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => startFromPlace(place, kind)}
                        style={{
                          height: 32,
                          borderRadius: 8,
                          border: "none",
                          background: KIND_COLORS[kind],
                          color: kind === "PROSPECT" ? "#1f2937" : "#ffffff",
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        {kind === "EXHIBITOR"
                          ? "Levar expositor"
                          : kind === "CLIENT"
                            ? "Transformar em cliente"
                            : "Transformar em prospecto"}
                      </button>
                    ))}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {displayPoints.map((point) => {
            const key = pointKey(point);
            const isMoving = moving ? pointKey(moving.point) === key : false;
            const color = pointColor(point);
            const position: [number, number] = isMoving
              ? [moving!.position.lat, moving!.position.lng]
              : [point.displayLatitude, point.displayLongitude];
            const editingCoords = coordEdit?.key === key;

            return (
              <Marker
                key={key}
                ref={(marker) => {
                  if (marker) markerRefs.current.set(key, marker);
                  else markerRefs.current.delete(key);
                }}
                position={position}
                icon={createMarkerIcon(color, isMoving, Boolean(point.approximate) && !isMoving)}
                draggable={isMoving}
                zIndexOffset={isMoving ? 1000 : 0}
                eventHandlers={{
                  dragend(event) {
                    const latlng = (event.target as L.Marker).getLatLng();
                    setMoving((current) =>
                      current ? { ...current, position: { lat: latlng.lat, lng: latlng.lng } } : current
                    );
                  },
                }}
              >
                {isMoving ? null : (
                  <Popup>
                    <div style={{ minWidth: 240, maxWidth: 280 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          marginBottom: 6,
                        }}
                      >
                        {point.tradeName || point.name}
                      </div>
                      <Info label="Tipo">
                        <span style={{ color, fontWeight: 800 }}>{pointLabel(point)}</span>
                      </Info>
                      {point.approximate ? (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#c2410c",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 8,
                            padding: "6px 8px",
                            margin: "6px 0",
                          }}
                        >
                          Localização aproximada (bairro/cidade). Use "Mover no mapa" para
                          colocar no lugar certo.
                        </div>
                      ) : null}
                      <Info label="Cidade">
                        {point.city || "-"} / {point.state || "-"}
                      </Info>
                      <Info label="Região">{point.region?.name || "-"}</Info>
                      {point.kind === "CLIENT" ? (
                        <Info label="Última visita">
                          {formatDateBR(point.lastVisitAt)}
                        </Info>
                      ) : null}
                      <Info label="Observação">{point.notes || "-"}</Info>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        <PopupButton onClick={() => startMoving(point)} primary>
                          Mover no mapa
                        </PopupButton>
                        <PopupButton
                          onClick={() =>
                            setCoordEdit(
                              editingCoords
                                ? null
                                : { key, lat: formatCoord(point.latitude), lng: formatCoord(point.longitude) }
                            )
                          }
                        >
                          Coordenadas
                        </PopupButton>
                        {point.kind === "CLIENT" ? (
                          <a
                            href={mode === "representative" ? `/rep/clients/${point.id}` : `/clients/${point.id}/edit`}
                            style={popupButtonStyle(false)}
                          >
                            Editar cadastro
                          </a>
                        ) : null}
                      </div>

                      {editingCoords ? (
                        <div
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                              Latitude
                              <input
                                value={coordEdit!.lat}
                                inputMode="decimal"
                                onChange={(e) => setCoordEdit({ ...coordEdit!, lat: e.target.value })}
                                onPaste={(e) => {
                                  // Colou "lat, lng" do Google Maps: separa nos dois campos
                                  const text = e.clipboardData.getData("text");
                                  const pair = parseCoordinateInputs(text, "");
                                  if (pair && /[,;\s]\s*-?\d/.test(text.trim())) {
                                    e.preventDefault();
                                    setCoordEdit({ ...coordEdit!, lat: formatCoord(pair.lat), lng: formatCoord(pair.lng) });
                                  }
                                }}
                                style={popupInputStyle}
                              />
                            </label>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                              Longitude
                              <input
                                value={coordEdit!.lng}
                                inputMode="decimal"
                                onChange={(e) => setCoordEdit({ ...coordEdit!, lng: e.target.value })}
                                style={popupInputStyle}
                              />
                            </label>
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                            Pode colar as coordenadas copiadas do Google Maps no campo latitude.
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <PopupButton primary disabled={busy} onClick={() => saveCoordinates(point)}>
                              {busy ? "Salvando..." : "Alterar"}
                            </PopupButton>
                            <PopupButton onClick={() => setCoordEdit(null)}>Cancelar</PopupButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          })}

          {draft ? (
            <Marker
              position={[draft.position.lat, draft.position.lng]}
              icon={createMarkerIcon(KIND_COLORS[draft.kind], true)}
              draggable
              zIndexOffset={1000}
              eventHandlers={{
                dragend(event) {
                  const latlng = (event.target as L.Marker).getLatLng();
                  setDraft((current) =>
                    current ? { ...current, position: { lat: latlng.lat, lng: latlng.lng } } : current
                  );
                },
              }}
            />
          ) : null}
        </MapContainer>

        {/* Botao "minha localizacao" (GPS) */}
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          title="Minha localização"
          aria-label="Minha localização"
          style={{
            position: "absolute",
            right: 12,
            bottom: 28,
            zIndex: 1000,
            height: 44,
            padding: "0 14px",
            borderRadius: 999,
            border: "none",
            background: "#ffffff",
            color: "#0369a1",
            fontWeight: 800,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(15,23,42,0.25)",
            cursor: locating ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="#0ea5e9" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="#0ea5e9" strokeWidth="2" />
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#0ea5e9" strokeWidth="2" />
          </svg>
          {locating ? "Localizando..." : "Minha localização"}
        </button>

        {/* Mira fixa no centro: arrasta o mapa por baixo e confirma */}
        {aiming ? (
          <>
            <Crosshair color={KIND_COLORS[aiming]} />
            <MapBanner style={overlayCard}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                Adicionar {KIND_LABELS[aiming].toLowerCase()}
              </div>
              <div style={{ fontSize: 13, color: theme.subtext }}>
                Arraste o mapa até a mira ficar em cima do local.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <BannerButton color={KIND_COLORS[aiming]} onClick={confirmAim}>
                  Adicionar aqui
                </BannerButton>
                <BannerButton outline onClick={locateMe} theme={theme} disabled={locating}>
                  {locating ? "GPS..." : "Usar meu GPS"}
                </BannerButton>
                <BannerButton outline onClick={() => setAiming(null)} theme={theme}>
                  Cancelar
                </BannerButton>
              </div>
            </MapBanner>
          </>
        ) : null}

        {/* Colocar no mapa um cliente que estava sem localizacao */}
        {placing ? (
          <>
            <Crosshair color={KIND_COLORS.CLIENT} />
            <MapBanner style={overlayCard}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Colocando: {placing.name}</div>
              <div style={{ fontSize: 13, color: theme.subtext }}>
                {placing.address || "Sem endereço cadastrado"}
              </div>
              <div style={{ fontSize: 13, color: theme.subtext }}>
                Arraste o mapa até a mira ficar em cima do cliente.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <BannerButton color={KIND_COLORS.CLIENT} onClick={confirmPlacing} disabled={busy}>
                  {busy ? "Salvando..." : "Salvar aqui"}
                </BannerButton>
                <BannerButton outline onClick={locateMe} theme={theme} disabled={locating || busy}>
                  {locating ? "GPS..." : "Usar meu GPS"}
                </BannerButton>
                <BannerButton outline onClick={() => setPlacing(null)} theme={theme} disabled={busy}>
                  Cancelar
                </BannerButton>
              </div>
            </MapBanner>
          </>
        ) : null}

        {/* Mover ponto */}
        {moving ? (
          <MapBanner style={overlayCard}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              Movendo: {moving.point.tradeName || moving.point.name}
            </div>
            <div style={{ fontSize: 13, color: theme.subtext }}>
              Arraste o ponto ou toque no mapa onde ele deve ficar.
            </div>
            <div style={{ fontSize: 12, color: theme.subtext }}>
              {formatCoord(moving.position.lat)}, {formatCoord(moving.position.lng)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <BannerButton color={pointColor(moving.point)} onClick={saveMove} disabled={busy}>
                {busy ? "Salvando..." : "Salvar posição"}
              </BannerButton>
              <BannerButton outline onClick={moveToMyPosition} theme={theme} disabled={locating || busy}>
                {locating ? "GPS..." : "Usar meu GPS"}
              </BannerButton>
              <BannerButton outline onClick={() => setMoving(null)} theme={theme} disabled={busy}>
                Cancelar
              </BannerButton>
            </div>
          </MapBanner>
        ) : null}

        {/* Cadastro rapido */}
        {draft ? (
          <QuickAddForm
            key={draft.id}
            draft={draft}
            theme={theme}
            cardStyle={overlayCard}
            regions={regions}
            showRegion={!fixedRegionId}
            initialRegionId={suggestRegionId(draft.position)}
            onKindChange={(kind) => setDraft({ ...draft, kind })}
            onCancel={() => setDraft(null)}
            onSave={async (values) => {
              const prefill = draft.prefill;
              await onCreatePoint({
                ...values,
                kind: draft.kind,
                regionId: fixedRegionId || values.regionId,
                latitude: draft.position.lat,
                longitude: draft.position.lng,
                street: prefill?.street,
                number: prefill?.number,
                district: prefill?.district,
                city: prefill?.city,
                state: prefill?.state,
                cep: prefill?.cep,
              });
              if (prefill?.placeId) {
                setConvertedPlaceIds((current) => new Set(current).add(prefill.placeId));
              }
              setDraft(null);
              setFeedback({ type: "success", text: `${KIND_LABELS[draft.kind]} "${values.name}" adicionado no mapa.` });
            }}
          />
        ) : null}

        {feedback ? (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              zIndex: 1200,
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              background: feedback.type === "error" ? "#fef2f2" : "#f0fdf4",
              color: feedback.type === "error" ? "#b91c1c" : "#15803d",
              border: `1px solid ${feedback.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 900 }}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        ) : null}
      </div>

      {/* Botoes de adicionar embaixo do mapa */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
        {KIND_ORDER.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => startAiming(kind)}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              border: "none",
              background: KIND_COLORS[kind],
              color: kind === "PROSPECT" ? "#1f2937" : "#ffffff",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              flex: "1 1 180px",
            }}
          >
            + {kind === "EXHIBITOR" ? "Levar expositor" : `Novo ${KIND_LABELS[kind].toLowerCase()}`}
          </button>
        ))}
      </div>

      {displayPoints.length === 0 ? (
        <div
          style={{ marginTop: 14, fontSize: 14, color: theme.subtext }}
        >
          Nenhum ponto encontrado com os filtros selecionados.
        </div>
      ) : null}
    </div>
  );
}

function QuickAddForm({
  draft,
  theme,
  cardStyle,
  regions,
  showRegion,
  initialRegionId,
  onKindChange,
  onCancel,
  onSave,
}: {
  draft: { position: LatLng; kind: CommercialMapPointKind; prefill?: DraftPrefill };
  theme: ReturnType<typeof getThemeColors>;
  cardStyle: React.CSSProperties;
  regions: { id: string; name: string }[];
  showRegion: boolean;
  initialRegionId: string;
  onKindChange: (kind: CommercialMapPointKind) => void;
  onCancel: () => void;
  onSave: (values: { name: string; phone: string; notes: string; regionId: string }) => Promise<void>;
}) {
  const [name, setName] = useState(draft.prefill?.name ?? "");
  const [phone, setPhone] = useState(draft.prefill?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [regionId, setRegionId] = useState(initialRegionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
    background: theme.isDark ? "#0b1324" : "#ffffff",
    color: theme.text,
    fontSize: 15,
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "grid",
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    color: theme.subtext,
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome.");
      return;
    }
    if (showRegion && !regionId) {
      setError("Escolha a região.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await onSave({ name: name.trim(), phone, notes, regionId });
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        ...cardStyle,
        position: "absolute",
        top: 12,
        right: 12,
        width: "min(360px, calc(100% - 24px))",
        maxHeight: "calc(100% - 24px)",
        overflowY: "auto",
        zIndex: 1100,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 16 }}>Adicionar no mapa</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {KIND_ORDER.map((kind) => {
          const active = draft.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onKindChange(kind)}
              style={{
                minHeight: 40,
                padding: "4px 6px",
                borderRadius: 10,
                border: `2px solid ${KIND_COLORS[kind]}`,
                background: active ? KIND_COLORS[kind] : "transparent",
                color: active ? (kind === "PROSPECT" ? "#1f2937" : "#ffffff") : theme.text,
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {KIND_LABELS[kind]}
            </button>
          );
        })}
      </div>

      <label style={labelStyle}>
        Nome *
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={draft.kind === "CLIENT" ? "Nome do cliente" : "Nome do local"}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        WhatsApp / telefone
        <input
          value={phone}
          inputMode="tel"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(49) 99999-9999"
          style={inputStyle}
        />
      </label>

      {showRegion ? (
        <label style={labelStyle}>
          Região *
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} style={inputStyle}>
            <option value="">Selecione</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      ) : null}

      <label style={labelStyle}>
        Observação
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, height: "auto", padding: "8px 12px", resize: "vertical" }}
        />
      </label>

      <div style={{ fontSize: 12, color: theme.subtext }}>
        Local: {formatCoord(draft.position.lat)}, {formatCoord(draft.position.lng)} — dá pra
        arrastar o ponto no mapa pra ajustar. Cidade e endereço são preenchidos pelo local.
      </div>

      {error ? (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{error}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8 }}>
        <BannerButton color={KIND_COLORS[draft.kind]} submit disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </BannerButton>
        <BannerButton outline onClick={onCancel} theme={theme} disabled={saving}>
          Cancelar
        </BannerButton>
      </div>
    </form>
  );
}

function Crosshair({ color }: { color: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="18" fill="none" stroke="#ffffff" strokeWidth="6" />
        <circle cx="28" cy="28" r="18" fill="none" stroke={color} strokeWidth="3" />
        <line x1="28" y1="0" x2="28" y2="18" stroke={color} strokeWidth="3" />
        <line x1="28" y1="38" x2="28" y2="56" stroke={color} strokeWidth="3" />
        <line x1="0" y1="28" x2="18" y2="28" stroke={color} strokeWidth="3" />
        <line x1="38" y1="28" x2="56" y2="28" stroke={color} strokeWidth="3" />
        <circle cx="28" cy="28" r="4" fill={color} stroke="#ffffff" strokeWidth="2" />
      </svg>
    </div>
  );
}

function chipStyle(active: boolean, theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(220,38,38,0.55)" : theme.isDark ? "#1e293b" : theme.border}`,
    background: active ? (theme.isDark ? "rgba(220,38,38,0.16)" : "#fef2f2") : "transparent",
    color: theme.text,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function MapBanner({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div
      style={{
        ...style,
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(420px, calc(100% - 24px))",
        zIndex: 1100,
        padding: 14,
        display: "grid",
        gap: 4,
      }}
    >
      {children}
    </div>
  );
}

function BannerButton({
  children,
  onClick,
  color,
  outline,
  theme,
  disabled,
  submit,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  outline?: boolean;
  theme?: ReturnType<typeof getThemeColors>;
  disabled?: boolean;
  submit?: boolean;
}) {
  const yellow = color === KIND_COLORS.PROSPECT;
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: "1 1 110px",
        height: 42,
        padding: "0 10px",
        borderRadius: 10,
        border: outline ? `1px solid ${theme?.isDark ? "#334155" : theme?.border ?? "#cbd5e1"}` : "none",
        background: outline ? "transparent" : color,
        color: outline ? theme?.text ?? "#0f172a" : yellow ? "#1f2937" : "#ffffff",
        fontWeight: 800,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function popupButtonStyle(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    height: 32,
    padding: "0 10px",
    borderRadius: 8,
    border: primary ? "none" : "1px solid #cbd5e1",
    background: primary ? "#2563eb" : "#ffffff",
    color: primary ? "#ffffff" : "#0f172a",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    textDecoration: "none",
  };
}

function PopupButton({
  children,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...popupButtonStyle(primary), opacity: disabled ? 0.7 : 1 }}
    >
      {children}
    </button>
  );
}

const popupInputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: 34,
  marginTop: 2,
  padding: "0 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  color: "#0f172a",
  background: "#ffffff",
};

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ fontSize: 13, marginBottom: 4 }}>
      <strong>{label}:</strong> {children}
    </div>
  );
}
