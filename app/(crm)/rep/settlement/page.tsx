"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function paymentMethodLabel(value?: string | null) {
  switch (value) {
    case "CASH":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "BOLETO":
      return "Boleto";
    case "CARD_DEBIT":
      return "Cartão débito";
    case "CARD_CREDIT":
      return "Cartão crédito";
    default:
      return value ?? "-";
  }
}

export default function RepSettlementPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    const region = "Chapecó";

    const [settlementRes, historyRes] = await Promise.all([
      fetch(`/api/rep/weekly-settlement?region=${encodeURIComponent(region)}`),
      fetch(`/api/rep/settlements?region=${encodeURIComponent(region)}`),
    ]);

    const settlementJson = await settlementRes.json();
    const historyJson = await historyRes.json();

    setData(settlementJson);
    setHistory(Array.isArray(historyJson) ? historyJson : []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveSettlement() {
    try {
      setSaving(true);

      const res = await fetch("/api/rep/weekly-settlement/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          region: "Chapecó",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json?.error || "Erro ao salvar fechamento.");
        return;
      }

      alert("Fechamento semanal salvo com sucesso.");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando fechamento semanal...
      </div>
    );
  }

  const totals = data.totals ?? {};
  const netSettlementCents = totals.netSettlementCents ?? 0;

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
            gap: 12,
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
              Fechamento Semanal
            </h1>

            <div style={{ color: muted }}>
              Região: <b>{data.region}</b> • Período:{" "}
              <b>{formatDateBR(data.weekStart)}</b> até{" "}
              <b>{formatDateBR(data.weekEnd)}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={saveSettlement}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                cursor: "pointer",
                fontWeight: 800,
              }}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar fechamento"}
            </button>

            <Link
              href="/rep"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Voltar ao painel
            </Link>
          </div>
        </div>

        {/* RESUMO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Vendas pagas na semana"
            value={money(totals.totalSalesPaidThisWeekCents ?? 0)}
            theme={theme}
          />

          <StatCard
            label="Comissão gerada"
            value={money(totals.totalCommissionGeneratedCents ?? 0)}
            theme={theme}
          />

          <StatCard
            label="Matriz deve ao representante"
            value={money(totals.matrixOwesRepresentativeCents ?? 0)}
            theme={theme}
          />

          <StatCard
            label="Representante deve à matriz"
            value={money(totals.representativeOwesMatrixCents ?? 0)}
            theme={theme}
          />
        </div>

        {/* SALDO FINAL */}
        <div
          style={{
            border: netSettlementCents >= 0
              ? "1px solid #22c55e"
              : "1px solid #ef4444",
            borderRadius: 12,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <div style={{ color: muted, fontSize: 13 }}>
            Saldo final da semana
          </div>

          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8 }}>
            {money(netSettlementCents)}
          </div>

          <div style={{ marginTop: 8, color: muted }}>
            {netSettlementCents >= 0
              ? "A matriz deve pagar esse valor ao representante."
              : "O representante deve repassar esse valor para a matriz."}
          </div>
        </div>

        {/* HISTÓRICO */}
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Histórico de fechamentos
          </div>

          {history.length === 0 ? (
            <div style={{ color: muted }}>
              Nenhum fechamento salvo ainda.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {history.map((row) => (
                <div key={row.id} style={itemCard(theme)}>
                  <div style={{ fontWeight: 800 }}>
                    {formatDateBR(row.weekStart)} até{" "}
                    {formatDateBR(row.weekEnd)}
                  </div>

                  <div style={subLine(theme)}>
                    Status: {row.status} • Saldo final:{" "}
                    <b>{money(row.netSettlementCents ?? 0)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PEDIDOS MATRIZ */}
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Pedidos recebidos na matriz
          </div>

          {(data.matrixReceivedOrders ?? []).length === 0 ? (
            <div style={{ color: muted }}>
              Nenhum pedido recebido na matriz.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.matrixReceivedOrders.map((row: any) => (
                <div key={row.financeTransactionId} style={itemCard(theme)}>
                  <div style={{ fontWeight: 800 }}>
                    Pedido {row.orderNumber} — {row.clientName}
                  </div>

                  <div style={subLine(theme)}>
                    {paymentMethodLabel(row.paymentMethod)} • Comissão a pagar:{" "}
                    <b>{money(row.commissionCents ?? 0)}</b>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PEDIDOS REGIÃO */}
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 16,
            background: cardBg,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Pedidos recebidos na região
          </div>

          {(data.regionReceivedOrders ?? []).length === 0 ? (
            <div style={{ color: muted }}>
              Nenhum pedido recebido na região.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.regionReceivedOrders.map((row: any) => (
                <div key={row.financeTransactionId} style={itemCard(theme)}>
                  <div style={{ fontWeight: 800 }}>
                    Pedido {row.orderNumber} — {row.clientName}
                  </div>

                  <div style={subLine(theme)}>
                    {paymentMethodLabel(row.paymentMethod)} • Valor a repassar à
                    matriz: <b>{money(row.companyShareCents ?? 0)}</b>
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

function StatCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ color: theme.isDark ? "#94a3b8" : "#64748b", fontSize: 13 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8 }}>{value}</div>
    </div>
  );
}

const itemCard = (theme: any): React.CSSProperties => ({
  border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
  borderRadius: 10,
  padding: 12,
  background: theme.isDark ? "#0f172a" : theme.cardBg,
});

const subLine = (theme: any): React.CSSProperties => ({
  color: theme.isDark ? "#94a3b8" : "#64748b",
  fontSize: 13,
  marginTop: 4,
});