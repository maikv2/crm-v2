"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

function formatDateBR(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function getMarkerColor(point: CommercialMapPoint) {
  if (point.kind === "CLIENT") {
    if (point.status === "RETURN") return "#a855f7";
    return "#2563eb";
  }

  switch ((point.status || "PENDING").toUpperCase()) {
    case "RETURN":
      return "#a855f7";
    case "NO_RETURN":
      return "#ef4444";
    case "CONVERTED":
      return "#22c55e";
    case "PENDING":
    default:
      return "#eab308";
  }
}

function createMarkerIcon(color: string) {
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

    if (!groups.has(key)) {
      groups.set(key, []);
    }

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
      const offsetLat = Math.sin(angle) * radius;
      const offsetLng = Math.cos(angle) * radius;

      result.push({
        ...point,
        displayLatitude: point.latitude + offsetLat,
        displayLongitude: point.longitude + offsetLng,
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
  const safePoints = Array.isArray(points) ? points : [];
  const displayPoints = useMemo(() => spreadPoints(safePoints), [safePoints]);
  const theme = getThemeColors(themeMode);

  const border = theme.isDark ? "#1e293b" : theme.border;

  const center = useMemo<[number, number]>(() => {
    if (displayPoints.length > 0) {
      const avgLat =
        displayPoints.reduce((sum, item) => sum + item.latitude, 0) /
        displayPoints.length;
      const avgLng =
        displayPoints.reduce((sum, item) => sum + item.longitude, 0) /
        displayPoints.length;

      return [avgLat, avgLng];
    }

    return [-27.1004, -52.6152];
  }, [displayPoints]);

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#2563eb",
              display: "inline-block",
            }}
          />
          Cliente
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#eab308",
              display: "inline-block",
            }}
          />
          Prospecto pendente
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#a855f7",
              display: "inline-block",
            }}
          />
          Voltar
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#ef4444",
              display: "inline-block",
            }}
          />
          Não voltar
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#22c55e",
              display: "inline-block",
            }}
          />
          Convertido
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${border}`,
          background: theme.isDark ? "#0b1324" : "#f8fafc",
        }}
      >
        <MapContainer
          center={center}
          zoom={11}
          style={{
            height: "calc(100vh - 360px)",
            width: "100%",
            minHeight: 540,
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {displayPoints.map((point) => {
            const color = getMarkerColor(point);
            const icon = createMarkerIcon(color);

            return (
              <Marker
                key={`${point.kind}-${point.id}`}
                position={[point.displayLatitude, point.displayLongitude]}
                icon={icon}
              >
                <Popup>
                  <div style={{ minWidth: 240 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                    >
                      {point.tradeName || point.name}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Tipo:</strong>{" "}
                      {point.kind === "CLIENT" ? "Cliente" : "Prospecto"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Cidade:</strong> {point.city || "-"} /{" "}
                      {point.state || "-"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Região:</strong> {point.region?.name || "-"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Status:</strong> {point.status}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Última visita:</strong>{" "}
                      {formatDateBR(point.lastVisitAt)}
                    </div>

                    <div style={{ fontSize: 13 }}>
                      <strong>Observação:</strong> {point.notes || "-"}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {displayPoints.length === 0 ? (
        <div
          style={{
            marginTop: 14,
            fontSize: 14,
            color: theme.subtext,
          }}
        >
          Nenhum ponto encontrado com os filtros selecionados.
        </div>
      ) : null}
    </div>
  );
}