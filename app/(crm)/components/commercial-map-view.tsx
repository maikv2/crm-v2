"use client";

import { useEffect, useMemo, useState } from "react";
import { getThemeColors } from "../../../lib/theme";

export type CommercialMapPoint = {
  id: string;
  kind: "CLIENT" | "PROSPECT";
  name: string;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  status: string;
  notes?: string | null;
  lastVisitAt?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

type DisplayPoint = CommercialMapPoint & {
  displayLatitude: number;
  displayLongitude: number;
};

type LeafletModules = {
  MapContainer: any;
  Marker: any;
  Popup: any;
  TileLayer: any;
  L: any;
};

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function getMarkerColor(point: CommercialMapPoint) {
  if (point.kind === "CLIENT") return "#2563eb";
  return "#eab308";
}

function createMarkerIcon(L: any, color: string) {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.18);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -8],
  });
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

export default function CommercialMapView({
  points,
  themeMode,
}: {
  points: CommercialMapPoint[];
  themeMode: "light" | "dark";
}) {
  const [leafletModules, setLeafletModules] = useState<LeafletModules | null>(null);

  useEffect(() => {
    let active = true;
    async function loadLeaflet() {
      const [reactLeaflet, leaflet] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      if (!active) return;
      setLeafletModules({
        MapContainer: reactLeaflet.MapContainer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        TileLayer: reactLeaflet.TileLayer,
        L: leaflet.default,
      });
    }
    loadLeaflet();
    return () => { active = false; };
  }, []);

  const safePoints = Array.isArray(points) ? points : [];
  const displayPoints = useMemo(() => spreadPoints(safePoints), [safePoints]);
  const theme = getThemeColors(themeMode);
  const border = theme.isDark ? "#1e293b" : theme.border;

  const center = useMemo<[number, number]>(() => {
    if (displayPoints.length > 0) {
      const avgLat = displayPoints.reduce((sum, item) => sum + item.displayLatitude, 0) / displayPoints.length;
      const avgLng = displayPoints.reduce((sum, item) => sum + item.displayLongitude, 0) / displayPoints.length;
      return [avgLat, avgLng];
    }
    return [-27.1004, -52.6152];
  }, [displayPoints]);

  const mapStyle = {
    height: "calc(100vh - 360px)",
    width: "100%",
    minHeight: 540,
  };

  const MapContainerComponent = leafletModules?.MapContainer;
  const MarkerComponent = leafletModules?.Marker;
  const PopupComponent = leafletModules?.Popup;
  const TileLayerComponent = leafletModules?.TileLayer;

  return (
    <div>
      <div style={{
        display: "flex", gap: 14, flexWrap: "wrap",
        marginBottom: 14, color: theme.text, fontSize: 13,
      }}>
        <Legend color="#2563eb" label="Cliente" />
        <Legend color="#eab308" label="Prospecto" />
      </div>

      <div style={{
        borderRadius: 18, overflow: "hidden",
        border: `1px solid ${border}`,
        background: theme.isDark ? "#0b1324" : "#f8fafc",
      }}>
        {!leafletModules || !MapContainerComponent || !MarkerComponent || !PopupComponent || !TileLayerComponent ? (
          <div style={{
            ...mapStyle, display: "flex", alignItems: "center",
            justifyContent: "center", color: theme.subtext, fontSize: 14,
          }}>
            Carregando mapa...
          </div>
        ) : (
          <MapContainerComponent center={center} zoom={11} style={mapStyle}>
            <TileLayerComponent
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {displayPoints.map((point) => {
              const color = getMarkerColor(point);
              const icon = createMarkerIcon(leafletModules.L, color);
              return (
                <MarkerComponent
                  key={`${point.kind}-${point.id}`}
                  position={[point.displayLatitude, point.displayLongitude]}
                  icon={icon}
                >
                  <PopupComponent>
                    <div style={{ minWidth: 240 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                        {point.tradeName || point.name}
                      </div>
                      <Info label="Tipo">
                        {point.kind === "CLIENT" ? "Cliente" : "Prospecto"}
                      </Info>
                      <Info label="Cidade">
                        {point.city || "-"} / {point.state || "-"}
                      </Info>
                      <Info label="Região">{point.region?.name || "-"}</Info>
                      <Info label="Última visita">{formatDateBR(point.lastVisitAt)}</Info>
                      <Info label="Observação">{point.notes || "-"}</Info>
                    </div>
                  </PopupComponent>
                </MarkerComponent>
              );
            })}
          </MapContainerComponent>
        )}
      </div>

      {displayPoints.length === 0 ? (
        <div style={{ marginTop: 14, fontSize: 14, color: theme.subtext }}>
          Nenhum ponto encontrado com os filtros selecionados.
        </div>
      ) : null}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 12, height: 12, borderRadius: 999,
        background: color, display: "inline-block",
      }} />
      {label}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, marginBottom: 4 }}>
      <strong>{label}:</strong> {children}
    </div>
  );
}