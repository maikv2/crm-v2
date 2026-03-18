"use client";

import { useEffect, useMemo, useState } from "react";
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

type Receivable = {
  id: string;
  amountCents: number;
  dueDate?: string | null;
  status?: "PENDING" | "PAID" | "OVERDUE" | null;
  client?: {
    id: string;
    name: string;
  } | null;
  order?: {
    id: string;
    number?: number | null;
  } | null;
};

type Response = {
  region?: {
    id: string;
    name: string;
  } | null;
  items: Receivable[];
};

export default function RepReceivablesPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/finance/receivables", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar contas a receber.");
      }

      setData({
        region: json?.region ?? null,
        items: Array.isArray(json?.items) ? json.items : [],
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar contas a receber."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const items = data?.items || [];

    return items.reduce(
      (acc, item) => {
        acc.total += item.amountCents;

        if (item.status === "PAID") {
          acc.paid += item.amountCents;
        }

        if (item.status === "PENDING") {
          acc.pending += item.amountCents;
        }

        if (item.status === "OVERDUE") {
          acc.overdue += item.amountCents;
        }

        return acc;
      },
      {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
      }
    );
  }, [data]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
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
        Carregando contas a receber...
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
      <div style={{ maxWidth: 1100 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            Contas a Receber
          </h1>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Região: {data?.region?.name || "-"}
        </div>

        {error && (
          <div
            style={{
              ...card,
              border: "1px solid #ef4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard label="Total" value={money(summary.total)} theme={theme} />
          <SummaryCard label="Recebido" value={money(summary.paid)} theme={theme} />
          <SummaryCard label="Pendente" value={money(summary.pending)} theme={theme} />
          <SummaryCard label="Atrasado" value={money(summary.overdue)} theme={theme} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Parcelas
          </div>

          {!data?.items?.length ? (
            <div style={{ color: muted }}>
              Nenhuma conta a receber encontrada.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {item.client?.name || "-"}
                    </div>

                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Pedido #{item.order?.number ?? "-"}
                    </div>

                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Vencimento: {formatDateBR(item.dueDate)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900 }}>
                      {money(item.amountCents)}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: 700,
                        color:
                          item.status === "PAID"
                            ? "#22c55e"
                            : item.status === "OVERDUE"
                            ? "#ef4444"
                            : "#f59e0b",
                      }}
                    >
                      {item.status === "PAID"
                        ? "Pago"
                        : item.status === "OVERDUE"
                        ? "Atrasado"
                        : "Pendente"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: any;
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
      <div style={{ fontSize: 13, color: theme.subtext }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}