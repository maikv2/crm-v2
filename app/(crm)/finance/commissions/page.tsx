"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBR(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type RepRow = {
  representativeId: string;
  representative: string;
  region: string;
  ordersCount: number;
  payableCurrentWeekCents: number;
  payablePriorWeekCents: number;
  amountCents: number;
  pendingOverdueCents: number;
  pendingNormalCents: number;
  totalConfirmedCents: number;
};

type Totals = {
  totalPayable: number;
  totalCurrentWeek: number;
  totalPriorWeeks: number;
  totalPendingOverdue: number;
  totalPendingNormal: number;
};

type SummaryData = {
  weekStart: string;
  calculatedAt: string;
  totals: Totals;
  confirmations: RepRow[];
};

type HistoryEntry = {
  id: string;
  representativeId: string;
  representative: string;
  region: string;
  amountCents: number;
  weekStart: string;
  weekEnd: string;
  confirmedAt: string | null;
};

type HistoryData = {
  totalPaidCents: number;
  history: HistoryEntry[];
};

export default function FinanceCommissionsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const textColor = theme.text;

  const [data, setData] = useState<SummaryData | null>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/finance/commissions/weekly-summary", { cache: "no-store" }),
      fetch("/api/finance/commissions/history", { cache: "no-store" }),
    ])
      .then(async ([summaryRes, historyRes]) => {
        const summaryJson = await summaryRes.json();
        const historyJson = await historyRes.json();
        if (!summaryRes.ok) throw new Error(summaryJson.error || "Erro ao carregar dados.");
        setData(summaryJson);
        setHistory(historyJson.ok ? historyJson : null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ padding: 24, background: pageBg, minHeight: "100vh", color: textColor }}>Calculando comissões...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, background: pageBg, minHeight: "100vh" }}>
        <div style={{ color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16 }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const repsWithOverdue = data.confirmations.filter((c) => c.pendingOverdueCents > 0).length;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: 24, color: textColor }}>
      <div style={{ maxWidth: 1100 }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Controle de Comissões</h1>
            <p style={{ color: muted, margin: 0, fontSize: 13 }}>
              Semana de <strong style={{ color: textColor }}>{dateBR(data.weekStart)}</strong>
              {" · "}atualizado às {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(data.calculatedAt))}
            </p>
          </div>
          <button
            onClick={load}
            style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "8px 16px", background: cardBg, color: textColor, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* 3 cards principais */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 28 }}>

          {/* Card principal — A pagar */}
          <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 20, background: "#f0fdf4" }}>
            <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
              A pagar esta semana
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#166534", margin: "6px 0 10px" }}>
              {money(data.totals.totalPayable)}
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <span>
                <span style={{ color: "#1e40af", fontWeight: 700 }}>{money(data.totals.totalCurrentWeek)}</span>
                <span style={{ color: "#64748b", marginLeft: 4 }}>vendas desta semana</span>
              </span>
              {data.totals.totalPriorWeeks > 0 && (
                <span>
                  <span style={{ color: "#7e22ce", fontWeight: 700 }}>+ {money(data.totals.totalPriorWeeks)}</span>
                  <span style={{ color: "#64748b", marginLeft: 4 }}>semanas anteriores</span>
                </span>
              )}
            </div>
          </div>

          {/* Card — Em atraso */}
          <div style={{
            border: `1px solid ${data.totals.totalPendingOverdue > 0 ? "#fecaca" : border}`,
            borderRadius: 16,
            padding: 20,
            background: data.totals.totalPendingOverdue > 0 ? "#fef2f2" : cardBg,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: data.totals.totalPendingOverdue > 0 ? "#991b1b" : muted }}>
              ⚠ Clientes em atraso
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
              {repsWithOverdue > 0 ? `${repsWithOverdue} representante${repsWithOverdue > 1 ? "s" : ""} afetado${repsWithOverdue > 1 ? "s" : ""}` : "Nenhum atraso no momento"}
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: data.totals.totalPendingOverdue > 0 ? "#dc2626" : muted }}>
              {money(data.totals.totalPendingOverdue)}
            </div>
          </div>

          {/* Card — Pendente no prazo */}
          <div style={{ border: `1px solid ${border}`, borderRadius: 16, padding: 20, background: cardBg }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: muted }}>
              Pendente no prazo
            </div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>aguardando pagamento dos clientes</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: "#92400e" }}>
              {money(data.totals.totalPendingNormal)}
            </div>
          </div>
        </div>

        {/* Tabela por representante */}
        <div style={{ border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden", background: cardBg }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${border}`, fontWeight: 800, fontSize: 15 }}>
            Por representante
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: theme.isDark ? "#0d1a2d" : "#f8fafc", borderBottom: `1px solid ${border}` }}>
                  <Th align="left">Representante</Th>
                  <Th align="left">Região</Th>
                  <Th align="right">A pagar</Th>
                  <Th align="right">⚠ Em atraso</Th>
                  <Th align="right">Pendente</Th>
                  <Th align="right">Já pago (hist.)</Th>
                </tr>
              </thead>
              <tbody>
                {data.confirmations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: "center", color: muted }}>
                      Nenhuma comissão encontrada para esta semana.
                    </td>
                  </tr>
                ) : (
                  data.confirmations.map((c) => (
                    <tr
                      key={c.representativeId}
                      style={{
                        borderBottom: `1px solid ${border}`,
                        borderLeft: c.pendingOverdueCents > 0 ? "3px solid #ef4444" : "3px solid transparent",
                      }}
                    >
                      <td style={{ padding: "13px 16px", fontWeight: 700 }}>{c.representative}</td>
                      <td style={{ padding: "13px 16px", color: muted, fontSize: 13 }}>{c.region}</td>

                      {/* A pagar — valor principal + composição como subtext */}
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: "#166534" }}>
                          {money(c.amountCents)}
                        </div>
                        {(c.payableCurrentWeekCents > 0 || c.payablePriorWeekCents > 0) && (
                          <div style={{ fontSize: 11, color: muted, marginTop: 2, lineHeight: 1.5 }}>
                            {c.payableCurrentWeekCents > 0 && (
                              <span style={{ color: "#1e40af" }}>{money(c.payableCurrentWeekCents)} esta sem.</span>
                            )}
                            {c.payableCurrentWeekCents > 0 && c.payablePriorWeekCents > 0 && " · "}
                            {c.payablePriorWeekCents > 0 && (
                              <span style={{ color: "#7e22ce" }}>{money(c.payablePriorWeekCents)} ant.</span>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        {c.pendingOverdueCents > 0 ? (
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>{money(c.pendingOverdueCents)}</span>
                        ) : (
                          <span style={{ color: muted }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        {c.pendingNormalCents > 0 ? (
                          <span style={{ color: "#92400e" }}>{money(c.pendingNormalCents)}</span>
                        ) : (
                          <span style={{ color: muted }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "13px 16px", textAlign: "right", color: "#166534", fontSize: 13 }}>
                        {c.totalConfirmedCents > 0 ? money(c.totalConfirmedCents) : <span style={{ color: muted }}>—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico de pagamentos confirmados */}
        {history && (
          <div style={{ border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden", background: cardBg, marginTop: 24 }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Histórico de pagamentos realizados</div>
              {history.totalPaidCents > 0 && (
                <div style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>
                  Total pago: {money(history.totalPaidCents)}
                </div>
              )}
            </div>

            {history.history.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: muted, fontSize: 14 }}>
                Nenhum pagamento confirmado ainda.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: theme.isDark ? "#0d1a2d" : "#f8fafc", borderBottom: `1px solid ${border}` }}>
                      <Th align="left">Representante</Th>
                      <Th align="left">Região</Th>
                      <Th align="left">Período</Th>
                      <Th align="right">Valor pago</Th>
                      <Th align="left">Confirmado em</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.history.map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: "11px 16px", fontWeight: 700 }}>{entry.representative}</td>
                        <td style={{ padding: "11px 16px", color: muted, fontSize: 13 }}>{entry.region}</td>
                        <td style={{ padding: "11px 16px", color: muted, fontSize: 13 }}>
                          {dateBR(entry.weekStart)} → {dateBR(entry.weekEnd)}
                        </td>
                        <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 700, color: "#166534" }}>
                          {money(entry.amountCents)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: muted }}>
                          {entry.confirmedAt ? dateBR(entry.confirmedAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 12, color: muted, marginTop: 14, lineHeight: 1.7 }}>
          <strong>A pagar</strong>: comissão liberada sobre pagamentos recebidos esta semana (inclui vendas desta semana e de semanas anteriores que foram pagas agora).
          {" "}<strong>Em atraso</strong>: vencimento do cliente já passou sem pagamento — comissão travada.
          {" "}<strong>Pendente</strong>: dentro do prazo de vencimento, será liberado quando o cliente pagar.
          {" "}<strong>Já pago</strong>: total histórico confirmado ao representante.
        </p>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th style={{
      padding: "11px 16px",
      textAlign: align,
      fontWeight: 700,
      fontSize: 11,
      color: "#94a3b8",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}
