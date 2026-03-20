"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function moneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

type InvestorDashboardResponse = {
  summary: {
    totalInvestors: number;
    totalRegions: number;
    totalQuotaCapacity: number;
    totalActiveQuotaCount: number;
    investorQuotaCount: number;
    companyQuotaCount: number;
    availableQuotaCount: number;
    totalInvestedCents: number;
    averageQuotaValueCents: number;
    totalDistributedCents: number;
    pendingDistributionCents: number;
    currentMonth: number;
    currentYear: number;
    currentGrossRevenueCents: number;
    currentOperatingProfitCents: number;
    currentEbitdaCents: number;
    currentReserveCents: number;
    currentInvestorPoolCents: number;
    currentCompanyPoolCents: number;
    currentInvestorCount: number;
    currentAverageValuePerQuotaCents: number;
  };
  monthly: {
    month: string;
    quotaCount: number;
    investedCents: number;
  }[];
  recentInvestments: {
    id: string;
    investedAt: string;
    quotaNumber: number;
    amountCents: number;
    investorName: string;
    regionName: string;
  }[];
  regionsSummary: {
    regionId: string;
    regionName: string;
    maxQuotaCount: number;
    quotaValueCents: number;
    activeQuotaCount: number;
    investorOwnedCount: number;
    companyOwnedCount: number;
    availableCount: number;
    investedCents: number;
    currentGrossRevenueCents: number;
    currentOperatingProfitCents: number;
    currentEbitdaCents: number;
    currentReserveCents: number;
    currentInvestorPoolCents: number;
    currentCompanyPoolCents: number;
    currentValuePerQuotaCents: number;
  }[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function HeaderButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: hover ? "#2563eb" : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function StatCard({
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
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 16,
        padding: 20,
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
          fontSize: 24,
          fontWeight: 900,
          color: color || theme.text,
          lineHeight: 1.15,
          whiteSpace: "normal",
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
      }}
    >
      <div style={{ fontSize: 13, color: muted }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{value}</div>
    </div>
  );
}

function EmptyState({ text, muted }: { text: string; muted: string }) {
  return (
    <div
      style={{
        padding: "24px 0",
        textAlign: "center",
        color: muted,
        fontSize: 14,
      }}
    >
      {text}
    </div>
  );
}

export default function InvestorDashboardPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<InvestorDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const res = await fetch("/api/investors/dashboard", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Erro ao carregar dashboard");
      }

      const json: InvestorDashboardResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar o dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const monthly = useMemo(() => data?.monthly ?? [], [data]);
  const months = monthly.map((m) => m.month);
  const values = monthly.map((m) => m.investedCents);
  const maxValue = Math.max(...values, 1);

  const summary = data?.summary;
  const regionsSummary = data?.regionsSummary ?? [];
  const recentInvestments = data?.recentInvestments ?? [];

  const occupancyPercent = useMemo(() => {
    if (!summary?.totalQuotaCapacity) return 0;
    return (summary.totalActiveQuotaCount / summary.totalQuotaCapacity) * 100;
  }, [summary]);

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
        Carregando dashboard do investidor...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontWeight: 700,
          padding: 24,
          textAlign: "center",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        background: pageBg,
        minHeight: "100vh",
        padding: 24,
        color: theme.text,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              color: muted,
              marginBottom: 8,
              fontWeight: 700,
            }}
          >
            📈 / Investidores / Dashboard
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
            }}
          >
            Dashboard de Investidores
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            EBITDA atual, fundo trimestral, empresa, investidores e valor atual por cota.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <HeaderButton
            label={refreshing ? "Atualizando..." : "Atualizar"}
            theme={theme}
            onClick={() => loadDashboard(true)}
          />
          <HeaderButton
            label="Investidores"
            theme={theme}
            onClick={() => router.push("/investors")}
          />
          <HeaderButton
            label="Vincular Cotas"
            theme={theme}
            onClick={() => router.push("/investors/assign-quota")}
          />
          <HeaderButton
            label="Gestão de Cotas"
            theme={theme}
            onClick={() => router.push("/investors/quotas")}
          />
          <HeaderButton
            label="Distribuições"
            theme={theme}
            onClick={() => router.push("/investors/distributions")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="EBITDA atual"
          value={moneyFromCents(summary?.currentEbitdaCents ?? 0)}
          theme={theme}
          color="#22c55e"
        />
        <StatCard
          title="Fundo trimestral atual"
          value={moneyFromCents(summary?.currentReserveCents ?? 0)}
          theme={theme}
          color="#f59e0b"
        />
        <StatCard
          title="Atual para investidores"
          value={moneyFromCents(summary?.currentInvestorPoolCents ?? 0)}
          theme={theme}
          color="#2563eb"
        />
        <StatCard
          title="Atual para empresa"
          value={moneyFromCents(summary?.currentCompanyPoolCents ?? 0)}
          theme={theme}
          color="#a855f7"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Receita bruta atual"
          value={moneyFromCents(summary?.currentGrossRevenueCents ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Resultado operacional atual"
          value={moneyFromCents(summary?.currentOperatingProfitCents ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Valor atual médio por cota"
          value={moneyFromCents(summary?.currentAverageValuePerQuotaCents ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Investidores com projeção"
          value={String(summary?.currentInvestorCount ?? 0)}
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Valor captado"
          value={moneyFromCents(summary?.totalInvestedCents ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Total de investidores"
          value={String(summary?.totalInvestors ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Cotas ativas"
          value={String(summary?.totalActiveQuotaCount ?? 0)}
          theme={theme}
        />
        <StatCard
          title="Valor médio histórico por cota"
          value={moneyFromCents(summary?.averageQuotaValueCents ?? 0)}
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 0.7fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 20,
            background: subtleCard,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            Evolução da captação
          </div>

          {monthly.length === 0 ? (
            <EmptyState text="Ainda não há dados mensais para exibir." muted={muted} />
          ) : (
            <div
              style={{
                height: 300,
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              {values.map((value, i) => {
                const height = Math.max(8, (value / maxValue) * 250);

                return (
                  <div
                    key={`${months[i]}-${i}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: muted,
                        textAlign: "center",
                      }}
                    >
                      {moneyFromCents(value)}
                    </div>

                    <div
                      style={{
                        width: 28,
                        height,
                        borderRadius: 6,
                        background: "#22c55e",
                      }}
                    />

                    <div
                      style={{
                        fontSize: 12,
                        color: muted,
                        textAlign: "center",
                      }}
                    >
                      {months[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 20,
            background: subtleCard,
            display: "grid",
            gap: 14,
            alignContent: "start",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            Resumo atual
          </div>

          <QuickRow
            label="Receita bruta atual"
            value={moneyFromCents(summary?.currentGrossRevenueCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Resultado operacional"
            value={moneyFromCents(summary?.currentOperatingProfitCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="EBITDA atual"
            value={moneyFromCents(summary?.currentEbitdaCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Fundo trimestral"
            value={moneyFromCents(summary?.currentReserveCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Pool dos investidores"
            value={moneyFromCents(summary?.currentInvestorPoolCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Parcela da empresa"
            value={moneyFromCents(summary?.currentCompanyPoolCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Valor atual médio/cota"
            value={moneyFromCents(summary?.currentAverageValuePerQuotaCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Ocupação"
            value={`${occupancyPercent.toFixed(0)}%`}
            muted={muted}
            text={theme.text}
          />
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 20,
          background: subtleCard,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            marginBottom: 16,
            fontSize: 18,
          }}
        >
          Resultado atual por região
        </div>

        {regionsSummary.length === 0 ? (
          <EmptyState text="Nenhuma região encontrada." muted={muted} />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {regionsSummary.map((region) => (
              <div
                key={region.regionId}
                style={{
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>
                      {region.regionName}
                    </div>
                    <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>
                      {region.investorOwnedCount} cotas de investidores •{" "}
                      {region.companyOwnedCount} da empresa • {region.availableCount} disponíveis
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/investors/quotas`)}
                    style={{
                      height: 38,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: `1px solid ${border}`,
                      background: theme.cardBg,
                      color: theme.text,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Ver quotas
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <StatCard
                    title="EBITDA"
                    value={moneyFromCents(region.currentEbitdaCents)}
                    theme={theme}
                    color="#22c55e"
                  />
                  <StatCard
                    title="Fundo trimestral"
                    value={moneyFromCents(region.currentReserveCents)}
                    theme={theme}
                    color="#f59e0b"
                  />
                  <StatCard
                    title="Investidores"
                    value={moneyFromCents(region.currentInvestorPoolCents)}
                    theme={theme}
                    color="#2563eb"
                  />
                  <StatCard
                    title="Empresa"
                    value={moneyFromCents(region.currentCompanyPoolCents)}
                    theme={theme}
                    color="#a855f7"
                  />
                  <StatCard
                    title="Valor atual por cota"
                    value={moneyFromCents(region.currentValuePerQuotaCents)}
                    theme={theme}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: `1px solid ${border}`,
          borderRadius: 16,
          padding: 20,
          background: subtleCard,
        }}
      >
        <div
          style={{
            fontWeight: 900,
            marginBottom: 16,
            fontSize: 18,
          }}
        >
          Investimentos recentes
        </div>

        {recentInvestments.length === 0 ? (
          <EmptyState text="Nenhum investimento recente encontrado." muted={muted} />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {recentInvestments.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.3fr 1fr 120px 160px",
                  gap: 12,
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: cardBg,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>{item.investorName}</div>
                  <div style={{ color: muted, fontSize: 13 }}>{item.regionName}</div>
                </div>

                <div style={{ color: theme.text, fontWeight: 700 }}>
                  Cota #{item.quotaNumber}
                </div>

                <div style={{ color: muted, fontSize: 13 }}>
                  {formatDate(item.investedAt)}
                </div>

                <div style={{ fontWeight: 900, textAlign: "right" }}>
                  {moneyFromCents(item.amountCents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}