"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

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

export default function MobileRepCommissionsPage() {
  const { theme: mode } = useTheme();
  const colors = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcertoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/rep/finance/acerto", { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Erro ao carregar.");
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <MobileRepPageFrame
      title="Minhas Comissões"
      subtitle={data ? `Semana a partir de ${dateBR(data.weekStart)}` : "Carregando..."}
      desktopHref="/rep/finance/commissions"
    >
      {loading ? (
        <MobileCard>Calculando comissões...</MobileCard>
      ) : error ? (
        <MobileCard style={{ color: "#991b1b" }}>{error}</MobileCard>
      ) : data ? (
        <>
          {/* Total liberado */}
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 18,
            padding: 20,
            marginBottom: 4,
          }}>
            <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
              Total liberado para receber
            </div>
            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
              Pagamentos confirmados dos clientes
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#166534", marginTop: 4 }}>
              {formatMoneyBR(data.summary.totalPayable)}
            </div>
          </div>

          {/* Breakdown liberado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BlockCard
              label="Desta semana"
              sublabel="vendas desta semana"
              value={formatMoneyBR(data.summary.currentWeekCents)}
              color="#1e40af"
              bg="#eff6ff"
              borderColor="#bfdbfe"
            />
            <BlockCard
              label="Sem. anteriores"
              sublabel="vendas antigas pagas agora"
              value={formatMoneyBR(data.summary.priorWeeksCents)}
              color="#7e22ce"
              bg="#faf5ff"
              borderColor="#e9d5ff"
            />
          </div>

          {/* Pendências */}
          {(data.summary.pendingOverdueCents > 0 || data.summary.pendingNormalCents > 0) && (
            <>
              {data.summary.pendingOverdueCents > 0 && (
                <BlockCard
                  label="⚠ Em atraso"
                  sublabel="clientes com pagamento vencido"
                  value={formatMoneyBR(data.summary.pendingOverdueCents)}
                  color="#991b1b"
                  bg="#fef2f2"
                  borderColor="#fecaca"
                />
              )}
              {data.summary.pendingNormalCents > 0 && (
                <BlockCard
                  label="No prazo"
                  sublabel="dentro do vencimento"
                  value={formatMoneyBR(data.summary.pendingNormalCents)}
                  color="#92400e"
                  bg="#fffbeb"
                  borderColor="#fde68a"
                />
              )}
            </>
          )}

          {/* Lista de pedidos */}
          {data.orders.length > 0 && (
            <MobileCard>
              <MobileSectionTitle title="Detalhamento por pedido" />
              {data.orders.map((order) => (
                <div
                  key={order.orderId}
                  style={{
                    padding: "12px 0",
                    borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`,
                    borderLeft: order.hasOverdue ? "3px solid #ef4444" : "3px solid transparent",
                    paddingLeft: order.hasOverdue ? 8 : 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                      {order.clientName}
                      {order.hasOverdue && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 5, padding: "1px 5px" }}>
                          atraso
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                      PED-{String(order.number).padStart(4, "0")} · {dateBR(order.issuedAt)}
                    </div>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      marginTop: 2,
                      color: order.isCurrentWeekSale ? "#1d4ed8" : "#7e22ce",
                    }}>
                      {order.isCurrentWeekSale ? "venda desta semana" : "venda de semana anterior"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {order.commissionThisWeekCents > 0 && (
                      <div style={{
                        fontWeight: 900,
                        fontSize: 15,
                        color: order.isCurrentWeekSale ? "#1d4ed8" : "#7e22ce",
                      }}>
                        {formatMoneyBR(order.commissionThisWeekCents)}
                      </div>
                    )}
                    {order.pendingOverdueCents > 0 && (
                      <div style={{ fontSize: 12, color: "#dc2626", marginTop: 2, fontWeight: 700 }}>
                        {formatMoneyBR(order.pendingOverdueCents)} em atraso
                      </div>
                    )}
                    {order.pendingNormalCents > 0 && (
                      <div style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}>
                        {formatMoneyBR(order.pendingNormalCents)} pendente
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </MobileCard>
          )}

          {data.orders.length === 0 && (
            <MobileCard>
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma comissão ativa no momento.</div>
            </MobileCard>
          )}

          {/* Histórico */}
          {data.paidHistory.length > 0 && (
            <MobileCard>
              <MobileSectionTitle title="Histórico de pagamentos recebidos" />
              {data.paidHistory.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: colors.subtext }}>
                      {dateBR(entry.weekStart)} → {dateBR(entry.weekEnd)}
                    </div>
                    {entry.confirmedAt && (
                      <div style={{ fontSize: 11, color: colors.subtext }}>
                        Confirmado {dateBR(entry.confirmedAt)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#166534" }}>
                    {formatMoneyBR(entry.amountCents)}
                  </div>
                </div>
              ))}
              {data.summary.totalAlreadyConfirmedCents > 0 && (
                <div style={{ paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                  <span style={{ fontSize: 12, color: colors.subtext }}>Total recebido</span>
                  <span style={{ fontSize: 14, color: "#166534" }}>{formatMoneyBR(data.summary.totalAlreadyConfirmedCents)}</span>
                </div>
              )}
            </MobileCard>
          )}

          {/* Botão atualizar */}
          <button
            onClick={load}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 14,
              border: `1px solid ${colors.isDark ? "#1e293b" : "#e2e8f0"}`,
              background: colors.isDark ? "#0f172a" : "#f8fafc",
              color: colors.text,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ↻ Atualizar dados
          </button>
        </>
      ) : null}
    </MobileRepPageFrame>
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
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: 16,
      padding: 14,
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{sublabel}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}
