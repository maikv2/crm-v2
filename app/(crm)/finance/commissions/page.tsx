"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type Confirmation = {
  id: string;
  representative: string;
  region: string;
  weekStart: string;
  weekEnd: string;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  status: string;
  confirmedAt: string | null;
  payableCurrentWeekCents: number | null;
  payablePriorWeekCents: number | null;
  totalSalesCents: number | null;
};

type Totals = {
  totalPayable: number;
  totalCurrentWeek: number;
  totalPriorWeeks: number;
  totalPending: number;
};

type SummaryData = {
  latestWeekEnd: string | null;
  totals: Totals;
  confirmations: Confirmation[];
};

function statusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "PENDING") return "Pendente";
  if (status === "EXPIRED") return "Expirado";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

function statusColor(status: string) {
  if (status === "PAID") return "#166534";
  if (status === "PENDING") return "#92400e";
  if (status === "EXPIRED") return "#991b1b";
  return "#475569";
}

function statusBg(status: string) {
  if (status === "PAID") return "#dcfce7";
  if (status === "PENDING") return "#fef3c7";
  if (status === "EXPIRED") return "#fee2e2";
  return "#f1f5f9";
}

export default function FinanceCommissionsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const textColor = theme.text;

  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/finance/commissions/weekly-summary", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao carregar dados.");
        setData(json);
        setSelectedWeek(json.latestWeekEnd ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, background: pageBg, minHeight: "100vh", color: textColor }}>
        Carregando comissões...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, background: pageBg, minHeight: "100vh" }}>
        <div style={{ color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Semanas distintas disponíveis
  const weeks = Array.from(
    new Map(
      data.confirmations.map((c) => [
        c.weekEnd,
        { weekStart: c.weekStart, weekEnd: c.weekEnd },
      ])
    ).values()
  ).sort((a, b) => new Date(b.weekEnd).getTime() - new Date(a.weekEnd).getTime());

  const filtered = selectedWeek
    ? data.confirmations.filter((c) => c.weekEnd === selectedWeek)
    : data.confirmations.filter((c) => c.weekEnd === data.latestWeekEnd);

  const totals = filtered.reduce(
    (acc, c) => ({
      totalPayable: acc.totalPayable + c.amountCents,
      totalCurrentWeek: acc.totalCurrentWeek + (c.payableCurrentWeekCents ?? 0),
      totalPriorWeeks: acc.totalPriorWeeks + (c.payablePriorWeekCents ?? 0),
      totalPending: acc.totalPending + c.pendingCents,
    }),
    { totalPayable: 0, totalCurrentWeek: 0, totalPriorWeeks: 0, totalPending: 0 }
  );

  const selectedWeekData = weeks.find((w) => w.weekEnd === selectedWeek);

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: 24, color: textColor }}>
      <div style={{ maxWidth: 1200 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          Controle de Comissões
        </h1>
        <p style={{ color: muted, marginBottom: 24, marginTop: 0 }}>
          Breakdown semanal: o que foi gerado pelas vendas da semana, por vendas anteriores e o que fica para o próximo acerto.
        </p>

        {/* Seletor de semana */}
        {weeks.length > 1 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: muted, fontWeight: 700, marginRight: 8 }}>
              Semana de fechamento:
            </label>
            <select
              value={selectedWeek ?? ""}
              onChange={(e) => setSelectedWeek(e.target.value)}
              style={{
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "6px 12px",
                background: cardBg,
                color: textColor,
                fontSize: 14,
              }}
            >
              {weeks.map((w) => (
                <option key={w.weekEnd} value={w.weekEnd}>
                  {dateBR(w.weekStart)} a {dateBR(w.weekEnd)}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedWeekData && (
          <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
            Período: <strong style={{ color: textColor }}>{dateBR(selectedWeekData.weekStart)} a {dateBR(selectedWeekData.weekEnd)}</strong>
          </p>
        )}

        {/* Cards de totais */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <TotalCard
            label="Total a pagar"
            value={money(totals.totalPayable)}
            highlight
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Desta semana"
            value={money(totals.totalCurrentWeek)}
            color="#1e40af"
            bg="#eff6ff"
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Semanas anteriores"
            value={money(totals.totalPriorWeeks)}
            color="#7e22ce"
            bg="#faf5ff"
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Próximo acerto"
            value={money(totals.totalPending)}
            color="#92400e"
            bg="#fffbeb"
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
        </div>

        {/* Tabela por representante */}
        <div style={{ border: `1px solid ${border}`, borderRadius: 16, overflow: "hidden", background: cardBg }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: theme.isDark ? "#162032" : "#f8fafc", borderBottom: `1px solid ${border}` }}>
                  {["Representante", "Região", "Pedidos", "Desta semana", "Semanas anteriores", "Total a pagar", "Próximo acerto", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 12,
                        color: muted,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ padding: 24, textAlign: "center", color: muted }}
                    >
                      Nenhum fechamento encontrado para este período.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      style={{ borderBottom: `1px solid ${border}` }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{c.representative}</td>
                      <td style={{ padding: "12px 16px", color: muted }}>{c.region}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>{c.ordersCount}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#1d4ed8", fontWeight: 700 }}>
                        {c.payableCurrentWeekCents != null
                          ? money(c.payableCurrentWeekCents)
                          : <span style={{ color: muted, fontWeight: 400 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#7e22ce", fontWeight: 700 }}>
                        {c.payablePriorWeekCents != null
                          ? money(c.payablePriorWeekCents)
                          : <span style={{ color: muted, fontWeight: 400 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900 }}>
                        {money(c.amountCents)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#92400e" }}>
                        {money(c.pendingCents)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            color: statusColor(c.status),
                            background: statusBg(c.status),
                          }}
                        >
                          {statusLabel(c.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ fontSize: 12, color: muted, marginTop: 16 }}>
          Regra: comissão liberada somente sobre valores já baixados como recebidos no financeiro.
          &ldquo;Desta semana&rdquo; = vendas emitidas no período do fechamento. &ldquo;Semanas anteriores&rdquo; = vendas de períodos anteriores cujo pagamento entrou esta semana.
        </p>
      </div>
    </div>
  );
}

function TotalCard({
  label,
  value,
  highlight = false,
  color,
  bg,
  border,
  cardBg,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
  bg?: string;
  border: string;
  cardBg: string;
  muted: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${highlight ? "#bbf7d0" : border}`,
        borderRadius: 14,
        padding: 16,
        background: bg ?? (highlight ? "#f0fdf4" : cardBg),
      }}
    >
      <div style={{ fontSize: 12, color: muted, fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginTop: 6,
          color: color ?? (highlight ? "#166534" : undefined),
        }}
      >
        {value}
      </div>
    </div>
  );
}
