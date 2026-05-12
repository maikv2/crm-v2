"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, ChevronRight, Coins, FileBarChart2, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

const GOAL_PDVS = 400;
const GOAL_REVENUE_CENTS = 5_300_000; // R$53,000

type InvestorMeResponse = {
  investor: { id: string; name: string; email: string | null };
  summary: {
    activeQuotaCount: number;
    totalRegions: number;
    totalInvestedCents: number;
    totalDistributedCents: number;
    pendingDistributionCents: number;
  };
  liveEstimate?: {
    ebitdaCents: number;
    quarterlyFundCents: number;
    quarter: number;
    year: number;
  } | null;
  goalProgress?: {
    activePdvs: number;
    grossRevenueCents: number;
  } | null;
};

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: colors.isDark ? "#111827" : "#e8f0ff",
            color: colors.primary,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, lineHeight: 1.2 }}>{title}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext, lineHeight: 1.45 }}>{subtitle}</div>
          </div>
          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

function GoalBar({
  label,
  current,
  goal,
  formatValue,
  colors,
}: {
  label: string;
  current: number;
  goal: number;
  formatValue: (v: number) => string;
  colors: ReturnType<typeof getThemeColors>;
}) {
  const pct = goal > 0 ? (current / goal) * 100 : 0;
  const clampedPct = Math.min(pct, 110); // visually cap at 110%
  const exceeded = pct >= 100;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: colors.subtext, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 900, color: exceeded ? "#16a34a" : colors.primary }}>
          {Math.round(pct)}%
        </div>
      </div>
      <div style={{
        width: "100%", height: 10, borderRadius: 999,
        background: colors.isDark ? "#1e293b" : "#e2e8f0",
        overflow: "hidden", position: "relative",
      }}>
        <div style={{
          width: `${clampedPct}%`, height: "100%", borderRadius: 999,
          background: exceeded ? "#16a34a" : colors.primary,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ fontSize: 11, color: exceeded ? "#16a34a" : colors.text, fontWeight: 800 }}>
          {formatValue(current)}
          {exceeded && <span style={{ marginLeft: 4, color: "#16a34a" }}>✓ Meta atingida!</span>}
        </div>
        <div style={{ fontSize: 11, color: colors.subtext }}>meta: {formatValue(goal)}</div>
      </div>
    </div>
  );
}

export default function MobileInvestorDashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvestorMeResponse | null>(null);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Erro ao carregar painel do investidor.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar painel do investidor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const investorName = data?.investor?.name?.trim() || "Investidor";
  const summary = data?.summary;
  const liveEstimate = data?.liveEstimate;
  const goalProgress = data?.goalProgress;

  const totalRecebido = useMemo(() => summary?.totalDistributedCents ?? 0, [summary]);

  return (
    <MobileInvestorPageFrame
      title="Painel do investidor"
      subtitle={`Bem-vindo, ${investorName}`}
      desktopHref="/investor"
    >
      {loading ? (
        <MobileCard>Carregando painel...</MobileCard>
      ) : error ? (
        <MobileCard><div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div></MobileCard>
      ) : (
        <>
          {/* Resumo do investidor */}
          <MobileCard style={{ padding: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: colors.text, marginBottom: 2, lineHeight: 1.2 }}>
              {investorName}
            </div>
            <div style={{ fontSize: 12, color: colors.subtext, marginBottom: 16 }}>
              {summary?.activeQuotaCount ?? 0} cota(s) · {summary?.totalRegions ?? 0} região(ões)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Investido</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: colors.text, marginTop: 3 }}>
                  {formatMoneyBR(summary?.totalInvestedCents ?? 0)}
                </div>
              </div>
              <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Já recebido</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#16a34a", marginTop: 3 }}>
                  {formatMoneyBR(totalRecebido)}
                </div>
              </div>
              {liveEstimate && (
                <>
                  <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#1c1917" : "#fffbeb", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>EBITDA · ao vivo</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b", marginTop: 3 }}>
                      {formatMoneyBR(liveEstimate.ebitdaCents)}
                    </div>
                  </div>
                  <div style={{ borderRadius: 12, padding: "10px 12px", background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>Fundo trim. · ao vivo</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#2563eb", marginTop: 3 }}>
                      {formatMoneyBR(liveEstimate.quarterlyFundCents)}
                    </div>
                    <div style={{ fontSize: 10, color: "#1e40af", marginTop: 1 }}>{liveEstimate.quarter}º tri/{liveEstimate.year}</div>
                  </div>
                </>
              )}
            </div>
          </MobileCard>

          {/* Meta */}
          {goalProgress != null && (
            <MobileCard style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Target size={18} color={colors.primary} />
                <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>Nossa meta</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.subtext, background: colors.isDark ? "#1e293b" : "#f1f5f9", borderRadius: 999, padding: "2px 8px", border: `1px solid ${colors.border}`, marginLeft: "auto" }}>
                  mês atual
                </div>
              </div>
              <GoalBar
                label="PDVs ativos"
                current={goalProgress.activePdvs}
                goal={GOAL_PDVS}
                formatValue={(v) => `${v} PDVs`}
                colors={colors}
              />
              <GoalBar
                label="Faturamento bruto"
                current={goalProgress.grossRevenueCents}
                goal={GOAL_REVENUE_CENTS}
                formatValue={(v) => formatMoneyBR(v)}
                colors={colors}
              />
            </MobileCard>
          )}

          {/* Atalhos */}
          <MobileCard>
            <MobileSectionTitle
              title="Navegar"
              action={
                <button
                  onClick={() => load(true)}
                  style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}
                >
                  {refreshing ? "..." : "↻"}
                </button>
              }
            />
            <div style={{ display: "grid", gap: 10 }}>
              <Shortcut
                href="/m/investor/quotas"
                title="Minhas cotas"
                subtitle="Ver cotas, regiões e valores investidos"
                icon={<Coins size={18} />}
              />
              <Shortcut
                href="/m/investor/distributions"
                title="Distribuições"
                subtitle="EBITDA e fundo trimestral em tempo real"
                icon={<BadgeDollarSign size={18} />}
              />
              <Shortcut
                href="/m/investor/portal"
                title="Relatório financeiro"
                subtitle="Receitas e despesas por região"
                icon={<FileBarChart2 size={18} />}
              />
            </div>
          </MobileCard>
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
