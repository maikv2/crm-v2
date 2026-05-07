"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type MonthlyDistribution = {
  id: string;
  month: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  payoutPhase?: string;
  status: string;
  region?: { name?: string | null } | null;
};

type QuarterlyDistribution = {
  id: string;
  quarter: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  quarterlyFundTotalCents: number;
  payoutPhase?: string;
  status: string;
  region?: { name?: string | null } | null;
};

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function StatusBadge({ status }: { status: string }) {
  const paid = status === "PAID";
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
      background: paid ? "#f0fdf4" : "#fffbeb",
      color: paid ? "#166534" : "#92400e",
      border: `1px solid ${paid ? "#bbf7d0" : "#fde68a"}`,
      textTransform: "uppercase",
    }}>
      {paid ? "Pago" : "Pendente"}
    </span>
  );
}

function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null;
  const isPayback = phase === "PAYBACK";
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
      background: isPayback ? "#fffbeb" : "#eff6ff",
      color: isPayback ? "#92400e" : "#1e40af",
      border: `1px solid ${isPayback ? "#fde68a" : "#bfdbfe"}`,
      textTransform: "uppercase",
    }}>
      {isPayback ? "Recuperação" : "Pós-payback"}
    </span>
  );
}

export default function MobileInvestorDistributionsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const colors = getThemeColors(mode);

  const [activeTab, setActiveTab] = useState<"monthly" | "quarterly">("monthly");
  const [data, setData] = useState<{
    distributions?: MonthlyDistribution[];
    quarterlyFundDistributions?: QuarterlyDistribution[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Erro ao carregar distribuições:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const distributions = useMemo(() => data?.distributions ?? [], [data]);
  const quarterlyDistributions = useMemo(() => data?.quarterlyFundDistributions ?? [], [data]);

  const monthlySummary = useMemo(() => ({
    totalPaid: distributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0),
    totalPending: distributions.filter((d) => d.status === "PENDING").reduce((s, d) => s + d.totalDistributionCents, 0),
  }), [distributions]);

  const quarterlySummary = useMemo(() => ({
    totalPaid: quarterlyDistributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0),
    totalPending: quarterlyDistributions.filter((d) => d.status === "PENDING").reduce((s, d) => s + d.totalDistributionCents, 0),
  }), [quarterlyDistributions]);

  return (
    <MobileInvestorPageFrame
      title="Distribuições"
      subtitle="Histórico de repasses"
      desktopHref="/investor/distributions"
    >
      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["monthly", "quarterly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 0",
              borderRadius: 14,
              border: `1px solid ${activeTab === tab ? colors.primary : colors.border}`,
              background: activeTab === tab ? colors.primary : (colors.isDark ? "#0f172a" : "#f8fafc"),
              color: activeTab === tab ? "#fff" : colors.text,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {tab === "monthly" ? "Mensal" : "Fundo Trimestral"}
          </button>
        ))}
      </div>

      {loading ? (
        <MobileCard>Carregando distribuições...</MobileCard>
      ) : activeTab === "monthly" ? (
        <>
          {/* Resumo mensal */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ borderRadius: 16, padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Recebido</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#166534", marginTop: 4 }}>{formatMoneyBR(monthlySummary.totalPaid)}</div>
            </div>
            <div style={{ borderRadius: 16, padding: 14, background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Pendente</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#92400e", marginTop: 4 }}>{formatMoneyBR(monthlySummary.totalPending)}</div>
            </div>
          </div>

          <MobileCard>
            <MobileSectionTitle
              title="Distribuições mensais"
              action={
                <button onClick={() => load(true)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}>
                  {refreshing ? "..." : "↻"}
                </button>
              }
            />
            {distributions.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma distribuição encontrada.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {distributions.map((dist) => (
                  <div key={dist.id} style={{ borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`, paddingBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{formatMonthYear(dist.month, dist.year)}</div>
                        <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>{dist.region?.name ?? "-"} · {dist.quotaCount} cota(s)</div>
                        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <StatusBadge status={dist.status} />
                          <PhaseBadge phase={dist.payoutPhase} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>{formatMoneyBR(dist.totalDistributionCents)}</div>
                        <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>{formatMoneyBR(dist.valuePerQuotaCents)}/cota</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      ) : (
        <>
          {/* Resumo trimestral */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ borderRadius: 16, padding: 14, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Recebido</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#166534", marginTop: 4 }}>{formatMoneyBR(quarterlySummary.totalPaid)}</div>
            </div>
            <div style={{ borderRadius: 16, padding: 14, background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Pendente</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#92400e", marginTop: 4 }}>{formatMoneyBR(quarterlySummary.totalPending)}</div>
            </div>
          </div>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>O que é o Fundo Trimestral?</div>
            <div style={{ fontSize: 12, color: "#78350f", marginTop: 4, lineHeight: 1.5 }}>
              Eficiência operacional da região (custo provisionado − custo real), distribuída trimestralmente seguindo a regra 60%/40%.
            </div>
          </div>

          <MobileCard>
            <MobileSectionTitle title="Distribuições trimestrais" />
            {quarterlyDistributions.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhum fundo trimestral distribuído ainda.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {quarterlyDistributions.map((dist) => (
                  <div key={dist.id} style={{ borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`, paddingBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{dist.quarter}º Trim/{dist.year}</div>
                        <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>{dist.region?.name ?? "-"} · {dist.quotaCount} cota(s)</div>
                        <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <StatusBadge status={dist.status} />
                          <PhaseBadge phase={dist.payoutPhase} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b" }}>{formatMoneyBR(dist.totalDistributionCents)}</div>
                        <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
                          fundo: {formatMoneyBR(dist.quarterlyFundTotalCents)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
