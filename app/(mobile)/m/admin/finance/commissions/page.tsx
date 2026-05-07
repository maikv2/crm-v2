"use client";

import { useEffect, useState } from "react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
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

export default function MobileAdminCommissionsPage() {
  const { theme: mode } = useTheme();
  const colors = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/finance/commissions/weekly-summary", { cache: "no-store" })
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
    <MobilePageFrame
      title="Controle de Comissões"
      subtitle={data ? `Semana a partir de ${dateBR(data.weekStart)}` : "Carregando..."}
      desktopHref="/finance/commissions"
    >
      {loading ? (
        <MobileCard>Calculando comissões em tempo real...</MobileCard>
      ) : error ? (
        <MobileCard style={{ color: "#991b1b" }}>{error}</MobileCard>
      ) : data ? (
        <>
          {/* Card total */}
          <div style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 18,
            padding: 20,
          }}>
            <div style={{ fontSize: 12, color: "#166534", fontWeight: 700, textTransform: "uppercase" }}>
              Total a pagar esta semana
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#166534", marginTop: 4 }}>
              {formatMoneyBR(data.totals.totalPayable)}
            </div>
          </div>

          {/* 3 blocos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <BlockCard
              label="Desta semana"
              sublabel="vendas desta semana"
              value={formatMoneyBR(data.totals.totalCurrentWeek)}
              color="#1e40af"
              bg="#eff6ff"
              borderColor="#bfdbfe"
            />
            <BlockCard
              label="Semanas anteriores"
              sublabel="vendas antigas pagas agora"
              value={formatMoneyBR(data.totals.totalPriorWeeks)}
              color="#7e22ce"
              bg="#faf5ff"
              borderColor="#e9d5ff"
            />
          </div>
          <BlockCard
            label="Próximo acerto"
            sublabel="aguardando pagamento dos clientes"
            value={formatMoneyBR(data.totals.totalPending)}
            color="#92400e"
            bg="#fffbeb"
            borderColor="#fde68a"
          />

          {/* Por representante */}
          {data.confirmations.length > 0 && (
            <MobileCard>
              <MobileSectionTitle title="Por representante" />
              {data.confirmations.map((rep) => (
                <div
                  key={rep.representativeId}
                  style={{
                    padding: "12px 0",
                    borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
                        {rep.representative}
                      </div>
                      <div style={{ fontSize: 12, color: colors.subtext, marginTop: 1 }}>
                        {rep.region} · {rep.ordersCount} pedido{rep.ordersCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 15, color: colors.text }}>
                        {formatMoneyBR(rep.amountCents)}
                      </div>
                      <div style={{ fontSize: 11, color: "#92400e", marginTop: 1 }}>
                        {formatMoneyBR(rep.pendingCents)} pendente
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <div style={{ flex: 1, background: "#eff6ff", borderRadius: 10, padding: "6px 10px" }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>DESTA SEMANA</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1d4ed8" }}>
                        {formatMoneyBR(rep.payableCurrentWeekCents)}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: "#faf5ff", borderRadius: 10, padding: "6px 10px" }}>
                      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>ANTERIORES</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#7e22ce" }}>
                        {formatMoneyBR(rep.payablePriorWeekCents)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </MobileCard>
          )}

          {data.confirmations.length === 0 && (
            <MobileCard>
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma comissão encontrada para esta semana.</div>
            </MobileCard>
          )}

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
    </MobilePageFrame>
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
