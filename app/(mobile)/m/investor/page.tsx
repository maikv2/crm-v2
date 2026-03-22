"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  ChevronRight,
  Layers3,
  LayoutDashboard,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
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
  shares: ShareItem[];
  distributions: DistributionItem[];
};

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

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
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111827" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

function RowValue({
  title,
  value,
  last = false,
}: {
  title: string;
  value: string;
  last?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          color: colors.subtext,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function MobileInvestorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvestorMeResponse | null>(null);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const res = await fetch("/api/investor-auth/me", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/investor/login");
        return;
      }

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;

      if (!res.ok) {
        throw new Error(
          (json as any)?.error || "Erro ao carregar painel do investidor."
        );
      }

      setData(json);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar painel do investidor."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const investorName = data?.investor?.name?.trim() || "Investidor";
  const summary = data?.summary;
  const shares = data?.shares ?? [];
  const distributions = data?.distributions ?? [];

  const latestShares = useMemo(() => {
    return [...shares].sort((a, b) => a.quotaNumber - b.quotaNumber).slice(0, 4);
  }, [shares]);

  const latestDistributions = useMemo(() => {
    return [...distributions]
      .sort((a, b) => {
        if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
        return (b.month ?? 0) - (a.month ?? 0);
      })
      .slice(0, 3);
  }, [distributions]);

  return (
    <MobileInvestorPageFrame
      title="Painel do investidor"
      subtitle={`Bem-vindo, ${investorName}`}
      desktopHref="/investor"
    >
      {loading ? (
        <MobileCard>Carregando painel...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <MobileCard style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Total investido
            </div>

            <div
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 900,
                marginBottom: 8,
              }}
            >
              {formatMoneyBR(summary?.totalInvestedCents ?? 0)}
            </div>

            <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>
              {summary?.activeQuotaCount ?? 0} cota(s) ativa(s) •{" "}
              {summary?.totalRegions ?? 0} região(ões) •{" "}
              {formatMoneyBR(summary?.pendingDistributionCents ?? 0)} pendente(s)
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Cotas"
              value={String(summary?.activeQuotaCount ?? 0)}
              helper="Ativas"
            />

            <MobileStatCard
              label="Distribuído"
              value={formatMoneyBR(summary?.totalDistributedCents ?? 0)}
              helper="Total pago"
            />

            <MobileStatCard
              label="Regiões"
              value={String(summary?.totalRegions ?? 0)}
              helper="Participações"
            />

            <MobileStatCard
              label="Pendente"
              value={formatMoneyBR(summary?.pendingDistributionCents ?? 0)}
              helper="A receber"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle
              title="Atalhos principais"
              action={
                <button
                  onClick={() => load(true)}
                  style={{
                    height: 34,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #dbe3ef",
                    background: "#ffffff",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {refreshing ? "Atualizando..." : "Atualizar"}
                </button>
              }
            />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/investor/quotas"
                title="Minhas cotas"
                subtitle="Ver cotas, regiões vinculadas e valores investidos"
                icon={<Layers3 size={18} />}
              />

              <Shortcut
                href="/m/investor/distributions"
                title="Distribuições"
                subtitle="Consultar histórico de repasses e status de pagamento"
                icon={<BadgeDollarSign size={18} />}
              />

              <Shortcut
                href="/investor"
                title="Abrir desktop"
                subtitle="Voltar para a versão desktop do painel do investidor"
                icon={<Smartphone size={18} />}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resumo das cotas" />

            {latestShares.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma cota encontrada.</div>
            ) : (
              latestShares.map((share, index) => (
                <RowValue
                  key={share.id}
                  title={`Cota #${share.quotaNumber}`}
                  value={share.region?.name || formatMoneyBR(share.amountCents ?? 0)}
                  last={index === latestShares.length - 1}
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Últimas distribuições" />

            {latestDistributions.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma distribuição encontrada.</div>
            ) : (
              latestDistributions.map((item, index) => (
                <RowValue
                  key={item.id}
                  title={`${formatMonthYear(item.month, item.year)} • ${
                    item.region?.name || "Região"
                  }`}
                  value={formatMoneyBR(item.totalDistributionCents ?? 0)}
                  last={index === latestDistributions.length - 1}
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Visão geral" />
            <Shortcut
              href="/investor"
              title="Painel completo"
              subtitle="Abrir o dashboard desktop com visão consolidada do investidor"
              icon={<LayoutDashboard size={18} />}
            />
          </MobileCard>
        </>
      )}
    </MobileInvestorPageFrame>
  );
}