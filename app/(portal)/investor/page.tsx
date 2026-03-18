"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

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

type ThemeShape = ReturnType<typeof getThemeColors>;

export default function InvestorPortalPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#111827" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/investor-auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    } finally {
      router.push("/investor/login");
      router.refresh();
      setLoggingOut(false);
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

      return sum + (region.estimatedValuePerInvestorQuotaCents * mine.quotaCount);
    }, 0);
  }, [data, myDailyRegions]);

  const projectedGrossRevenueCents = useMemo(() => {
    return myDailyRegions.reduce((sum, region) => sum + region.grossRevenueCents, 0);
  }, [myDailyRegions]);

  const projectedEbitdaCents = useMemo(() => {
    return myDailyRegions.reduce((sum, region) => sum + region.ebitdaEstimatedCents, 0);
  }, [myDailyRegions]);

  const projectedReserveCents = useMemo(() => {
    return myDailyRegions.reduce((sum, region) => sum + region.reserveEstimatedCents, 0);
  }, [myDailyRegions]);

  const projectedOperatingProfitCents = useMemo(() => {
    return myDailyRegions.reduce((sum, region) => sum + region.operatingProfitCents, 0);
  }, [myDailyRegions]);

  const totalCurrentQuotaValueCents = useMemo(() => {
    return (data?.shares ?? []).reduce((sum, share) => {
      return sum + (share.amountCents || share.region?.quotaValueCents || 0);
    }, 0);
  }, [data]);

  const totalRecoveredCents = useMemo(() => {
    if (!data) return 0;
    return data.distributions
      .filter((item) => item.status === "PAID")
      .reduce((sum, item) => sum + (item.totalDistributionCents ?? 0), 0);
  }, [data]);

  const paybackProgressPercent = useMemo(() => {
    if (!totalCurrentQuotaValueCents) return 0;
    return Math.min(
      100,
      Math.round((totalRecoveredCents / totalCurrentQuotaValueCents) * 100)
    );
  }, [totalCurrentQuotaValueCents, totalRecoveredCents]);

  const regions = useMemo(() => {
    const map = new Map<
      string,
      {
        regionId: string;
        regionName: string;
        quotaCount: number;
        quotaNumbers: number[];
        investedCents: number;
        quotaValueCents: number;
        maxQuotaCount: number;
      }
    >();

    for (const share of data?.shares ?? []) {
      const regionId = share.regionId;
      const regionName = share.region?.name || "Região";
      const shareAmount = share.amountCents || share.region?.quotaValueCents || 0;

      const existing = map.get(regionId);

      if (!existing) {
        map.set(regionId, {
          regionId,
          regionName,
          quotaCount: 1,
          quotaNumbers: [share.quotaNumber],
          investedCents: shareAmount,
          quotaValueCents: share.region?.quotaValueCents || 0,
          maxQuotaCount: share.region?.maxQuotaCount || 0,
        });
        continue;
      }

      existing.quotaCount += 1;
      existing.quotaNumbers.push(share.quotaNumber);
      existing.investedCents += shareAmount;
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        quotaNumbers: [...item.quotaNumbers].sort((a, b) => a - b),
      }))
      .sort((a, b) => a.regionName.localeCompare(b.regionName, "pt-BR"));
  }, [data]);

  const recentInvestments = useMemo(() => {
    return [...(data?.shares ?? [])]
      .sort(
        (a, b) =>
          new Date(b.investedAt).getTime() - new Date(a.investedAt).getTime()
      )
      .slice(0, 8);
  }, [data]);

  const paidDistributions = useMemo(() => {
    return [...(data?.distributions ?? [])]
      .filter((item) => item.status === "PAID")
      .sort((a, b) => {
        if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
        return (b.month ?? 0) - (a.month ?? 0);
      });
  }, [data]);

  const pendingDistributions = useMemo(() => {
    return [...(data?.distributions ?? [])]
      .filter((item) => item.status === "PENDING")
      .sort((a, b) => {
        if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
        return (b.month ?? 0) - (a.month ?? 0);
      });
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
        }}
      >
        Carregando portal do investidor...
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "60px auto 0",
            border: `1px solid ${border}`,
            borderRadius: 18,
            padding: 20,
            background: cardBg,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>
            Portal do Investidor
          </div>

          <div style={{ color: "#ef4444", marginBottom: 14 }}>
            {error || "Não foi possível carregar os dados do investidor."}
          </div>

          <button
            type="button"
            onClick={() => router.push("/investor/login")}
            style={buttonStyle(border, cardBg, theme.text)}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1240 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: muted,
                marginBottom: 10,
              }}
            >
              📈 / Portal do Investidor
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              Dashboard do Investidor
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Acompanhe em tempo real suas cotas, projeções do mês e distribuições.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              style={buttonStyle(border, cardBg, theme.text)}
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/investor/quotas")}
              style={buttonStyle(border, cardBg, theme.text)}
            >
              Minhas Cotas
            </button>

            <button
              type="button"
              onClick={() => router.push("/investor/distributions")}
              style={buttonStyle(border, cardBg, theme.text)}
            >
              Distribuições
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              style={buttonStyle(border, cardBg, theme.text)}
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ef4444",
              color: "#ef4444",
              background: cardBg,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 0.85fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: muted,
                marginBottom: 8,
              }}
            >
              Investidor
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              {data.investor.name}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <InfoMini
                label="E-mail"
                value={data.investor.email || "-"}
                theme={theme}
              />
              <InfoMini
                label="Telefone"
                value={data.investor.phone || "-"}
                theme={theme}
              />
              <InfoMini
                label="Documento"
                value={data.investor.document || "-"}
                theme={theme}
              />
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: muted,
                marginBottom: 8,
              }}
            >
              Progresso do investimento
            </div>

            <div style={{ marginBottom: 8, fontSize: 24, fontWeight: 900 }}>
              {paybackProgressPercent}%
            </div>

            <div
              style={{
                width: "100%",
                height: 12,
                borderRadius: 999,
                background: theme.isDark ? "#1f2937" : "#e5e7eb",
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: `${paybackProgressPercent}%`,
                  height: "100%",
                  background: "#2563eb",
                }}
              />
            </div>

            <QuickRow
              label="Investido"
              value={money(totalCurrentQuotaValueCents)}
              muted={muted}
              text={theme.text}
            />
            <QuickRow
              label="Já recebido"
              value={money(totalRecoveredCents)}
              muted={muted}
              text={theme.text}
            />
            <QuickRow
              label="Pendente"
              value={money(data.summary.pendingDistributionCents)}
              muted={muted}
              text={theme.text}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "0.7fr 0.7fr 1.3fr 1fr 1fr 1fr",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            title="Cotas ativas"
            value={String(data.summary.activeQuotaCount)}
            theme={theme}
          />
          <SummaryCard
            title="Regiões"
            value={String(data.summary.totalRegions)}
            theme={theme}
          />
          <SummaryCard
            title="Investido"
            value={money(data.summary.totalInvestedCents)}
            theme={theme}
            color="#22c55e"
          />
          <SummaryCard
            title="Recebido"
            value={money(data.summary.totalDistributedCents)}
            theme={theme}
            color="#2563eb"
          />
          <SummaryCard
            title="Pendente"
            value={money(data.summary.pendingDistributionCents)}
            theme={theme}
            color="#f59e0b"
          />
          <SummaryCard
            title="Projeção do mês"
            value={money(projectedInvestorTotalCents)}
            theme={theme}
            color="#8b5cf6"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            title="Faturamento do mês"
            value={money(projectedGrossRevenueCents)}
            theme={theme}
          />
          <SummaryCard
            title="EBITDA estimado"
            value={money(projectedEbitdaCents)}
            theme={theme}
          />
          <SummaryCard
            title="Lucro operacional"
            value={money(projectedOperatingProfitCents)}
            theme={theme}
          />
          <SummaryCard
            title="Fundo trimestral"
            value={money(projectedReserveCents)}
            theme={theme}
          />
          <SummaryCard
            title="Projeção por cota"
            value={money(projectedQuotaTotalCents)}
            theme={theme}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Regiões investidas
            </div>

            {regions.length === 0 ? (
              <EmptyState text="Nenhuma região vinculada." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {regions.map((region) => (
                  <div
                    key={region.regionId}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: subtleCard,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{region.regionName}</div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        {region.quotaCount} cota(s) • #
                        {region.quotaNumbers.join(", #")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>
                        {money(region.investedCents)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        Investido
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Projeção diária por região
            </div>

            {myDailyRegions.length === 0 ? (
              <EmptyState text="Sem projeção diária disponível." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {myDailyRegions.map((region) => {
                  const mine = region.investors.find(
                    (item) => item.investorId === data.investor.id
                  );

                  return (
                    <div
                      key={region.regionId}
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: 14,
                        padding: 14,
                        background: subtleCard,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800 }}>{region.regionName}</div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: muted,
                            }}
                          >
                            {formatMonthYear(region.month, region.year)}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, color: "#8b5cf6" }}>
                            {money(mine?.estimatedDistributionCents ?? 0)}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: muted,
                            }}
                          >
                            Sua projeção
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <InfoMini
                          label="Faturamento"
                          value={money(region.grossRevenueCents)}
                          theme={theme}
                        />
                        <InfoMini
                          label="EBITDA"
                          value={money(region.ebitdaEstimatedCents)}
                          theme={theme}
                        />
                        <InfoMini
                          label="Fundo trimestral"
                          value={money(region.reserveEstimatedCents)}
                          theme={theme}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Últimos investimentos
            </div>

            {recentInvestments.length === 0 ? (
              <EmptyState text="Nenhum investimento encontrado." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {recentInvestments.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: subtleCard,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {share.region?.name || "Região"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        Cota #{share.quotaNumber}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>
                        {money(
                          share.amountCents || share.region?.quotaValueCents || 0
                        )}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        {formatDate(share.investedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 18,
              padding: 20,
              background: cardBg,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
              }}
            >
              Histórico de distribuições
            </div>

            {paidDistributions.length === 0 && pendingDistributions.length === 0 ? (
              <EmptyState text="Nenhuma distribuição encontrada." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {[...pendingDistributions, ...paidDistributions].slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: subtleCard,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {item.region?.name || "Região"}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: muted,
                          }}
                        >
                          {formatMonthYear(item.month, item.year)} •{" "}
                          {item.quotaCount} cota(s)
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: 900,
                            color: item.status === "PENDING" ? "#f59e0b" : theme.text,
                          }}
                        >
                          {money(item.totalDistributionCents)}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: muted,
                          }}
                        >
                          {item.status === "PENDING"
                            ? "Pendente"
                            : `Pago em ${formatDate(item.paidAt)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  theme,
  color,
}: {
  title: string;
  value: string;
  theme: ThemeShape;
  color?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 16,
        padding: 18,
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          lineHeight: 1.15,
          fontWeight: 900,
          color: color || theme.text,
          whiteSpace: "normal",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoMini({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 12,
        padding: 12,
        background: theme.isDark ? "#111827" : "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: theme.text,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickRow({
  label,
  value,
  muted,
  text,
}: {
  label: string;
  value: string;
  muted: string;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: muted,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: text,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState({
  text,
  muted,
}: {
  text: string;
  muted: string;
}) {
  return (
    <div
      style={{
        minHeight: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: muted,
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function buttonStyle(
  border: string,
  bg: string,
  color: string
): React.CSSProperties {
  return {
    height: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontWeight: 800,
    cursor: "pointer",
  };
}