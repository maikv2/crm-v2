"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  ChevronRight,
  Layers3,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ShareItem = {
  id: string;
  quotaNumber: number;
  amountCents: number;
  investedAt: string;
  paidBackAt?: string | null;
  regionId: string;
  region?: {
    id: string;
    name: string;
    quotaValueCents: number;
    maxQuotaCount: number;
  } | null;
};

type DistributionItem = {
  id: string;
  regionId: string;
  month: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  paidAt?: string | null;
  status: string;
  region?: {
    id: string;
    name: string;
  } | null;
};

type QuarterlyDistributionItem = {
  id: string;
  regionId: string;
  quarter: number;
  year: number;
  quotaCount: number;
  valuePerQuotaCents: number;
  totalDistributionCents: number;
  quarterlyFundTotalCents: number;
  status: string;
  region?: { name?: string | null } | null;
};

type InvestorMeResponse = {
  investor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    document: string | null;
    notes: string | null;
  };
  summary: {
    activeQuotaCount: number;
    totalRegions: number;
    totalInvestedCents: number;
    totalDistributedCents: number;
    pendingDistributionCents: number;
  };
  liveEstimate?: {
    quarterlyFundCents: number;
    quarter: number;
    year: number;
  } | null;
  shares: ShareItem[];
  distributions: DistributionItem[];
  quarterlyFundDistributions: QuarterlyDistributionItem[];
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
  const shares = data?.shares ?? [];
  const distributions = data?.distributions ?? [];
  const quarterlyFundDistributions = data?.quarterlyFundDistributions ?? [];
  const liveEstimate = data?.liveEstimate;

  // Live estimate: real-time fund based on actual revenue − expenses so far this quarter
  const liveFundoCents = liveEstimate?.quarterlyFundCents ?? 0;

  const totalDistribuidoPago = useMemo(() =>
    distributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0) +
    quarterlyFundDistributions.filter((d) => d.status === "PAID").reduce((s, d) => s + d.totalDistributionCents, 0),
  [distributions, quarterlyFundDistributions]);

  const latestShares = useMemo(() =>
    [...shares].sort((a, b) => a.quotaNumber - b.quotaNumber).slice(0, 4),
  [shares]);

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
          {/* Estimativa do fundo trimestral — ao vivo */}
          <MobileCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>
                Fundo trimestral — estimativa
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "2px 8px" }}>
                {liveEstimate ? `${liveEstimate.quarter}º tri/${liveEstimate.year}` : "ao vivo"}
              </div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#f59e0b", lineHeight: 1.1, marginBottom: 6 }}>
              {formatMoneyBR(liveFundoCents)}
            </div>
            <div style={{ fontSize: 11, color: colors.subtext, marginBottom: 14 }}>
              {summary?.activeQuotaCount ?? 0} cota(s) · {summary?.totalRegions ?? 0} região(ões) · atualizado em tempo real
            </div>

            {/* Já distribuído */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ borderRadius: 12, background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Já recebido</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#16a34a", marginTop: 3 }}>{formatMoneyBR(totalDistribuidoPago)}</div>
                <div style={{ fontSize: 10, color: "#166534", marginTop: 2 }}>total pago</div>
              </div>
              <div style={{ borderRadius: 12, background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}`, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Total investido</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: colors.text, marginTop: 3 }}>{formatMoneyBR(summary?.totalInvestedCents ?? 0)}</div>
                <div style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>{summary?.activeQuotaCount ?? 0} cota(s)</div>
              </div>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle
              title="Atalhos"
              action={
                <button
                  onClick={() => load(true)}
                  style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}
                >
                  {refreshing ? "..." : "↻"}
                </button>
              }
            />
            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/investor/quotas"
                title="Minhas cotas"
                subtitle="Ver cotas, regiões e valores investidos"
                icon={<Layers3 size={18} />}
              />
              <Shortcut
                href="/m/investor/distributions"
                title="Distribuições"
                subtitle="Histórico de repasses — mensal e fundo trimestral"
                icon={<BadgeDollarSign size={18} />}
              />
              <Shortcut
                href="/investor"
                title="Abrir desktop"
                subtitle="Painel completo do investidor"
                icon={<Smartphone size={18} />}
              />
            </div>
          </MobileCard>

          {latestShares.length > 0 && (
            <MobileCard>
              <MobileSectionTitle title="Minhas cotas" />
              <div style={{ display: "grid", gap: 0 }}>
                {latestShares.map((share, index) => (
                  <div
                    key={share.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: index < latestShares.length - 1 ? `1px solid ${colors.border}` : "none",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Cota #{share.quotaNumber}</div>
                    <div style={{ fontSize: 12, color: colors.subtext }}>{share.region?.name ?? formatMoneyBR(share.amountCents)}</div>
                  </div>
                ))}
              </div>
            </MobileCard>
          )}
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
