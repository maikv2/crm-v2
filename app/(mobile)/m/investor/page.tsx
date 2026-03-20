"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  Coins,
  HandCoins,
  PieChart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { investorMobileNavItems } from "@/app/components/mobile/mobile-investor-shared";
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

type InvestorPortalResponse = {
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

export default function MobileInvestorPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvestorPortalResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/investor-auth/me", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/investor/login");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar investidor mobile.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar investidor mobile."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  const latestDistributions = useMemo(() => {
    return (data?.distributions ?? []).slice(0, 6);
  }, [data]);

  const groupedShares = useMemo(() => {
    const map = new Map<
      string,
      { regionName: string; quotaCount: number; totalCents: number }
    >();

    for (const share of data?.shares ?? []) {
      const regionName = share.region?.name ?? "Região";
      const current = map.get(regionName) ?? {
        regionName,
        quotaCount: 0,
        totalCents: 0,
      };

      current.quotaCount += 1;
      current.totalCents += share.amountCents ?? 0;

      map.set(regionName, current);
    }

    return Array.from(map.values()).sort((a, b) => b.totalCents - a.totalCents);
  }, [data]);

  return (
    <MobileShell
      title="Investidor"
      subtitle="Visão resumida das suas cotas"
      navItems={investorMobileNavItems}
      showBrand
      brandHref="/m/investor"
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : data ? (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
              {data.investor.name}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              {data.investor.email || "investidor"}
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
              label="Cotas ativas"
              value={String(data.summary.activeQuotaCount)}
            />
            <MobileStatCard
              label="Regiões"
              value={String(data.summary.totalRegions)}
            />
            <MobileStatCard
              label="Investido"
              value={formatMoneyBR(data.summary.totalInvestedCents)}
            />
            <MobileStatCard
              label="Pendente"
              value={formatMoneyBR(data.summary.pendingDistributionCents)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Ações rápidas" />
            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/m/investor/quotas">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Coins size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Minhas cotas</div>
                </div>
              </Link>

              <Link href="/m/investor/distributions">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CircleDollarSign size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    Distribuições
                  </div>
                </div>
              </Link>

              <Link href="/m/investor/portal">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <PieChart size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Portal completo</div>
                </div>
              </Link>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Distribuições recentes" />
            {latestDistributions.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhuma distribuição registrada.
              </div>
            ) : (
              latestDistributions.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.region?.name || "Região"} • ${String(item.month).padStart(
                    2,
                    "0"
                  )}/${item.year}`}
                  subtitle={`${item.quotaCount} cotas • ${item.status}`}
                  right={formatMoneyBR(item.totalDistributionCents)}
                  href="/m/investor/distributions"
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Minha posição por região" />
            {groupedShares.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhuma cota ativa encontrada.
              </div>
            ) : (
              groupedShares.map((item) => (
                <MobileInfoRow
                  key={item.regionName}
                  title={item.regionName}
                  subtitle={`${item.quotaCount} cotas`}
                  right={formatMoneyBR(item.totalCents)}
                  href="/m/investor/quotas"
                />
              ))
            )}
          </MobileCard>

          <Link href="/m/investor/portal">
            <MobileCard
              style={{
                background: colors.isDark ? "#111827" : "#eef4ff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <HandCoins size={18} />
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  Abrir portal completo do investidor
                </div>
              </div>
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Para acompanhar mais detalhes por região.
              </div>
            </MobileCard>
          </Link>
        </>
      ) : null}
    </MobileShell>
  );
}