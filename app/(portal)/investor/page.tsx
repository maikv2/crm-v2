"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  LayoutDashboard,
  Layers3,
  LogOut,
  RefreshCw,
  Smartphone,
  TrendingUp,
} from "lucide-react";
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

function ActionButton({
  label,
  icon,
  theme,
  onClick,
  primary,
  danger,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = danger
    ? hover
      ? "#dc2626"
      : "#ef4444"
    : primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
    ? "#2563eb"
    : theme.isDark
    ? "#0f172a"
    : theme.cardBg;

  const color = danger || primary ? "#ffffff" : hover ? "#ffffff" : theme.text;

  const border = danger || primary ? "none" : `1px solid ${theme.border}`;

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
        border,
        background,
        color,
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
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 18,
        minHeight: 126,
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
          fontSize: 28,
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

function ShortcutCard({
  title,
  subtitle,
  onClick,
  icon,
  theme,
}: {
  title: string;
  subtitle: string;
  onClick?: () => void;
  icon: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 18,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: theme.isDark ? "#111827" : "#e8f0ff",
            color: theme.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: theme.text,
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: theme.isDark ? "#94a3b8" : "#64748b",
              lineHeight: 1.45,
            }}
          >
            {subtitle}
          </div>
        </div>

        <ArrowRight size={16} color={theme.isDark ? "#94a3b8" : "#64748b"} />
      </div>
    </button>
  );
}

