"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function getDaysLate(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diff = startToday.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

type AgendaExhibitorItem = {
  id: string;
  name?: string | null;
  code?: string | null;
  nextVisitAt?: string | null;
  client?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  } | null;
};

type AgendaVisitedItem = {
  id: string;
  visitedAt?: string | null;
  notes?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  exhibitor?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
};

type PortalOrderPendingItem = {
  id: string;
  status?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  client?: {
    id: string;
    name: string;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  items?: Array<{
    id: string;
    quantity: number;
    product?: {
      id: string;
      name: string;
      sku?: string | null;
    } | null;
  }>;
};

type AgendaResponse = {
  atrasados: AgendaExhibitorItem[];
  hoje: AgendaExhibitorItem[];
  proximos: AgendaExhibitorItem[];
  visitadosHoje: AgendaVisitedItem[];
  portalPedidosPendentes?: PortalOrderPendingItem[];
  regionName?: string | null;
};

type TabKey =
  | "atrasados"
  | "hoje"
  | "visitados"
  | "proximos"
  | "portal-pedidos";

export default function RepAgendaPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<AgendaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("hoje");

  async function loadAgenda() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/agenda", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar agenda.");
      }

      setData(json as AgendaResponse);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao carregar agenda.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();
  }, []);

  const atrasados = data?.atrasados ?? [];
  const hoje = data?.hoje ?? [];
  const visitadosHoje = data?.visitadosHoje ?? [];
  const proximos = data?.proximos ?? [];
  const portalPedidosPendentes = data?.portalPedidosPendentes ?? [];

  const currentList = useMemo(() => {
    const source =
      tab === "atrasados"
        ? atrasados
        : tab === "hoje"
        ? hoje
        : tab === "visitados"
        ? visitadosHoje
        : tab === "proximos"
        ? proximos
        : portalPedidosPendentes;

    const normalized = search.trim().toLowerCase();

    return source.filter((item: any) => {
      if (!normalized) return true;

      const haystack = [
        item.client?.name,
        item.client?.city,
        item.client?.state,
        item.client?.phone,
        item.name,
        item.code,
        item.exhibitor?.name,
        item.exhibitor?.code,
        item.notes,
        ...(Array.isArray(item.items)
          ? item.items.flatMap((subItem: any) => [
              subItem.product?.name,
              subItem.product?.sku,
            ])
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [tab, atrasados, hoje, visitadosHoje, proximos, portalPedidosPendentes, search]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const tabButton = (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 12,
    border: active ? `1px solid ${theme.primary}` : `1px solid ${border}`,
    background: active ? theme.primary : cardBg,
    color: active ? "white" : theme.text,
    cursor: "pointer",
    fontWeight: 800,
  });

  const actionBtn: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    textDecoration: "none",
    fontWeight: 800,
  };

  const actionPrimary: React.CSSProperties = {
    ...actionBtn,
    background: theme.primary,
    border: `1px solid ${theme.primary}`,
    color: "white",
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
        Carregando agenda...
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
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              Agenda do Representante
            </h1>
            <div style={{ color: muted, marginTop: 8 }}>
              Região: {data?.regionName || "Não vinculada"}
            </div>
          </div>

          <button onClick={loadAgenda} style={actionBtn}>
            Atualizar agenda
          </button>
        </div>

        {error ? (
          <div style={{ ...card, marginBottom: 20, border: "1px solid #ef4444" }}>
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Atrasados"
            value={atrasados.length}
            theme={theme}
            alert={atrasados.length > 0}
          />
          <StatCard label="Hoje" value={hoje.length} theme={theme} />
          <StatCard label="Visitados hoje" value={visitadosHoje.length} theme={theme} />
          <StatCard label="Próximos" value={proximos.length} theme={theme} />
          <StatCard
            label="Pedidos do portal"
            value={portalPedidosPendentes.length}
            theme={theme}
            alert={portalPedidosPendentes.length > 0}
          />
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button style={tabButton(tab === "atrasados")} onClick={() => setTab("atrasados")}>
              Atrasados
            </button>
            <button style={tabButton(tab === "hoje")} onClick={() => setTab("hoje")}>
              Hoje
            </button>
            <button
              style={tabButton(tab === "visitados")}
              onClick={() => setTab("visitados")}
            >
              Visitados hoje
            </button>
            <button
              style={tabButton(tab === "proximos")}
              onClick={() => setTab("proximos")}
            >
              Próximos
            </button>
            <button
              style={tabButton(tab === "portal-pedidos")}
              onClick={() => setTab("portal-pedidos")}
            >
              Pedidos do portal
            </button>
          </div>

          <input
            type="text"
            placeholder="Buscar cliente, cidade, telefone, expositor, pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>

        {currentList.length === 0 ? (
          <div style={card}>Nenhum item encontrado nesta aba.</div>
        ) : tab === "portal-pedidos" ? (
          <div style={{ display: "grid", gap: 12 }}>
            {currentList.map((item: any) => {
              const totalItems = Array.isArray(item.items)
                ? item.items.reduce(
                    (sum: number, subItem: any) => sum + (subItem.quantity ?? 0),
                    0
                  )
                : 0;

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
                        {item.client?.name || "Cliente"}
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: "rgba(37,99,235,0.15)",
                          color: "#2563eb",
                        }}
                      >
                        Pedido do portal
                      </span>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 6, color: muted }}>
                      <div>
                        Cidade:{" "}
                        {[item.client?.city, item.client?.state]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </div>
                      <div>Telefone: {item.client?.phone || "-"}</div>
                      <div>Data do pedido: {formatDateBR(item.createdAt)}</div>
                      <div>Itens solicitados: {totalItems}</div>
                      <div>Observações: {item.notes || "-"}</div>
                    </div>

                    {Array.isArray(item.items) && item.items.length > 0 ? (
                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        {item.items.map((subItem: any) => (
                          <div
                            key={subItem.id}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: `1px solid ${border}`,
                              background: theme.isDark ? "#111827" : "#f8fafc",
                              fontSize: 14,
                            }}
                          >
                            {subItem.product?.name || "Produto"} • {subItem.quantity} un
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
                    {item.client?.id ? (
                      <>
                        <Link href={`/clients/${item.client.id}`} style={actionBtn}>
                          Abrir cliente
                        </Link>
                        <Link
                          href={`/rep/orders/new?clientId=${item.client.id}`}
                          style={actionPrimary}
                        >
                          Transformar em venda
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {currentList.map((item: any) => {
              const client =
                tab === "visitados"
                  ? item.client
                  : item.client ?? null;

              const clientId = client?.id ?? null;
              const clientName =
                client?.name ||
                item.client?.name ||
                item.name ||
                item.code ||
                "Cliente";

              const city =
                item.client?.city ??
                "-";

              const referenceDate =
                tab === "visitados"
                  ? item.visitedAt || null
                  : item.nextVisitAt || null;

              const daysLate =
                tab === "atrasados" ? Math.max(0, getDaysLate(referenceDate)) : 0;

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
                      <div style={{ fontSize: 20, fontWeight: 900 }}>{clientName}</div>

                      {tab === "atrasados" && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
                          }}
                        >
                          {daysLate} dia(s) de atraso
                        </span>
                      )}

                      {tab === "visitados" && (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: "rgba(34,197,94,0.15)",
                            color: "#22c55e",
                          }}
                        >
                          Visitado hoje
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 6, color: muted }}>
                      <div>Cidade: {city}</div>
                      <div>
                        Expositor:{" "}
                        {tab === "visitados"
                          ? item.exhibitor?.name || item.exhibitor?.code || "-"
                          : item.name || item.code || "-"}
                      </div>
                      <div>Data de referência: {formatDateBR(referenceDate)}</div>
                      {tab === "visitados" ? (
                        <div>Observações: {item.notes || "-"}</div>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
                    {clientId ? (
                      <>
                        <Link href={`/clients/${clientId}`} style={actionBtn}>
                          Abrir cliente
                        </Link>
                        <Link
                          href={`/rep/orders/new?clientId=${clientId}`}
                          style={actionPrimary}
                        >
                          Novo pedido
                        </Link>
                        <Link href={`/rep/visit?clientId=${clientId}`} style={actionBtn}>
                          Registrar visita
                        </Link>
                      </>
                    ) : null}

                    {tab !== "visitados" && item.id ? (
                      <Link
                        href={`/rep/exhibitors/${item.id}/return`}
                        style={actionBtn}
                      >
                        Registrar devolução
                      </Link>
                    ) : null}
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

function StatCard({
  label,
  value,
  theme,
  alert,
}: {
  label: string;
  value: number;
  theme: any;
  alert?: boolean;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
        color: theme.text,
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 13 }}>{label}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginTop: 8,
          color: alert ? "#ef4444" : theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}