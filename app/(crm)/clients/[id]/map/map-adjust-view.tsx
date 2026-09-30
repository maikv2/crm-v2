"use client";

import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type ThemeShape = {
  isDark: boolean;
  text: string;
  subtext: string;
  border: string;
  cardBg: string;
  pageBg: string;
  primary: string;
};

type Point = {
  lat: number;
  lng: number;
};

function createMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 999px;
        background: #2563eb;
        border: 3px solid white;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.18);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function ClickHandler({
  onSelect,
}: {
  onSelect: (point: Point) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

/**
 * Leva o mapa ate o pino quando focusKey muda (coordenadas digitadas) - o
 * MapContainer ignora mudancas no `center` depois de montado, e sem isso o
 * pino ia pra fora da tela e parecia que nao tinha funcionado.
 */
function FlyToMarker({ marker, focusKey }: { marker: Point | null; focusKey: number }) {
  const map = useMap();

  useEffect(() => {
    if (!marker || focusKey === 0) return;
    map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 17), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, map]);

  return null;
}

export default function MapAdjustView({
  center,
  marker,
  onSelect,
  theme,
  focusKey = 0,
}: {
  center: Point;
  marker: Point | null;
  onSelect: (point: Point) => void;
  theme: ThemeShape;
  focusKey?: number;
}) {
  const icon = createMarkerIcon();

  return (
    <div
      style={{
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
      }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{
          width: "100%",
          height: 520,
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onSelect={onSelect} />
        <FlyToMarker marker={marker} focusKey={focusKey} />

        {marker ? (
          <Marker
            position={[marker.lat, marker.lng]}
            icon={icon}
            draggable
            eventHandlers={{
              dragend(event) {
                const target = event.target;
                const latlng = target.getLatLng();

                onSelect({
                  lat: latlng.lat,
                  lng: latlng.lng,
                });
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}