function Section({
  title,
  right,
  children,
  theme,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#0f172a" : theme.cardBg,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
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

export default function InvestorPortalPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
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
        err instanceof Error ? err.message : "Erro ao carregar portal do investidor."
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
            background: theme.isDark ? "#0f172a" : theme.cardBg,
            border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
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
          <ActionButton
            label="Voltar para o login"
            theme={theme}
            onClick={() => router.push("/investor/login")}
            primary
          />
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
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: theme.isDark ? "#0f172a" : theme.cardBg,
              border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
              borderRadius: 22,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: muted,
                marginBottom: 10,
              }}
            >
              Painel do investidor
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1.1,
                marginBottom: 10,
              }}
            >
              Bem-vindo, {data.investor.name}
            </div>

            <div
              style={{
                fontSize: 14,
                color: muted,
                lineHeight: 1.5,
                marginBottom: 18,
                maxWidth: 760,
              }}
            >
              Acompanhe seu patrimônio, cotas ativas, distribuições recebidas e
              projeções das regiões vinculadas em um único painel.
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <ActionButton
                label={refreshing ? "Atualizando..." : "Atualizar"}
                icon={<RefreshCw size={16} />}
                theme={theme}
                onClick={() => loadData(true)}
                disabled={refreshing}
              />
              <ActionButton
                label="Minhas cotas"
                icon={<Layers3 size={16} />}
                theme={theme}
                onClick={() => router.push("/investor/quotas")}
              />
              <ActionButton
                label="Distribuições"
                icon={<BadgeDollarSign size={16} />}
                theme={theme}
                onClick={() => router.push("/investor/distributions")}
              />
              <ActionButton
                label="Versão mobile"
                icon={<Smartphone size={16} />}
                theme={theme}
                primary
                onClick={() => router.push("/m/investor")}
              />
              <ActionButton
                label={loggingOut ? "Saindo..." : "Sair"}
                icon={<LogOut size={16} />}
                theme={theme}
                danger
                onClick={handleLogout}
                disabled={loggingOut}
              />
            </div>
          </div>

          <div
            style={{
              background: theme.isDark ? "#0f172a" : theme.cardBg,
              border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
              borderRadius: 22,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: muted,
                marginBottom: 8,
              }}
            >
              Progresso do investimento
            </div>

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
              label="Total investido"
              value={money(totalCurrentQuotaValueCents)}
              theme={theme}
            />
            <InfoRow
              label="Total recebido"
              value={money(totalRecoveredCents)}
              theme={theme}
            />
            <InfoRow
              label="Pendente"
              value={money(data.summary.pendingDistributionCents)}
              theme={theme}
              last
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
              background: theme.isDark ? "#0f172a" : theme.cardBg,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            title="Cotas ativas"
            value={String(data.summary.activeQuotaCount)}
            helper="Participações em carteira"
            theme={theme}
          />
          <SummaryCard
            title="Regiões"
            value={String(data.summary.totalRegions)}
            helper="Regiões vinculadas"
            theme={theme}
          />
          <SummaryCard
            title="Investido"
            value={money(data.summary.totalInvestedCents)}
            helper="Valor total aplicado"
            theme={theme}
            accent="#22c55e"
          />
          <SummaryCard
            title="Distribuído"
            value={money(data.summary.totalDistributedCents)}
            helper="Total já recebido"
            theme={theme}
            accent="#2563eb"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <ShortcutCard
            title="Minhas cotas"
            subtitle="Consulte as cotas vinculadas, regiões e valores investidos."
            onClick={() => router.push("/investor/quotas")}
            icon={<Layers3 size={20} />}
            theme={theme}
          />
          <ShortcutCard
            title="Distribuições"
            subtitle="Acompanhe o histórico de repasses, status e totais recebidos."
            onClick={() => router.push("/investor/distributions")}
            icon={<BadgeDollarSign size={20} />}
            theme={theme}
          />
          <ShortcutCard
            title="Abrir versão mobile"
            subtitle="Troque para a visão mobile do investidor com o mesmo conteúdo."
            onClick={() => router.push("/m/investor")}
            icon={<Smartphone size={20} />}
            theme={theme}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Section title="Resumo do investidor" theme={theme}>
            <InfoRow label="Nome" value={data.investor.name || "-"} theme={theme} />
            <InfoRow label="E-mail" value={data.investor.email || "-"} theme={theme} />
            <InfoRow label="Telefone" value={data.investor.phone || "-"} theme={theme} />
            <InfoRow
              label="Documento"
              value={data.investor.document || "-"}
              theme={theme}
              last
            />
          </Section>

          <Section title="Visão do mês" theme={theme}>
            <InfoRow
              label="Projeção do mês"
              value={money(projectedInvestorTotalCents)}
              theme={theme}
            />
            <InfoRow
              label="Regiões com participação"
              value={String(myDailyRegions.length)}
              theme={theme}
            />
            <InfoRow
              label="Última atualização"
              value={
                myDailyRegions[0]
                  ? formatMonthYear(myDailyRegions[0].month, myDailyRegions[0].year)
                  : "-"
              }
              theme={theme}
              last
            />
          </Section>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <Section title="Participações por região" theme={theme}>
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
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 900,
                            color: theme.text,
                          }}
                        >
                          {region.regionName}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: muted,
                          }}
                        >
                          Cotas #{region.quotaNumbers.join(", #")}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: theme.primary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {region.quotaCount} cota(s)
                      </div>
                    </div>

                    <InfoRow
                      label="Valor investido"
                      value={money(region.investedCents)}
                      theme={theme}
                      last
                    />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Últimos investimentos" theme={theme}>
            {recentInvestments.length === 0 ? (
              <div style={{ color: muted, fontWeight: 700 }}>
                Nenhum investimento encontrado.
              </div>
            ) : (
              recentInvestments.map((share, index) => (
                <InfoRow
                  key={share.id}
                  label={`Cota #${share.quotaNumber} • ${share.region?.name || "Região"}`}
                  value={`${money(share.amountCents)} • ${formatDate(share.investedAt)}`}
                  theme={theme}
                  last={index === recentInvestments.length - 1}
                />
              ))
            )}
          </Section>
        </div>

        <Section
          title="Últimas distribuições"
          right={
            <button
              type="button"
              onClick={() => router.push("/investor/distributions")}
              style={{
                border: "none",
                background: "transparent",
                color: theme.primary,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Ver todas
            </button>
          }
          theme={theme}
        >
          {latestDistributions.length === 0 ? (
            <div style={{ color: muted, fontWeight: 700 }}>
              Nenhuma distribuição encontrada.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {latestDistributions.map((item) => (
                <div
                  key={item.id}
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
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 900,
                          color: theme.text,
                        }}
                      >
                        {formatMonthYear(item.month, item.year)}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: muted,
                        }}
                      >
                        {item.region?.name || "Região"} • {item.quotaCount} cota(s)
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: item.status === "PAID" ? "#16a34a" : "#f59e0b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.status === "PAID" ? "Pago" : "Pendente"}
                    </div>
                  </div>

                  <InfoRow
                    label="Valor por cota"
                    value={money(item.valuePerQuotaCents)}
                    theme={theme}
                  />
                  <InfoRow
                    label="Total"
                    value={money(item.totalDistributionCents)}
                    theme={theme}
                    last
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}