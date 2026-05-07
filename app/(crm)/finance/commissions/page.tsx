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

type RepRow = {
  representativeId: string;
  representative: string;
  region: string;
  ordersCount: number;
  payableCurrentWeekCents: number;
  payablePriorWeekCents: number;
  amountCents: number;
  pendingCents: number;
};

type Totals = {
  totalPayable: number;
  totalCurrentWeek: number;
  totalPriorWeeks: number;
  totalPending: number;
};

type SummaryData = {
  weekStart: string;
  calculatedAt: string;
  totals: Totals;
  confirmations: RepRow[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/finance/commissions/weekly-summary", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao carregar dados.");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, background: pageBg, minHeight: "100vh", color: textColor }}>
        Calculando comissões em tempo real...
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

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: 24, color: textColor }}>
      <div style={{ maxWidth: 1200 }}>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>
              Controle de Comissões
            </h1>
            <p style={{ color: muted, margin: 0, fontSize: 13 }}>
              Semana a partir de <strong style={{ color: textColor }}>{dateBR(data.weekStart)}</strong>
              {" · "}Atualizado em tempo real conforme pagamentos dos clientes
              {" · "}Última consulta: {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(data.calculatedAt))}
            </p>
          </div>
          <button
            onClick={load}
            style={{
              border: `1px solid ${border}`,
              borderRadius: 10,
              padding: "8px 16px",
              background: cardBg,
              color: textColor,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* Cards de totais */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          <TotalCard
            label="Total a pagar esta semana"
            value={money(data.totals.totalPayable)}
            highlight
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Desta semana"
            sublabel="vendas emitidas esta semana"
            value={money(data.totals.totalCurrentWeek)}
            color="#1e40af"
            bg="#eff6ff"
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Semanas anteriores"
            sublabel="vendas antigas pagas esta semana"
            value={money(data.totals.totalPriorWeeks)}
            color="#7e22ce"
            bg="#faf5ff"
            border={border}
            cardBg={cardBg}
            muted={muted}
          />
          <TotalCard
            label="Próximo acerto"
            sublabel="aguardando pagamento do cliente"
            value={money(data.totals.totalPending)}
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
                  {["Representante", "Região", "Pedidos", "Desta semana", "Semanas anteriores", "Total a pagar", "Próximo acerto"].map((h) => (
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
                {data.confirmations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 24, textAlign: "center", color: muted }}>
                      Nenhuma comissão encontrada para esta semana.
                    </td>
                  </tr>
                ) : (
                  data.confirmations.map((c) => (
                    <tr key={c.representativeId} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{c.representative}</td>
                      <td style={{ padding: "12px 16px", color: muted }}>{c.region}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>{c.ordersCount}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#1d4ed8", fontWeight: 700 }}>
                        {money(c.payableCurrentWeekCents)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#7e22ce", fontWeight: 700 }}>
                        {money(c.payablePriorWeekCents)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900 }}>
                        {money(c.amountCents)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#92400e" }}>
                        {money(c.pendingCents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ fontSize: 12, color: muted, marginTop: 16 }}>
          Comissão liberada somente sobre valores já baixados como recebidos no financeiro.
          &ldquo;Desta semana&rdquo; = vendas emitidas a partir de {dateBR(data.weekStart)}.
          &ldquo;Semanas anteriores&rdquo; = vendas antigas cujo pagamento entrou esta semana.
          &ldquo;Próximo acerto&rdquo; = saldo ainda não recebido dos clientes.
        </p>
      </div>
    </div>
  );
}

function TotalCard({
  label,
  sublabel,
  value,
  highlight = false,
  color,
  bg,
  border,
  cardBg,
  muted,
}: {
  label: string;
  sublabel?: string;
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
      {sublabel && (
        <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{sublabel}</div>
      )}
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginTop: 8,
          color: color ?? (highlight ? "#166534" : undefined),
        }}
      >
        {value}
      </div>
    </div>
  );
}
