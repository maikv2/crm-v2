"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
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

export default function MapAdjustView({
  center,
  marker,
  onSelect,
  theme,
}: {
  center: Point;
  marker: Point | null;
  onSelect: (point: Point) => void;
  theme: ThemeShape;
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