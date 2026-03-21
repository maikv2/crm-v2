"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleDollarSign, Coins, HandCoins, PieChart } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InvestorPortalResponse | null>(null);

  async function loadData(showRefreshing = false) {
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

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        router.push("/investor/login");
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar investidor mobile.");
      }

      setData(json);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar investidor mobile."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const latestDistributions = useMemo(() => {
    return (data?.distributions ?? []).slice(0, 5);
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

    return Array.from(map.values()).sort((a, b) =>
      a.regionName.localeCompare(b.regionName, "pt-BR")
    );
  }, [data]);

  return (
    <MobileShell
      title="Investidor"
      subtitle="Visão resumida das suas cotas"
      navItems={investorMobileNavItems}
      showBrand
      brandHref="/m/investor"
    >
      <MobileSectionTitle
        title="Resumo"
        action={
          <button
            onClick={() => loadData(true)}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>
        }
      />

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
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                marginBottom: 8,
                lineHeight: 1.15,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {data.investor.name}
            </div>

            <div
              style={{
                fontSize: 13,
                opacity: 0.9,
                lineHeight: 1.35,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {data.investor.email || "investidor"}
            </div>

            {data.investor.phone ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  opacity: 0.8,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {data.investor.phone}
              </div>
            ) : null}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Indicadores" />

            <MobileInfoRow
              title="Cotas ativas"
              right={String(data.summary.activeQuotaCount ?? 0)}
            />

            <MobileInfoRow
              title="Regiões"
              right={String(data.summary.totalRegions ?? 0)}
            />

            <MobileInfoRow
              title="Total investido"
              right={formatMoneyBR(data.summary.totalInvestedCents ?? 0)}
            />

            <MobileInfoRow
              title="Total recebido"
              right={formatMoneyBR(data.summary.totalDistributedCents ?? 0)}
            />

            <MobileInfoRow
              title="Pendente"
              right={formatMoneyBR(data.summary.pendingDistributionCents ?? 0)}
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Ações rápidas" />

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/m/investor/quotas" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <Coins size={18} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      wordBreak: "break-word",
                    }}
                  >
                    Minhas cotas
                  </div>
                </div>
              </Link>

              <Link
                href="/m/investor/distributions"
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <CircleDollarSign size={18} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      wordBreak: "break-word",
                    }}
                  >
                    Distribuições
                  </div>
                </div>
              </Link>

              <Link href="/m/investor/portal" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    minWidth: 0,
                  }}
                >
                  <PieChart size={18} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      wordBreak: "break-word",
                    }}
                  >
                    Portal completo
                  </div>
                </div>
              </Link>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Distribuições recentes" />

            {latestDistributions.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: colors.subtext,
                  lineHeight: 1.4,
                }}
              >
                Nenhuma distribuição registrada.
              </div>
            ) : (
              latestDistributions.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.region?.name || "Região"} • ${String(
                    item.month
                  ).padStart(2, "0")}/${item.year}`}
                  subtitle={`${item.quotaCount} cotas • ${item.status}`}
                  right={formatMoneyBR(item.totalDistributionCents ?? 0)}
                  href="/m/investor/distributions"
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Minha posição por região" />

            {groupedShares.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  color: colors.subtext,
                  lineHeight: 1.4,
                }}
              >
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

          <Link href="/m/investor/portal" style={{ textDecoration: "none" }}>
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
                  minWidth: 0,
                }}
              >
                <HandCoins size={18} />
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    wordBreak: "break-word",
                  }}
                >
                  Abrir portal completo do investidor
                </div>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: colors.subtext,
                  lineHeight: 1.4,
                }}
              >
                Para acompanhar mais detalhes por região.
              </div>
            </MobileCard>
          </Link>
        </>
      ) : null}
    </MobileShell>
  );
}