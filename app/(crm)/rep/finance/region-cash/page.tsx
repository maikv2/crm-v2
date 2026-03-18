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

type RegionCashItem = {
  id: string;
  amountCents: number;
  paymentMethod?: string | null;
  receivedAt?: string | null;
  order?: {
    id: string;
    number?: number | null;
  } | null;
  accountsReceivable?: {
    id: string;
    client?: {
      id: string;
      name: string;
    } | null;
  } | null;
};

type RegionCashResponse = {
  region?: {
    id: string;
    name: string;
  } | null;
  items: RegionCashItem[];
};

export default function RepRegionCashPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<RegionCashResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/finance/region-cash", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar caixa da região.");
      }

      setData({
        region: json?.region ?? null,
        items: Array.isArray(json?.items) ? json.items : [],
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar caixa da região."
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
        acc.total += item.amountCents ?? 0;

        if (item.paymentMethod === "CASH") {
          acc.cash += item.amountCents ?? 0;
        }

        if (item.paymentMethod === "PIX") {
          acc.pix += item.amountCents ?? 0;
        }

        if (item.paymentMethod === "BOLETO") {
          acc.boleto += item.amountCents ?? 0;
        }

        if (item.paymentMethod === "CARD_DEBIT") {
          acc.cardDebit += item.amountCents ?? 0;
        }

        if (item.paymentMethod === "CARD_CREDIT") {
          acc.cardCredit += item.amountCents ?? 0;
        }

        return acc;
      },
      {
        total: 0,
        cash: 0,
        pix: 0,
        boleto: 0,
        cardDebit: 0,
        cardCredit: 0,
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
        Carregando caixa da região...
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
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Caixa da Região
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
            marginBottom: 12,
          }}
        >
          <SummaryCard label="Total em caixa" value={money(summary.total)} theme={theme} />
          <SummaryCard label="Dinheiro" value={money(summary.cash)} theme={theme} />
          <SummaryCard label="PIX" value={money(summary.pix)} theme={theme} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard label="Boleto" value={money(summary.boleto)} theme={theme} />
          <SummaryCard label="Débito" value={money(summary.cardDebit)} theme={theme} />
          <SummaryCard label="Crédito" value={money(summary.cardCredit)} theme={theme} />
        </div>

        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Recebimentos da região
          </div>

          {!data?.items?.length ? (
            <div style={{ color: muted }}>Nenhum recebimento registrado.</div>
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
                      {item.accountsReceivable?.client?.name || "Cliente"}
                    </div>

                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Pedido #{item.order?.number ?? "-"}
                    </div>

                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Data: {formatDateBR(item.receivedAt)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900 }}>
                      {money(item.amountCents)}
                    </div>

                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      {item.paymentMethod || "-"}
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