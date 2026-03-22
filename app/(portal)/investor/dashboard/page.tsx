"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
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

function PageButton({
  label,
  icon,
  theme,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: hover ? "#2563eb" : theme.isDark ? "#0f172a" : "#ffffff",
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryCard({
  title,
  value,
  helper,
  theme,
  accent,
}: {
  title: string;
  value: string;
  helper?: string;
  theme: ThemeShape;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 18,
        minHeight: 118,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: accent || theme.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {helper ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: theme.isDark ? "#94a3b8" : "#64748b",
          }}
        >
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  theme,
  last = false,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: last ? "none" : `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          color: theme.text,
          fontWeight: 800,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function InvestorDashboardPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : "#f3f6fb";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

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
        fetch("/api/investor-auth/me", { cache: "no-store" }),
        fetch("/api/regions/daily-result", { cache: "no-store" }),
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

      setData(meJson as InvestorPortalResponse);

      const dailyData = dailyJson as DailyRegionsResponse;
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
        err instanceof Error ? err.message : "Erro ao carregar portal do investidor."
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
        });
      } else {
        existing.quotaCount += 1;
        existing.quotaNumbers.push(share.quotaNumber);
        existing.investedCents += shareAmount;
      }
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
      .slice(0, 6);
  }, [data]);

  const latestDistributions = useMemo(() => {
    return [...(data?.distributions ?? [])]
      .sort((a, b) => {
        if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
        return (b.month ?? 0) - (a.month ?? 0);
      })
      .slice(0, 6);
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 74px)",
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
          minHeight: "calc(100vh - 74px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          color: theme.text,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 640,
            background: theme.isDark ? "#0f172a" : "#ffffff",
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: 24,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 12 }}>
            Painel do investidor
          </div>
          <div style={{ color: "#ef4444", marginBottom: 16 }}>
            {error || "Não foi possível carregar os dados do investidor."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 74px)",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
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
                marginBottom: 8,
              }}
            >
              Portal do investidor
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              Dashboard do Investidor
            </h1>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Acompanhe seu patrimônio, suas cotas e suas distribuições.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PageButton
              label={refreshing ? "Atualizando..." : "Atualizar"}
              icon={<RefreshCw size={16} />}
              theme={theme}
              onClick={() => loadData(true)}
              disabled={refreshing}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 18,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ef4444",
              color: "#ef4444",
              background: theme.isDark ? "#0f172a" : "#ffffff",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Section title="Investidor" theme={theme}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                marginBottom: 14,
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
              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 14,
                  background: theme.isDark ? "#111827" : "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>E-mail</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{data.investor.email || "-"}</div>
              </div>

              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 14,
                  background: theme.isDark ? "#111827" : "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Telefone</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{data.investor.phone || "-"}</div>
              </div>

              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 14,
                  background: theme.isDark ? "#111827" : "#f8fafc",
                }}
              >
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>Documento</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{data.investor.document || "-"}</div>
              </div>
            </div>
          </Section>

          <Section title="Progresso do investimento" theme={theme}>
            <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
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

            <InfoRow
              label="Investido"
              value={money(totalCurrentQuotaValueCents)}
              theme={theme}
            />
            <InfoRow
              label="Já recebido"
              value={money(totalRecoveredCents)}
              theme={theme}
            />
            <InfoRow
              label="Pendente"
              value={money(data.summary.pendingDistributionCents)}
              theme={theme}
              last
            />
          </Section>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
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
            accent="#22c55e"
          />
          <SummaryCard
            title="Recebido"
            value={money(data.summary.totalDistributedCents)}
            theme={theme}
            accent="#2563eb"
          />
          <SummaryCard
            title="Pendente"
            value={money(data.summary.pendingDistributionCents)}
            theme={theme}
            accent="#f59e0b"
          />
          <SummaryCard
            title="Projeção do mês"
            value={money(projectedInvestorTotalCents)}
            theme={theme}
            accent="#8b5cf6"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Section title="Regiões investidas" theme={theme}>
            {regions.length === 0 ? (
              <div style={{ color: muted, fontWeight: 700 }}>
                Nenhuma participação encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {regions.map((region) => (
                  <div
                    key={region.regionId}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      padding: 14,
                      background: theme.isDark ? "#111827" : "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900 }}>{region.regionName}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: muted }}>
                          {region.quotaCount} cota(s) • #{region.quotaNumbers.join(", #")}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 900 }}>
                          {money(region.investedCents)}
                        </div>
                        <div style={{ fontSize: 12, color: muted }}>Investido</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Projeção diária por região" theme={theme}>
            {myDailyRegions.length === 0 ? (
              <div style={{ color: muted, fontWeight: 700 }}>
                Nenhuma região com projeção encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {myDailyRegions.map((region) => {
                  const mine = region.investors.find(
                    (item) => item.investorId === data.investor.id
                  );

                  return (
                    <div
                      key={region.regionId}
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: 14,
                        padding: 14,
                        background: theme.isDark ? "#111827" : "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 900 }}>{region.regionName}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: muted }}>
                            {formatMonthYear(region.month, region.year)}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: "#8b5cf6" }}>
                            {money(mine?.estimatedDistributionCents ?? 0)}
                          </div>
                          <div style={{ fontSize: 12, color: muted }}>Sua projeção</div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            border: `1px solid ${theme.border}`,
                            borderRadius: 12,
                            padding: 12,
                            background: theme.isDark ? "#0f172a" : "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                            Faturamento
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>
                            {money(region.grossRevenueCents)}
                          </div>
                        </div>

                        <div
                          style={{
                            border: `1px solid ${theme.border}`,
                            borderRadius: 12,
                            padding: 12,
                            background: theme.isDark ? "#0f172a" : "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                            EBITDA
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>
                            {money(region.ebitdaEstimatedCents)}
                          </div>
                        </div>

                        <div
                          style={{
                            border: `1px solid ${theme.border}`,
                            borderRadius: 12,
                            padding: 12,
                            background: theme.isDark ? "#0f172a" : "#ffffff",
                          }}
                        >
                          <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                            Fundo trimestral
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 900 }}>
                            {money(region.reserveEstimatedCents)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <Section title="Últimos investimentos" theme={theme}>
            {recentInvestments.length === 0 ? (
              <div style={{ color: muted, fontWeight: 700 }}>
                Nenhum investimento encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentInvestments.map((share, index) => (
                  <InfoRow
                    key={share.id}
                    label={`${share.region?.name || "Região"} • Cota #${share.quotaNumber}`}
                    value={`${money(share.amountCents)} • ${formatDate(share.investedAt)}`}
                    theme={theme}
                    last={index === recentInvestments.length - 1}
                  />
                ))}
              </div>
            )}
          </Section>

          <Section title="Histórico de distribuições" theme={theme}>
            {latestDistributions.length === 0 ? (
              <div style={{ color: muted, fontWeight: 700 }}>
                Nenhuma distribuição encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {latestDistributions.map((item, index) => (
                  <InfoRow
                    key={item.id}
                    label={`${formatMonthYear(item.month, item.year)} • ${
                      item.region?.name || "Região"
                    }`}
                    value={money(item.totalDistributionCents)}
                    theme={theme}
                    last={index === latestDistributions.length - 1}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}