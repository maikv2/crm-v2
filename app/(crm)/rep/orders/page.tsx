"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function getStatusLabel(status?: string | null) {
  if (!status) return "-";

  const map: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PARTIAL: "Parcial",
    CANCELLED: "Cancelado",
    OVERDUE: "Vencido",
  };

  return map[status] || status;
}

type RepOrderItem = {
  id: string;
  number?: number | null;
  status?: string | null;
  type?: string | null;
  totalCents?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
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

type RepOrdersResponse = {
  items: RepOrderItem[];
};

export default function RepOrdersPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [items, setItems] = useState<RepOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/orders", {
        cache: "no-store",
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar pedidos.");
      }

      const data = raw as RepOrdersResponse;
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
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
        if (onlyPending && item.paymentStatus !== "PENDING") {
          return false;
        }

        const haystack = [
          String(item.number ?? ""),
          item.client?.name,
          item.exhibitor?.name,
          item.exhibitor?.code,
          item.status,
          item.paymentMethod,
          item.paymentStatus,
          item.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!normalized) return true;
        return haystack.includes(normalized);
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || a.issuedAt || 0).getTime();
        const bTime = new Date(b.createdAt || b.issuedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [items, search, onlyPending]);

  const summary = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        acc.totalOrders += 1;
        acc.totalValueCents += item.totalCents ?? 0;

        if (item.paymentStatus === "PENDING") {
          acc.pending += 1;
        }

        if (item.paymentStatus === "PAID") {
          acc.paid += 1;
        }

        return acc;
      },
      {
        totalOrders: 0,
        totalValueCents: 0,
        pending: 0,
        paid: 0,
      }
    );
  }, [filteredItems]);

  function openPdf(orderId: string) {
    window.open(`/api/orders/${orderId}/pdf`, "_blank", "noopener,noreferrer");
  }

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
        Carregando pedidos...
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
            Pedidos da Região
          </h1>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={btnSecondary} onClick={loadData}>
              Atualizar
            </button>
            <button
              style={btnPrimary}
              onClick={() => router.push("/rep/orders/new")}
            >
              Novo pedido
            </button>
          </div>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Visualização dos pedidos vinculados à região do representante.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard
            label="Total de pedidos"
            value={summary.totalOrders}
            theme={theme}
          />
          <SummaryCard
            label="Pendentes"
            value={summary.pending}
            theme={theme}
          />
          <SummaryCard
            label="Pagos"
            value={summary.paid}
            theme={theme}
          />
          <SummaryCard
            label="Valor total"
            value={money(summary.totalValueCents)}
            theme={theme}
            textValue
          />
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
            placeholder="Buscar por número, cliente, expositor, status..."
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
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            Mostrar somente pedidos pendentes
          </label>

          <div style={{ fontSize: 14, color: muted }}>
            {filteredItems.length} pedido(s) encontrado(s)
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
          <div style={card}>Nenhum pedido encontrado para esta região.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredItems.map((item) => (
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
                      Pedido #{item.number ?? "-"}
                    </div>

                    <StatusBadge
                      label={getStatusLabel(item.paymentStatus)}
                      color={
                        item.paymentStatus === "PAID"
                          ? "#22c55e"
                          : item.paymentStatus === "PENDING"
                          ? "#f59e0b"
                          : item.paymentStatus === "PARTIAL"
                            ? "#3b82f6"
                            : "#64748b"
                      }
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
                    <div>Cliente: {item.client?.name ?? "-"}</div>
                    <div>
                      Expositor: {item.exhibitor?.name || item.exhibitor?.code || "-"}
                    </div>
                    <div>Tipo: {item.type ?? "-"}</div>
                    <div>Pagamento: {item.paymentMethod ?? "-"}</div>
                    <div>Emitido em: {formatDateBR(item.issuedAt || item.createdAt)}</div>
                  </div>
                </div>

                <div
                  style={{
                    minWidth: 220,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 12,
                      textAlign: "right",
                    }}
                  >
                    <div style={{ fontSize: 12, color: muted }}>Valor total</div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        marginTop: 4,
                      }}
                    >
                      {money(item.totalCents ?? 0)}
                    </div>
                  </div>

                  <button
                    style={btnSecondary}
                    onClick={() => router.push(`/rep/orders/${item.id}`)}
                  >
                    Abrir pedido
                  </button>

                  <button
                    style={btnSecondary}
                    onClick={() => openPdf(item.id)}
                  >
                    Baixar PDF
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

function SummaryCard({
  label,
  value,
  theme,
  textValue,
}: {
  label: string;
  value: string | number;
  theme: any;
  textValue?: boolean;
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
      }}
    >
      <div style={{ fontSize: 13, color: theme.isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: textValue ? 20 : 28,
          fontWeight: 900,
          marginTop: 6,
          wordBreak: "break-word",
        }}
      >
        {value}
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