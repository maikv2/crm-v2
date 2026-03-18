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
  }[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/investors/dashboard", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Erro ao carregar dashboard");
        }

        const json: InvestorDashboardResponse = await res.json();

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError("Não foi possível carregar o dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
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
            Acompanhe captação, cotas, distribuição e evolução dos investimentos por região.
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
          title="Valor captado"
          value={moneyFromCents(summary?.totalInvestedCents ?? 0)}
          theme={theme}
          color="#22c55e"
        />

        <StatCard
          title="Total de investidores"
          value={String(summary?.totalInvestors ?? 0)}
          theme={theme}
          color="#2563eb"
        />

        <StatCard
          title="Cotas ativas"
          value={String(summary?.totalActiveQuotaCount ?? 0)}
          theme={theme}
        />

        <StatCard
          title="Valor médio por cota"
          value={moneyFromCents(summary?.averageQuotaValueCents ?? 0)}
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
        <MiniInfoCard
          title="Cotas de investidores"
          value={String(summary?.investorQuotaCount ?? 0)}
          theme={theme}
        />
        <MiniInfoCard
          title="Cotas da empresa"
          value={String(summary?.companyQuotaCount ?? 0)}
          theme={theme}
        />
        <MiniInfoCard
          title="Cotas disponíveis"
          value={String(summary?.availableQuotaCount ?? 0)}
          theme={theme}
        />
        <MiniInfoCard
          title="Regiões ativas"
          value={String(summary?.totalRegions ?? 0)}
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <MiniInfoCard
          title="Capacidade total de cotas"
          value={String(summary?.totalQuotaCapacity ?? 0)}
          theme={theme}
        />
        <MiniInfoCard
          title="Total distribuído"
          value={moneyFromCents(summary?.totalDistributedCents ?? 0)}
          theme={theme}
        />
        <MiniInfoCard
          title="Distribuições pendentes"
          value={moneyFromCents(summary?.pendingDistributionCents ?? 0)}
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
            Resumo rápido
          </div>

          <QuickRow
            label="Captação total"
            value={moneyFromCents(summary?.totalInvestedCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Cotas ativas"
            value={String(summary?.totalActiveQuotaCount ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Capacidade total"
            value={String(summary?.totalQuotaCapacity ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Ocupação"
            value={`${occupancyPercent.toFixed(0)}%`}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Investidores"
            value={String(summary?.totalInvestors ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Regiões"
            value={String(summary?.totalRegions ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Distribuído"
            value={moneyFromCents(summary?.totalDistributedCents ?? 0)}
            muted={muted}
            text={theme.text}
          />
          <QuickRow
            label="Pendente"
            value={moneyFromCents(summary?.pendingDistributionCents ?? 0)}
            muted={muted}
            text={theme.text}
          />

          <div
            style={{
              marginTop: 8,
              borderTop: `1px solid ${border}`,
              paddingTop: 14,
              fontSize: 12,
              color: muted,
              lineHeight: 1.5,
            }}
          >
            Este painel agora está orientado ao módulo de investidores, com foco em cotas,
            captação, distribuição e ocupação por região.
          </div>
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
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          Últimos investimentos
        </div>

        {recentInvestments.length === 0 ? (
          <EmptyState text="Nenhum investimento recente encontrado." muted={muted} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {recentInvestments.map((investment) => (
              <div
                key={investment.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 1fr 120px 140px",
                  gap: 10,
                  padding: 12,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  background: cardBg,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700 }}>{formatDate(investment.investedAt)}</div>

                <div>{investment.investorName}</div>

                <div style={{ color: muted }}>{investment.regionName}</div>

                <div style={{ fontWeight: 800 }}>#{investment.quotaNumber}</div>

                <div style={{ fontWeight: 800, textAlign: "right" }}>
                  {moneyFromCents(investment.amountCents)}
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
            fontWeight: 800,
            marginBottom: 16,
          }}
        >
          Resumo por região
        </div>

        {regionsSummary.length === 0 ? (
          <EmptyState text="Nenhuma região encontrada." muted={muted} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {regionsSummary.map((region) => (
              <div
                key={region.regionId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr repeat(6, minmax(0, 1fr))",
                  gap: 10,
                  padding: 12,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  background: cardBg,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 800 }}>{region.regionName}</div>

                <InfoPill
                  label="Totais"
                  value={String(region.maxQuotaCount)}
                  theme={theme}
                />
                <InfoPill
                  label="Ativas"
                  value={String(region.activeQuotaCount)}
                  theme={theme}
                />
                <InfoPill
                  label="Invest."
                  value={String(region.investorOwnedCount)}
                  theme={theme}
                />
                <InfoPill
                  label="Empresa"
                  value={String(region.companyOwnedCount)}
                  theme={theme}
                />
                <InfoPill
                  label="Livres"
                  value={String(region.availableCount)}
                  theme={theme}
                />
                <div style={{ textAlign: "right", fontWeight: 800 }}>
                  {moneyFromCents(region.investedCents)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const border = theme.isDark ? "#1e293b" : theme.border;
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
        background: subtleCard,
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: muted,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: color || theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniInfoCard({
  title,
  value,
  theme,
}: {
  title: string;
  value: string;
  theme: ThemeShape;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: 16,
        background: cardBg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: muted,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
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

function InfoPill({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
}) {
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: muted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
        }}
      >
        {value}
      </div>
    </div>
  );
}
