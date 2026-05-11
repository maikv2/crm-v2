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

type OrderRow = {
  orderId: string;
  number: number;
  clientName: string;
  issuedAt: string;
  commissionThisWeekCents: number;
  pendingOverdueCents: number;
  pendingNormalCents: number;
  isCurrentWeekSale: boolean;
  hasOverdue: boolean;
};

type PaidEntry = {
  id: string;
  amountCents: number;
  weekStart: string;
  weekEnd: string;
  confirmedAt: string | null;
};

type Summary = {
  totalPayable: number;
  currentWeekCents: number;
  priorWeeksCents: number;
  pendingOverdueCents: number;
  pendingNormalCents: number;
  totalAlreadyConfirmedCents: number;
};

type AcertoData = {
  weekStart: string;
  calculatedAt: string;
  summary: Summary;
  orders: OrderRow[];
  paidHistory: PaidEntry[];
};

export default function RepFinanceCommissionsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<AcertoData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/rep/finance/acerto", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div style={{ padding: 24, background: pageBg, minHeight: "100vh", color: theme.text }}>Carregando comissões...</div>;
  }

  if (!data) return null;

  const { summary, orders, paidHistory } = data;
  const pendingTotal = summary.pendingOverdueCents + summary.pendingNormalCents;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: 24, color: theme.text }}>
      <div style={{ maxWidth: 900 }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4, marginTop: 0 }}>Minhas Comissões</h1>
            <p style={{ color: muted, margin: 0, fontSize: 13 }}>
              Semana a partir de <strong style={{ color: theme.text }}>{dateBR(data.weekStart)}</strong>
              {" · "}Atualizado conforme pagamentos dos clientes
            </p>
          </div>
          <button
            onClick={load}
            style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "8px 16px", background: cardBg, color: theme.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* Card principal: total liberado */}
        <div style={{ border: "1px solid #bbf7d0", borderRadius: 16, padding: 20, background: "#f0fdf4", marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
            Total liberado para receber
          </div>
          <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
            Comissão já disponível — pagamentos confirmados dos clientes
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#166534", marginTop: 4 }}>
            {money(summary.totalPayable)}
          </div>
        </div>

        {/* Breakdown do liberado */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <BlockCard
            label="Desta semana"
            sublabel="vendas emitidas esta semana"
            value={money(summary.currentWeekCents)}
            color="#1e40af"
            bg="#eff6ff"
            borderColor="#bfdbfe"
          />
          <BlockCard
            label="Semanas anteriores"
            sublabel="vendas antigas pagas esta semana"
            value={money(summary.priorWeeksCents)}
            color="#7e22ce"
            bg="#faf5ff"
            borderColor="#e9d5ff"
          />
        </div>

        {/* Pendências */}
        {pendingTotal > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: muted, textTransform: "uppercase", marginBottom: 10 }}>
              Pendente — aguardando clientes
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {summary.pendingOverdueCents > 0 && (
                <BlockCard
                  label="⚠ Em atraso"
                  sublabel="clientes com pagamento vencido"
                  value={money(summary.pendingOverdueCents)}
                  color="#991b1b"
                  bg="#fef2f2"
                  borderColor="#fecaca"
                />
              )}
              {summary.pendingNormalCents > 0 && (
                <BlockCard
                  label="No prazo"
                  sublabel="dentro do vencimento"
                  value={money(summary.pendingNormalCents)}
                  color="#92400e"
                  bg="#fffbeb"
                  borderColor="#fde68a"
                />
              )}
            </div>
            <p style={{ fontSize: 12, color: muted, marginTop: 8, marginBottom: 0 }}>
              Comissões liberadas somente quando o cliente pagar. &ldquo;Em atraso&rdquo; = vencimento já passou.
            </p>
          </div>
        )}

        {/* Detalhamento por pedido */}
        {orders.length > 0 && (
          <div style={{ border: `1px solid ${border}`, borderRadius: 16, background: cardBg, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, fontWeight: 800, fontSize: 15 }}>
              Detalhamento por pedido
            </div>
            {orders.map((order) => {
              const hasPending = order.pendingOverdueCents > 0 || order.pendingNormalCents > 0;
              return (
                <div
                  key={order.orderId}
                  style={{
                    padding: "14px 16px",
                    borderBottom: `1px solid ${border}`,
                    borderLeft: order.hasOverdue ? "3px solid #ef4444" : "3px solid transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {order.clientName}
                      {order.hasOverdue && (
                        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "2px 6px" }}>
                          em atraso
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                      PED-{String(order.number).padStart(4, "0")}
                      {" · "}
                      {dateBR(order.issuedAt)}
                      {" · "}
                      <span style={{ color: order.isCurrentWeekSale ? "#1d4ed8" : "#7e22ce", fontWeight: 600 }}>
                        {order.isCurrentWeekSale ? "venda desta semana" : "venda de semana anterior"}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 160 }}>
                    {order.commissionThisWeekCents > 0 && (
                      <div style={{ fontWeight: 800, color: order.isCurrentWeekSale ? "#1d4ed8" : "#7e22ce" }}>
                        {money(order.commissionThisWeekCents)}
                        <span style={{ fontSize: 11, fontWeight: 500, color: muted, marginLeft: 4 }}>liberado</span>
                      </div>
                    )}
                    {order.pendingOverdueCents > 0 && (
                      <div style={{ fontSize: 13, color: "#dc2626", marginTop: 2, fontWeight: 700 }}>
                        {money(order.pendingOverdueCents)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: muted, marginLeft: 4 }}>em atraso</span>
                      </div>
                    )}
                    {order.pendingNormalCents > 0 && (
                      <div style={{ fontSize: 13, color: "#92400e", marginTop: 2 }}>
                        {money(order.pendingNormalCents)}
                        <span style={{ fontSize: 11, color: muted, marginLeft: 4 }}>aguardando cliente</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {orders.length === 0 && (
          <div style={{ border: `1px solid ${border}`, borderRadius: 16, padding: 32, background: cardBg, textAlign: "center", color: muted, marginBottom: 24 }}>
            Nenhuma comissão ativa no momento.
          </div>
        )}

        {/* Histórico de pagamentos confirmados */}
        {paidHistory.length > 0 && (
          <div style={{ border: `1px solid ${border}`, borderRadius: 16, background: cardBg, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${border}`, fontWeight: 800, fontSize: 15 }}>
              Histórico de pagamentos recebidos
            </div>
            {paidHistory.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, color: muted }}>
                    Semana {dateBR(entry.weekStart)} → {dateBR(entry.weekEnd)}
                  </div>
                  {entry.confirmedAt && (
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                      Confirmado em {dateBR(entry.confirmedAt)}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 800, color: "#166534", fontSize: 15 }}>
                  {money(entry.amountCents)}
                </div>
              </div>
            ))}
            {summary.totalAlreadyConfirmedCents > 0 && (
              <div style={{ padding: "12px 16px", background: theme.isDark ? "#0b1a2e" : "#f0fdf4", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: muted, fontSize: 13 }}>Total já recebido (histórico)</span>
                <span style={{ color: "#166534", fontSize: 15 }}>{money(summary.totalAlreadyConfirmedCents)}</span>
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>
          Comissão liberada somente sobre valores já recebidos no financeiro.
          &ldquo;Em atraso&rdquo; = vencimento do cliente já passou sem pagamento.
          &ldquo;No prazo&rdquo; = ainda dentro do prazo de pagamento.
        </p>
      </div>
    </div>
  );
}

function BlockCard({
  label,
  sublabel,
  value,
  color,
  bg,
  borderColor,
}: {
  label: string;
  sublabel: string;
  value: string;
  color: string;
  bg: string;
  borderColor: string;
}) {
  return (
    <div style={{ border: `1px solid ${borderColor}`, borderRadius: 14, padding: 16, background: bg }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sublabel}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color, marginTop: 8 }}>{value}</div>
    </div>
  );
}
