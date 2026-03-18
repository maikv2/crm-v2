"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function getStatusLabel(status?: string | null) {
  switch (status) {
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
      return status || "-";
  }
}

function getStatusColor(status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return "#22c55e";
    case "MAINTENANCE":
      return "#f59e0b";
    case "DAMAGED":
      return "#ef4444";
    case "REMOVED":
      return "#64748b";
    case "INACTIVE":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

type RepExhibitorItem = {
  id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  model?: string | null;
  installedAt?: string | null;
  nextVisitAt?: string | null;
  lastVisitAt?: string | null;
  client?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
};

type RepExhibitorsResponse = {
  items: RepExhibitorItem[];
};

export default function RepExhibitorsPage() {
  return (
    <Suspense fallback={<RepExhibitorsPageLoading />}>
      <RepExhibitorsPageContent />
    </Suspense>
  );
}

function RepExhibitorsPageLoading() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);
  const pageBg = theme.isDark ? "#081225" : theme.pageBg;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      Carregando expositores...
    </div>
  );
}

function RepExhibitorsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const clientIdFilter = searchParams.get("clientId") ?? "";

  const [items, setItems] = useState<RepExhibitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/exhibitors", {
        cache: "no-store",
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar expositores.");
      }

      const data = raw as RepExhibitorsResponse;
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar expositores."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (clientIdFilter && item.client?.id !== clientIdFilter) {
          return false;
        }

        if (onlyActive && item.status !== "ACTIVE") {
          return false;
        }

        const haystack = [
          item.name,
          item.code,
          item.model,
          item.client?.name,
          item.client?.city,
          item.client?.state,
          getStatusLabel(item.status),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!normalized) return true;
        return haystack.includes(normalized);
      })
      .sort((a, b) =>
        String(a.name ?? a.code ?? "").localeCompare(
          String(b.name ?? b.code ?? ""),
          "pt-BR"
        )
      );
  }, [items, search, onlyActive, clientIdFilter]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
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
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Expositores da Região
          </h1>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Visualização dos expositores vinculados à região do representante.
        </div>

        <div
          style={{
            ...card,
            marginBottom: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Buscar por nome, código, cliente, cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: theme.text,
            }}
          >
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Mostrar somente expositores ativos
          </label>

          <div style={{ fontSize: 14, color: muted }}>
            {filteredItems.length} expositor(es) encontrado(s)
          </div>
        </div>

        {error ? (
          <div
            style={{
              ...card,
              marginBottom: 16,
              border: "1px solid #ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        {filteredItems.length === 0 ? (
          <div style={card}>Nenhum expositor encontrado para esta região.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredItems.map((item) => {
              const statusColor = getStatusColor(item.status);

              return (
                <div
                  key={item.id}
                  style={{
                    ...card,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: 20, fontWeight: 900 }}>
                        {item.name || item.code || "Expositor"}
                      </div>

                      <StatusBadge
                        label={getStatusLabel(item.status)}
                        color={statusColor}
                      />
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gap: 6,
                        color: muted,
                      }}
                    >
                      <div>Código: {item.code ?? "-"}</div>
                      <div>Modelo: {item.model ?? "-"}</div>
                      <div>Cliente: {item.client?.name ?? "-"}</div>
                      <div>
                        Cidade:{" "}
                        {[item.client?.city, item.client?.state]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </div>
                      <div>Instalado em: {formatDateBR(item.installedAt)}</div>
                      <div>Última visita: {formatDateBR(item.lastVisitAt)}</div>
                      <div>Próxima visita: {formatDateBR(item.nextVisitAt)}</div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      minWidth: 220,
                    }}
                  >
                    <button
                      style={btnSecondary}
                      onClick={() => router.push(`/rep/exhibitors/${item.id}`)}
                    >
                      Abrir expositor
                    </button>

                    <button
                      style={btnPrimary}
                      onClick={() =>
                        router.push(`/rep/exhibitors/${item.id}/return`)
                      }
                    >
                      Registrar devolução
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 8px",
        borderRadius: 999,
        background: `${color}20`,
        color,
      }}
    >
      {label}
    </span>
  );
}