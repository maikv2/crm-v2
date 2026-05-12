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

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function getNextEbitdaDate(): Date {
  const now = new Date();
  const day = now.getDate();
  if (day < 5) {
    return new Date(now.getFullYear(), now.getMonth(), 5);
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 5);
}

function getNextQuarterlyFundDate(): Date {
  const now = new Date();
  const m = now.getMonth() + 1; // 1-12
  const quarterEndMonth = m <= 3 ? 3 : m <= 6 ? 6 : m <= 9 ? 9 : 12;
  const payoutMonth = quarterEndMonth + 1;
  const payoutYear = payoutMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
  const adjPayoutMonth = payoutMonth > 12 ? 1 : payoutMonth;
  const payoutDate = new Date(payoutYear, adjPayoutMonth - 1, 5);
  if (now > payoutDate) {
    const nextQEnd = quarterEndMonth + 3;
    const nextPM = nextQEnd + 1;
    const nextPY = nextPM > 12 ? payoutYear + 1 : payoutYear;
    const adjNextPM = nextPM > 12 ? nextPM - 12 : nextPM;
    return new Date(nextPY, adjNextPM - 1, 5);
  }
  return payoutDate;
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
    liveEstimate?: { ebitdaCents: number; quarterlyFundCents: number; quarter: number; year: number } | null;
    summary?: { totalInvestedCents: number; activeQuotaCount: number } | null;
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
  const liveEstimate = data?.liveEstimate;

  const liveEbitdaCents = liveEstimate?.ebitdaCents ?? 0;
  const liveFundoCents = liveEstimate?.quarterlyFundCents ?? 0;
  const totalInvestedCents = data?.summary?.totalInvestedCents ?? 0;

  const ebitdaPago = useMemo(() =>
    distributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0),
  [distributions]);

  const fundoPago = useMemo(() =>
    quarterlyDistributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0),
  [quarterlyDistributions]);

  const nextEbitdaDate = getNextEbitdaDate();
  const nextFundoDate = getNextQuarterlyFundDate();

  return (
    <MobileInvestorPageFrame
      title="Distribuições"
      subtitle="Seus repasses de EBITDA e fundo trimestral"
      desktopHref="/investor/distributions"
    >
      {/* Live estimates — always visible */}
      {!loading && (
        <>
          {/* EBITDA ao vivo */}
          <MobileCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                EBITDA — estimativa do mês
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 8px" }}>
                ao vivo
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#f59e0b", lineHeight: 1, marginBottom: 6 }}>
              {formatMoneyBR(liveEbitdaCents)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: colors.subtext }}>Sua parte · atualizado em tempo real</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "2px 7px" }}>
                Próx: {nextEbitdaDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
            </div>
          </MobileCard>

          {/* Fundo trimestral ao vivo */}
          <MobileCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                Fundo trimestral — estimativa
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 999, padding: "2px 8px" }}>
                {liveEstimate ? `${liveEstimate.quarter}º tri/${liveEstimate.year}` : "ao vivo"}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#2563eb", lineHeight: 1, marginBottom: 6 }}>
              {formatMoneyBR(liveFundoCents)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: colors.subtext }}>Receita − despesas · acumulado trimestre</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 7px" }}>
                Próx: {nextFundoDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </div>
            </div>
          </MobileCard>

          {/* Próximas datas */}
          <MobileCard style={{ padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: colors.text, marginBottom: 10, textTransform: "uppercase" }}>
              Próximas retiradas
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#1c1917" : "#fffbeb", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 4 }}>EBITDA</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{formatDate(nextEbitdaDate)}</div>
              </div>
              <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", marginBottom: 4 }}>Fundo Trim.</div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "#2563eb" }}>{formatDate(nextFundoDate)}</div>
              </div>
            </div>
          </MobileCard>
        </>
      )}

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["monthly", "quarterly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 0", borderRadius: 14,
              border: `1px solid ${activeTab === tab ? colors.primary : colors.border}`,
              background: activeTab === tab ? colors.primary : (colors.isDark ? "#0f172a" : "#f8fafc"),
              color: activeTab === tab ? "#fff" : colors.text,
              fontWeight: 800, fontSize: 13, cursor: "pointer",
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
            <div style={{ borderRadius: 16, padding: 14, background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Já recebido</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#166534", marginTop: 4 }}>{formatMoneyBR(ebitdaPago)}</div>
            </div>
            <div style={{ borderRadius: 16, padding: 14, background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Pendente</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: colors.text, marginTop: 4 }}>
                {formatMoneyBR(distributions.filter(d => d.status === "PENDING").reduce((s, d) => s + d.totalDistributionCents, 0))}
              </div>
            </div>
          </div>

          <MobileCard>
            <MobileSectionTitle
              title="Distribuições mensais (EBITDA)"
              action={
                <button onClick={() => load(true)} style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}>
                  {refreshing ? "..." : "↻"}
                </button>
              }
            />
            {distributions.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma distribuição mensal encontrada.</div>
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
                        <div style={{ fontSize: 15, fontWeight: 900, color: colors.primary }}>{formatMoneyBR(dist.totalDistributionCents)}</div>
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
            <div style={{ borderRadius: 16, padding: 14, background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Já recebido</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#166534", marginTop: 4 }}>{formatMoneyBR(fundoPago)}</div>
            </div>
            <div style={{ borderRadius: 16, padding: 14, background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>Estimativa</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>{formatMoneyBR(liveFundoCents)}</div>
            </div>
          </div>

          <MobileCard>
            <MobileSectionTitle title="Fundo trimestral (sua parte)" />
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
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#2563eb" }}>{formatMoneyBR(dist.totalDistributionCents)}</div>
                        <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>{formatMoneyBR(dist.valuePerQuotaCents)}/cota</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}

      {/* Seção motivacional: 10x */}
      {!loading && (liveEbitdaCents > 0 || liveFundoCents > 0 || totalInvestedCents > 0) && (
        <MobileCard style={{ padding: 16, background: colors.isDark ? "#0c0f1a" : "#f0f4ff", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#1e40af", textTransform: "uppercase", marginBottom: 4 }}>
            E se você tivesse 10x mais?
          </div>
          <div style={{ fontSize: 11, color: colors.subtext, marginBottom: 14, lineHeight: 1.5 }}>
            Imagine ter 10x o investimento atual. Veja como ficariam seus rendimentos estimados:
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#dbeafe"}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.subtext }}>Investimento atual</div>
                <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>10x seria</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{formatMoneyBR(totalInvestedCents)}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#2563eb" }}>{formatMoneyBR(totalInvestedCents * 10)}</div>
              </div>
            </div>
            {liveEbitdaCents > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${colors.isDark ? "#1e293b" : "#dbeafe"}` }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: colors.subtext }}>EBITDA mensal atual</div>
                  <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>10x seria por mês</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b" }}>{formatMoneyBR(liveEbitdaCents)}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#2563eb" }}>{formatMoneyBR(liveEbitdaCents * 10)}</div>
                </div>
              </div>
            )}
            {liveFundoCents > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: colors.subtext }}>Fundo trimestral atual</div>
                  <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>10x seria por trimestre</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b" }}>{formatMoneyBR(liveFundoCents)}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#2563eb" }}>{formatMoneyBR(liveFundoCents * 10)}</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: "#1e40af", fontWeight: 700, textAlign: "center", lineHeight: 1.5 }}>
            Fale com um de nossos representantes e escale sua participação.
          </div>
        </MobileCard>
      )}
    </MobileInvestorPageFrame>
  );
}
