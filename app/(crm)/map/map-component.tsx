"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapClient = {
  id: string;
  name: string;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  mapStatus?: string | null;
  lastVisitAt?: string | null;
  needsReturn?: boolean;
  region?: {
    id: string;
    name: string;
  } | null;
};

function formatDateBR(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function getMarkerColor(client: MapClient) {
  if (client.needsReturn) return "#a855f7";

  switch ((client.mapStatus || "CLIENT").toUpperCase()) {
    case "PROSPECT":
      return "#eab308";
    case "LOST":
      return "#ef4444";
    case "VISITED":
      return "#22c55e";
    case "CLIENT":
    default:
      return "#2563eb";
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

export default function ClientsMap({ clients }: { clients: MapClient[] }) {
  const router = useRouter();

  const safeClients = Array.isArray(clients) ? clients : [];

  const center = useMemo<[number, number]>(() => {
    if (safeClients.length > 0) {
      const avgLat =
        safeClients.reduce((sum, item) => sum + item.latitude, 0) /
        safeClients.length;
      const avgLng =
        safeClients.reduce((sum, item) => sum + item.longitude, 0) /
        safeClients.length;

      return [avgLat, avgLng];
    }

    return [-27.1004, -52.6152];
  }, [safeClients]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 12,
          color: "#ffffff",
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
          Prospect
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
          Visitado
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
          Perdido
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
          Precisa voltar
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <MapContainer
          center={center}
          zoom={11}
          style={{
            height: "calc(100vh - 320px)",
            width: "100%",
            minHeight: 520,
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {safeClients.map((client) => {
            const color = getMarkerColor(client);
            const icon = createMarkerIcon(color);

            return (
              <Marker
                key={client.id}
                position={[client.latitude, client.longitude]}
                icon={icon}
              >
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                    >
                      {client.tradeName || client.name}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Cidade:</strong> {client.city || "-"} /{" "}
                      {client.state || "-"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Região:</strong> {client.region?.name || "-"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Status mapa:</strong> {client.mapStatus || "CLIENT"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>Precisa voltar:</strong>{" "}
                      {client.needsReturn ? "Sim" : "Não"}
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 8 }}>
                      <strong>Última visita:</strong>{" "}
                      {formatDateBR(client.lastVisitAt)}
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push(`/clients/${client.id}`)}
                      style={{
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "none",
                        background: "#2563eb",
                        color: "#ffffff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Abrir cliente
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {safeClients.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            color: "#ffffff",
            opacity: 0.8,
            fontSize: 14,
          }}
        >
          Nenhum ponto encontrado com os filtros atuais.
        </div>
      ) : null}
    </div>
  );
}