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

type FinanceEntry = {
  id: string;
  description?: string | null;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  createdAt?: string | null;
  order?: {
    id: string;
    number?: number | null;
  } | null;
};

type FinanceResponse = {
  region?: {
    id: string;
    name: string;
  } | null;
  entries: FinanceEntry[];
};

export default function RepFinancePage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<FinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/finance", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar financeiro.");
      }

      setData(json as FinanceResponse);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar financeiro."
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
    const entries = data?.entries || [];

    return entries.reduce(
      (acc, entry) => {
        if (entry.type === "INCOME") {
          acc.received += entry.amountCents;
        }

        if (entry.type === "EXPENSE") {
          acc.expenses += entry.amountCents;
        }

        return acc;
      },
      {
        received: 0,
        expenses: 0,
      }
    );
  }, [data]);

  const balance = summary.received - summary.expenses;

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
        Carregando financeiro...
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
            marginBottom: 12,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>
            Financeiro da Região
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
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard
            label="Recebido"
            value={money(summary.received)}
            theme={theme}
          />

          <SummaryCard
            label="Despesas"
            value={money(summary.expenses)}
            theme={theme}
          />

          <SummaryCard
            label="Saldo da região"
            value={money(balance)}
            theme={theme}
          />
        </div>

        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Movimentações
          </div>

          {!data?.entries?.length ? (
            <div style={{ color: muted }}>Nenhuma movimentação registrada.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
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
                      {entry.description || "Movimentação"}
                    </div>

                    {entry.order?.number && (
                      <div style={{ fontSize: 13, color: muted }}>
                        Pedido #{entry.order.number}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 900,
                      color: entry.type === "INCOME" ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {entry.type === "INCOME" ? "+" : "-"}{" "}
                    {money(entry.amountCents)}
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