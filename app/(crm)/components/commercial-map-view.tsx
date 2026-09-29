"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getThemeColors } from "../../../lib/theme";

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
};

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

function createMarkerIcon(color: string, highlighted = false) {
  const cacheKey = `${color}-${highlighted}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const size = highlighted ? 26 : 18;
  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 999px;
        background: ${color};
        border: 3px solid white;
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
}: {
  onLongPress: (latlng: LatLng) => void;
  onTap: (latlng: LatLng) => void;
}) {
  useMapEvents({
    contextmenu(event) {
      onLongPress({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
    click(event) {
      onTap({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
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
  const [draft, setDraft] = useState<{ position: LatLng; kind: CommercialMapPointKind } | null>(null);
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
    setDraft(null);
    setFeedback(null);
    setAiming(kind);
  }

  function confirmAim() {
    if (!map || !aiming) return;
    const c = map.getCenter();
    setDraft({ position: { lat: c.lat, lng: c.lng }, kind: aiming });
    setAiming(null);
  }

  function handleLongPress(position: LatLng) {
    if (moving || busy) return;
    map?.closePopup();
    setAiming(null);
    setFeedback(null);
    setDraft({ position, kind: "PROSPECT" });
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
        <Legend color={KIND_COLORS.CLIENT} label="Cliente" />
        <Legend color={KIND_COLORS.PROSPECT} label="Prospecto" />
        <Legend color={KIND_COLORS.EXHIBITOR} label="Levar expositor" />
        <span style={{ color: theme.subtext, fontSize: 12 }}>
          Dica: toque longo (ou botão direito) no mapa para adicionar um ponto ali.
        </span>
      </div>

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
                      background: KIND_COLORS[point.kind],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ display: "grid", minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {point.tradeName || point.name}
                    </span>
                    <span style={{ fontSize: 12, color: theme.subtext }}>
                      {KIND_LABELS[point.kind]} · {point.city || "-"}{point.state ? ` / ${point.state}` : ""}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
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
          <MapInteractions onLongPress={handleLongPress} onTap={handleTap} />

          {displayPoints.map((point) => {
            const key = pointKey(point);
            const isMoving = moving ? pointKey(moving.point) === key : false;
            const color = KIND_COLORS[point.kind];
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
                icon={createMarkerIcon(color, isMoving)}
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
                        <span style={{ color, fontWeight: 800 }}>{KIND_LABELS[point.kind]}</span>
                      </Info>
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

        {/* Mira fixa no centro: arrasta o mapa por baixo e confirma */}
        {aiming ? (
          <>
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
                <circle cx="28" cy="28" r="18" fill="none" stroke={KIND_COLORS[aiming]} strokeWidth="3" />
                <line x1="28" y1="0" x2="28" y2="18" stroke={KIND_COLORS[aiming]} strokeWidth="3" />
                <line x1="28" y1="38" x2="28" y2="56" stroke={KIND_COLORS[aiming]} strokeWidth="3" />
                <line x1="0" y1="28" x2="18" y2="28" stroke={KIND_COLORS[aiming]} strokeWidth="3" />
                <line x1="38" y1="28" x2="56" y2="28" stroke={KIND_COLORS[aiming]} strokeWidth="3" />
                <circle cx="28" cy="28" r="4" fill={KIND_COLORS[aiming]} stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
            <MapBanner style={overlayCard}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>
                Adicionar {KIND_LABELS[aiming].toLowerCase()}
              </div>
              <div style={{ fontSize: 13, color: theme.subtext }}>
                Arraste o mapa até a mira ficar em cima do local.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <BannerButton color={KIND_COLORS[aiming]} onClick={confirmAim}>
                  Adicionar aqui
                </BannerButton>
                <BannerButton outline onClick={() => setAiming(null)} theme={theme}>
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
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <BannerButton color={KIND_COLORS[moving.point.kind]} onClick={saveMove} disabled={busy}>
                {busy ? "Salvando..." : "Salvar posição"}
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
            key={`${draft.position.lat}-${draft.position.lng}`}
            draft={draft}
            theme={theme}
            cardStyle={overlayCard}
            regions={regions}
            showRegion={!fixedRegionId}
            initialRegionId={suggestRegionId(draft.position)}
            onKindChange={(kind) => setDraft({ ...draft, kind })}
            onCancel={() => setDraft(null)}
            onSave={async (values) => {
              await onCreatePoint({
                ...values,
                kind: draft.kind,
                regionId: fixedRegionId || values.regionId,
                latitude: draft.position.lat,
                longitude: draft.position.lng,
              });
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
  draft: { position: LatLng; kind: CommercialMapPointKind };
  theme: ReturnType<typeof getThemeColors>;
  cardStyle: React.CSSProperties;
  regions: { id: string; name: string }[];
  showRegion: boolean;
  initialRegionId: string;
  onKindChange: (kind: CommercialMapPointKind) => void;
  onCancel: () => void;
  onSave: (values: { name: string; phone: string; notes: string; regionId: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
        flex: 1,
        height: 42,
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
