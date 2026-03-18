"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ExhibitorStatus =
  | "ACTIVE"
  | "MAINTENANCE"
  | "DAMAGED"
  | "REMOVED"
  | "INACTIVE";

type ExhibitorType =
  | "FLOOR"
  | "ACRYLIC_CLOSED"
  | "ACRYLIC_OPEN"
  | "ACRYLIC_OPEN_SMALL";

type ExhibitorRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  model?: string | null;
  status: ExhibitorStatus;
  type?: ExhibitorType | null;
  installedAt: string;
  nextVisitAt?: string | null;
  lastVisitAt?: string | null;
  client: {
    id: string;
    name: string;
  };
  region: {
    id: string;
    name: string;
  };
};

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function typeLabel(value?: ExhibitorType | null) {
  switch (value) {
    case "FLOOR":
      return "Chão";
    case "ACRYLIC_CLOSED":
      return "Acrílico fechado";
    case "ACRYLIC_OPEN":
      return "Acrílico aberto";
    case "ACRYLIC_OPEN_SMALL":
      return "Acrílico aberto pequeno";
    default:
      return "-";
  }
}

function statusLabel(value: ExhibitorStatus) {
  switch (value) {
    case "ACTIVE":
      return "Ativo";
    case "MAINTENANCE":
      return "Manutenção";
    case "DAMAGED":
      return "Danificado";
    case "REMOVED":
      return "Removido";
    case "INACTIVE":
      return "Inativo";
    default:
      return value;
  }
}

const exhibitorTypeOptions: { value: ExhibitorType; label: string }[] = [
  { value: "FLOOR", label: "Chão" },
  { value: "ACRYLIC_CLOSED", label: "Acrílico fechado" },
  { value: "ACRYLIC_OPEN", label: "Acrílico aberto" },
  { value: "ACRYLIC_OPEN_SMALL", label: "Acrílico aberto pequeno" },
];

export default function ExhibitorsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const clientId = params.get("clientId") ?? "";

  const [items, setItems] = useState<ExhibitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [regionId, setRegionId] = useState("");
  const [type, setType] = useState<ExhibitorType | "">("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        if (clientId) qs.set("clientId", clientId);

        const res = await fetch(
          `/api/exhibitors${qs.toString() ? `?${qs.toString()}` : ""}`,
          {
            cache: "no-store",
          }
        );

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar expositores.");
        }

        if (active) {
          setItems(Array.isArray(json) ? json : []);
        }
      } catch (err: any) {
        console.error(err);
        if (active) {
          setError(err?.message || "Erro ao carregar expositores.");
          setItems([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [clientId]);

  const regionOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of items) {
      if (item.region?.id && item.region?.name) {
        map.set(item.region.id, item.region.name);
      }
    }

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (regionId && item.region?.id !== regionId) return false;
      if (type && item.type !== type) return false;

      if (!q) return true;

      const haystack = [
        item.code,
        item.name,
        item.model,
        item.client?.name,
        item.region?.name,
        statusLabel(item.status),
        typeLabel(item.type),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, search, regionId, type]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    padding: "0 14px",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        Carregando expositores...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        color: theme.text,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: muted,
                marginBottom: 8,
              }}
            >
              Cadastros
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                margin: 0,
              }}
            >
              Expositores
            </h1>
          </div>

          <button
            style={buttonStyle}
            onClick={() => router.push("/exhibitors/new")}
          >
            Novo expositor
          </button>
        </div>

        <div
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 18,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr",
              gap: 12,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nome, cliente, modelo..."
              style={inputStyle}
            />

            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Todas as regiões</option>
              {regionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value as ExhibitorType | "")}
              style={inputStyle}
            >
              <option value="">Todos os tipos</option>
              {exhibitorTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <div
            style={{
              background: cardBg,
              border: "1px solid #ef4444",
              borderRadius: 16,
              padding: 16,
              color: "#ef4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 22,
              color: muted,
            }}
          >
            Nenhum expositor encontrado.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 18,
                  padding: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                      }}
                    >
                      {item.name || item.code || "Expositor"}
                    </div>

                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: subtleCard,
                        border: `1px solid ${border}`,
                        fontSize: 12,
                        fontWeight: 800,
                        color: theme.text,
                      }}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 6, color: muted }}>
                    <div>Código: {item.code || "-"}</div>
                    <div>Modelo: {item.model || "-"}</div>
                    <div>Tipo: {typeLabel(item.type)}</div>
                    <div>Cliente: {item.client?.name || "-"}</div>
                    <div>Região: {item.region?.name || "-"}</div>
                    <div>Instalado em: {formatDateBR(item.installedAt)}</div>
                    <div>Última visita: {formatDateBR(item.lastVisitAt)}</div>
                    <div>Próxima visita: {formatDateBR(item.nextVisitAt)}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    minWidth: 180,
                    alignContent: "start",
                  }}
                >
                  <button
                    style={buttonStyle}
                    onClick={() => router.push(`/exhibitors/${item.id}`)}
                  >
                    Abrir expositor
                  </button>

                  <button
                    style={buttonStyle}
                    onClick={() => router.push(`/visits/new?exhibitorId=${item.id}`)}
                  >
                    Registrar visita
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}