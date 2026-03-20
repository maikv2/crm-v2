"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

const MapAdjustView = dynamic(() => import("./map-adjust-view"), {
  ssr: false,
});

type ClientData = {
  id: string;
  name?: string | null;
  tradeName?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  country?: string | null;
  regionId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Point = {
  lat: number;
  lng: number;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
  primary = false,
  disabled = false,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: primary
          ? `1px solid ${theme.primary}`
          : `1px solid ${theme.border}`,
        background: primary
          ? hover
            ? "#1d4ed8"
            : theme.primary
          : hover
          ? theme.primary
          : theme.cardBg,
        color: primary || hover ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function inputStyle(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };
}

function labelStyle(theme: ThemeShape): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: theme.subtext,
    fontSize: 14,
  };
}

function formatAddress(client: ClientData | null) {
  if (!client) return "-";

  const parts = [
    client.street,
    client.number,
    client.district,
    client.city,
    client.state,
    client.cep,
    client.country || "Brasil",
  ].filter(Boolean);

  return parts.length ? parts.join(" - ") : "-";
}

export default function ClientMapAdjustPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [point, setPoint] = useState<Point | null>(null);
  const [latitudeInput, setLatitudeInput] = useState("");
  const [longitudeInput, setLongitudeInput] = useState("");

  useEffect(() => {
    async function loadClient() {
      if (!id) return;

      try {
        setLoading(true);
        setPageError(null);

        const response = await fetch(`/api/clients/${id}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Não foi possível carregar o cliente.");
        }

        setClient(data);

        if (
          typeof data?.latitude === "number" &&
          typeof data?.longitude === "number"
        ) {
          const currentPoint = {
            lat: data.latitude,
            lng: data.longitude,
          };

          setPoint(currentPoint);
          setLatitudeInput(String(data.latitude));
          setLongitudeInput(String(data.longitude));
        }
      } catch (error: any) {
        console.error(error);
        setPageError(error?.message || "Erro ao carregar cliente.");
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [id]);

  const initialCenter = useMemo<Point>(() => {
    if (point) return point;

    return {
      lat: -26.9597,
      lng: -52.5352,
    };
  }, [point]);

  function updatePoint(next: Point) {
    setPoint(next);
    setLatitudeInput(String(next.lat));
    setLongitudeInput(String(next.lng));
  }

  function applyManualCoordinates() {
    const lat = Number(latitudeInput.replace(",", "."));
    const lng = Number(longitudeInput.replace(",", "."));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setPageError("Latitude ou longitude inválida.");
      return;
    }

    setPageError(null);
    setPoint({ lat, lng });
  }

  async function handleSave() {
    if (!id || !client || !point) {
      setPageError("Selecione uma posição no mapa antes de salvar.");
      return;
    }

    try {
      setSaving(true);
      setPageError(null);

      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: point.lat,
          longitude: point.lng,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível salvar a posição.");
      }

      router.push(`/clients/${id}`);
    } catch (error: any) {
      console.error(error);
      setPageError(error?.message || "Erro ao salvar posição do cliente.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme.pageBg,
          padding: 28,
          color: theme.text,
        }}
      >
        Carregando posição do cliente...
      </div>
    );
  }

  if (!client) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme.pageBg,
          padding: 28,
          color: theme.text,
        }}
      >
        Cliente não encontrado.
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100vh",
        padding: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Clientes / Ajustar posição
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Ajustar posição no mapa
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Cliente: {client.tradeName || client.name || "-"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Voltar"
            theme={theme}
            onClick={() => router.push(`/clients/${id}`)}
          />
          <ActionButton
            label={saving ? "Salvando..." : "Salvar posição"}
            theme={theme}
            primary
            disabled={saving || !point}
            onClick={handleSave}
          />
        </div>
      </div>

      {pageError ? (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            background: theme.isDark ? "rgba(127,29,29,0.25)" : "#fef2f2",
            border: theme.isDark
              ? "1px solid rgba(248,113,113,0.35)"
              : "1px solid #fecaca",
            color: theme.isDark ? "#fecaca" : "#b91c1c",
          }}
        >
          {pageError}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 18 }}>
        <Block title="Endereço do cliente" theme={theme}>
          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 16,
              background: subtleCard,
              color: theme.text,
              lineHeight: 1.6,
            }}
          >
            {formatAddress(client)}
          </div>
        </Block>

        <Block title="Coordenadas" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <label style={labelStyle(theme)}>Latitude</label>
              <input
                style={inputStyle(theme, inputBg)}
                value={latitudeInput}
                onChange={(e) => setLatitudeInput(e.target.value)}
                placeholder="-26.86018"
              />
            </div>

            <div>
              <label style={labelStyle(theme)}>Longitude</label>
              <input
                style={inputStyle(theme, inputBg)}
                value={longitudeInput}
                onChange={(e) => setLongitudeInput(e.target.value)}
                placeholder="-52.56845"
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <ActionButton
                label="Aplicar coordenadas"
                theme={theme}
                onClick={applyManualCoordinates}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              border: `1px solid ${theme.border}`,
              borderRadius: 12,
              padding: 14,
              background: subtleCard,
              color: theme.subtext,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Clique no mapa para marcar a posição exata ou arraste o pin azul.
          </div>
        </Block>

        <Block title="Mapa" theme={theme}>
          <MapAdjustView
            center={initialCenter}
            marker={point}
            onSelect={updatePoint}
            theme={theme}
          />
        </Block>
      </div>
    </div>
  );
}