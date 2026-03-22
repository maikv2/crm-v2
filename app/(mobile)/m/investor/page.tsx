"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  Building2,
  ChevronRight,
  Layers3,
  PieChart,
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

type InvestorMeResponse = {
  investor?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
};

type ShareItem = {
  id: string;
  quotaNumber: number;
  amountCents: number;
};

type DistributionItem = {
  id: string;
  totalDistributionCents: number;
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
      <div style={{ fontSize: 13, color: colors.subtext }}>{value}</div>
    </div>
  );
}

export default function MobileInvestorDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [investorName, setInvestorName] = useState("Investidor");
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [distributions, setDistributions] = useState<DistributionItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [meRes, sharesRes, distributionsRes] = await Promise.all([
          fetch("/api/investor-auth/me", { cache: "no-store" }),
          fetch("/api/investor/shares", { cache: "no-store" }),
          fetch("/api/investor/distributions", { cache: "no-store" }),
        ]);

        if (meRes.status === 401 || sharesRes.status === 401 || distributionsRes.status === 401) {
          router.push("/investor/login");
          return;
        }

        const meJson = (await meRes.json().catch(() => null)) as InvestorMeResponse | null;
        const sharesJson = await sharesRes.json().catch(() => null);
        const distributionsJson = await distributionsRes.json().catch(() => null);

        if (!sharesRes.ok) {
          throw new Error(sharesJson?.error || "Erro ao carregar cotas.");
        }

        if (!distributionsRes.ok) {
          throw new Error(distributionsJson?.error || "Erro ao carregar distribuições.");
        }

        if (active) {
          setInvestorName(meJson?.investor?.name?.trim() || "Investidor");
          setShares(Array.isArray(sharesJson?.shares) ? sharesJson.shares : []);
          setDistributions(
            Array.isArray(distributionsJson?.distributions)
              ? distributionsJson.distributions
              : []
          );
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar painel do investidor."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  const investedCents = useMemo(() => {
    return shares.reduce((acc, share) => acc + (share.amountCents ?? 0), 0);
  }, [shares]);

  const totalDistributionsCents = useMemo(() => {
    return distributions.reduce(
      (acc, item) => acc + (item.totalDistributionCents ?? 0),
      0
    );
  }, [distributions]);

  const averageQuotaCents = useMemo(() => {
    if (!shares.length) return 0;
    return Math.round(investedCents / shares.length);
  }, [investedCents, shares]);

  return (
    <MobileInvestorPageFrame
      title="Bem-vindo"
      subtitle={investorName}
      desktopHref="/investor"
    >
      {loading ? (
        <MobileCard>Carregando dashboard...</MobileCard>
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
              {formatMoneyBR(investedCents)}
            </div>

            <div style={{ fontSize: 13, opacity: 0.75 }}>
              {shares.length} cotas ativas • {formatMoneyBR(totalDistributionsCents)} em
              distribuições
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
              value={String(shares.length)}
              helper="Total em carteira"
            />

            <MobileStatCard
              label="Distribuições"
              value={formatMoneyBR(totalDistributionsCents)}
              helper="Total recebido"
            />

            <MobileStatCard
              label="Média por cota"
              value={formatMoneyBR(averageQuotaCents)}
              helper="Valor investido"
            />

            <MobileStatCard
              label="Últimas posições"
              value={String(Math.min(shares.length, 4))}
              helper="Resumo abaixo"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Atalhos principais" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/investor/quotas"
                title="Minhas cotas"
                subtitle="Ver todas as cotas e os valores investidos"
                icon={<Layers3 size={18} />}
              />

              <Shortcut
                href="/m/investor/distributions"
                title="Distribuições"
                subtitle="Consultar histórico e valores recebidos"
                icon={<BadgeDollarSign size={18} />}
              />

              <Shortcut
                href="/m/investor/portal"
                title="Portal completo"
                subtitle="Abrir visão detalhada com resultados das regiões"
                icon={<Building2 size={18} />}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resumo das cotas" />

            {shares.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma cota encontrada.</div>
            ) : (
              shares.slice(0, 4).map((share, index) => (
                <RowValue
                  key={share.id}
                  title={`Cota #${share.quotaNumber}`}
                  value={formatMoneyBR(share.amountCents)}
                  last={index === Math.min(shares.length, 4) - 1}
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Visão geral" />
            <Shortcut
              href="/m/investor/portal"
              title="Abrir visão consolidada"
              subtitle="Acompanhar patrimônio, regiões e projeções"
              icon={<PieChart size={18} />}
            />
          </MobileCard>
        </>
      )}
    </MobileInvestorPageFrame>
  );
}