"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

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

type DailyInvestorItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  estimatedDistributionCents: number;
  quotaNumbers: number[];
};

type DailyRegionItem = {
  regionId: string;
  regionName: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  cmvCents: number;
  logisticsCents: number;
  commissionCents: number;
  taxesCents: number;
  administrativeCents: number;
  operatingProfitCents: number;
  ebitdaEstimatedCents: number;
  reserveEstimatedCents: number;
  activePdvs: number;
  activeClients: number;
  activeQuotaCount: number;
  investorQuotaCount: number;
  companyQuotaCount: number;
  availableQuotaCount: number;
  estimatedInvestorPoolCents: number;
  estimatedCompanyPoolCents: number;
  estimatedValuePerInvestorQuotaCents: number;
  investors: DailyInvestorItem[];
};

type DailyRegionsResponse = {
  success: boolean;
  month: number;
  year: number;
  items: Array<{
    regionId: string;
    regionName: string;
    success: boolean;
    data?: DailyRegionItem;
    error?: string;
  }>;
};

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

export default function MobileInvestorPortalPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<InvestorPortalResponse | null>(null);
  const [dailyRegions, setDailyRegions] = useState<DailyRegionItem[]>([]);

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [meRes, dailyRes] = await Promise.all([
        fetch("/api/investor-auth/me", {
          cache: "no-store",
        }),
        fetch("/api/regions/daily-result", {
          cache: "no-store",
        }),
      ]);

      if (meRes.status === 401) {
        router.push("/investor/login");
        return;
      }

      const meJson = await meRes.json().catch(() => null);
      const dailyJson = await dailyRes.json().catch(() => null);

      if (!meRes.ok) {
        throw new Error(meJson?.error || "Erro ao carregar portal do investidor.");
      }

      if (!dailyRes.ok) {
        throw new Error(
          dailyJson?.error || "Erro ao carregar resultado diário das regiões."
        );
      }

      const meData = meJson as InvestorPortalResponse;
      const dailyData = dailyJson as DailyRegionsResponse;

      setData(meData);
      setDailyRegions(
        Array.isArray(dailyData?.items)
          ? dailyData.items
              .filter((item) => item.success && item.data)
              .map((item) => item.data as DailyRegionItem)
          : []
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar portal do investidor."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const myDailyRegions = useMemo(() => {
    if (!data) return [];

    const regionIds = new Set((data.shares ?? []).map((share) => share.regionId));

    return dailyRegions
      .filter((region) => regionIds.has(region.regionId))
      .sort((a, b) => a.regionName.localeCompare(b.regionName, "pt-BR"));
  }, [data, dailyRegions]);

  const projectedInvestorTotalCents = useMemo(() => {
    if (!data) return 0;

    const investorId = data.investor.id;

    return myDailyRegions.reduce((sum, region) => {
      const mine = region.investors.find((item) => item.investorId === investorId);
      return sum + (mine?.estimatedDistributionCents ?? 0);
    }, 0);
  }, [data, myDailyRegions]);

  const projectedQuotaTotalCents = useMemo(() => {
    if (!data) return 0;

    const investorId = data.investor.id;

    return myDailyRegions.reduce((sum, region) => {
      const mine = region.investors.find((item) => item.investorId === investorId);

      if (!mine?.quotaCount) return sum;

      return sum + region.estimatedValuePerInvestorQuotaCents * mine.quotaCount;
    }, 0);
  }, [data, myDailyRegions]);

  const latestDistributions = useMemo(() => {
    return (data?.distributions ?? []).slice(0, 6);
  }, [data]);

  return (
    <MobileInvestorPageFrame
      title="Portal"
      subtitle="Portal completo do investidor"
      desktopHref="/investor"
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
              border: "1px solid #dbe3ef",
              background: "#ffffff",
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

      {loading ? <MobileCard>Carregando portal...</MobileCard> : null}

      {!loading && error ? <MobileCard>{error}</MobileCard> : null}

      {!loading && !error && data ? (
        <>
          <MobileCard>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                marginBottom: 6,
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
                opacity: 0.8,
                lineHeight: 1.35,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {data.investor.email || "Sem e-mail"}
            </div>

            {data.investor.phone ? (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  opacity: 0.75,
                  lineHeight: 1.35,
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                }}
              >
                {data.investor.phone}
              </div>
            ) : null}
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <MobileStatCard
              label="Cotas ativas"
              value={String(data.summary.activeQuotaCount ?? 0)}
            />
            <MobileStatCard
              label="Regiões"
              value={String(data.summary.totalRegions ?? 0)}
            />
            <MobileStatCard
              label="Investido"
              value={formatMoneyBR(data.summary.totalInvestedCents ?? 0)}
            />
            <MobileStatCard
              label="Recebido"
              value={formatMoneyBR(data.summary.totalDistributedCents ?? 0)}
            />
            <MobileStatCard
              label="Pendente"
              value={formatMoneyBR(data.summary.pendingDistributionCents ?? 0)}
            />
            <MobileStatCard
              label="Projeção do mês"
              value={formatMoneyBR(projectedInvestorTotalCents)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Projeção" />

            <MobileInfoRow
              title="Minha projeção total"
              right={formatMoneyBR(projectedInvestorTotalCents)}
            />

            <MobileInfoRow
              title="Base pelas cotas"
              subtitle="Estimativa somada das suas cotas nas regiões vinculadas"
              right={formatMoneyBR(projectedQuotaTotalCents)}
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Distribuições recentes" />

            {latestDistributions.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.8,
                  lineHeight: 1.4,
                }}
              >
                Nenhuma distribuição registrada.
              </div>
            ) : (
              latestDistributions.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.region?.name || "Região"} • ${formatMonthYear(
                    item.month,
                    item.year
                  )}`}
                  subtitle={`${item.quotaCount} cotas • ${item.status}`}
                  right={formatMoneyBR(item.totalDistributionCents ?? 0)}
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resultado por região" />

            {myDailyRegions.length === 0 ? (
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.8,
                  lineHeight: 1.4,
                }}
              >
                Nenhuma região vinculada encontrada.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {myDailyRegions.map((region) => {
                  const mine = region.investors.find(
                    (item) => item.investorId === data.investor.id
                  );

                  return (
                    <div
                      key={region.regionId}
                      style={{
                        border: "1px solid #dbe3ef",
                        borderRadius: 16,
                        padding: 12,
                        minWidth: 0,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 900,
                          marginBottom: 10,
                          lineHeight: 1.2,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {region.regionName}
                      </div>

                      <MobileInfoRow
                        title="Competência"
                        right={formatMonthYear(region.month, region.year)}
                      />

                      <MobileInfoRow
                        title="Minhas cotas"
                        right={String(mine?.quotaCount ?? 0)}
                      />

                      <MobileInfoRow
                        title="Estimado por cota"
                        right={formatMoneyBR(
                          region.estimatedValuePerInvestorQuotaCents ?? 0
                        )}
                      />

                      <MobileInfoRow
                        title="Minha projeção"
                        right={formatMoneyBR(
                          mine?.estimatedDistributionCents ?? 0
                        )}
                      />

                      <MobileInfoRow
                        title="Pool investidores"
                        right={formatMoneyBR(
                          region.estimatedInvestorPoolCents ?? 0
                        )}
                      />

                      <MobileInfoRow
                        title="Lucro operacional"
                        right={formatMoneyBR(region.operatingProfitCents ?? 0)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </MobileCard>
        </>
      ) : null}
    </MobileInvestorPageFrame>
  );
}