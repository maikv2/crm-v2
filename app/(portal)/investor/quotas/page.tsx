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
  shares: unknown[];
  distributions: DistributionItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

export default function InvestorDistributionsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#111827" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<InvestorPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar distribuições.");
      }

      setData(json as InvestorPortalResponse);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar distribuições."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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

  const totalPaidCents = useMemo(() => {
    return paidDistributions.reduce(
      (sum, item) => sum + (item.totalDistributionCents || 0),
      0
    );
  }, [paidDistributions]);

  const totalPendingCents = useMemo(() => {
    return pendingDistributions.reduce(
      (sum, item) => sum + (item.totalDistributionCents || 0),
      0
    );
  }, [pendingDistributions]);

  const averagePerQuotaCents = useMemo(() => {
    const all = [...paidDistributions, ...pendingDistributions];
    if (!all.length) return 0;

    const total = all.reduce((sum, item) => sum + (item.valuePerQuotaCents || 0), 0);
    return Math.round(total / all.length);
  }, [paidDistributions, pendingDistributions]);

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
        Carregando distribuições...
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
              📈 / Portal do Investidor / Distribuições
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              Distribuições
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Acompanhe valores pagos, pendentes e histórico por região e competência.
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
              onClick={() => load(true)}
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
              onClick={() => router.push("/investor")}
              style={buttonStyle(border, cardBg, theme.text)}
            >
              Voltar ao dashboard
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
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <SummaryCard
            title="Distribuições pagas"
            value={String(paidDistributions.length)}
            theme={theme}
          />
          <SummaryCard
            title="Distribuições pendentes"
            value={String(pendingDistributions.length)}
            theme={theme}
            color="#f59e0b"
          />
          <SummaryCard
            title="Total pago"
            value={money(totalPaidCents)}
            theme={theme}
            color="#22c55e"
          />
          <SummaryCard
            title="Média por cota"
            value={money(averagePerQuotaCents)}
            theme={theme}
            color="#2563eb"
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
              Pendentes
            </div>

            {pendingDistributions.length === 0 ? (
              <EmptyState text="Nenhuma distribuição pendente." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {pendingDistributions.map((item) => (
                  <DistributionCard
                    key={item.id}
                    item={item}
                    border={border}
                    muted={muted}
                    subtleCard={subtleCard}
                    theme={theme}
                  />
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
              Histórico pago
            </div>

            {paidDistributions.length === 0 ? (
              <EmptyState text="Nenhuma distribuição paga." muted={muted} />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {paidDistributions.map((item) => (
                  <DistributionCard
                    key={item.id}
                    item={item}
                    border={border}
                    muted={muted}
                    subtleCard={subtleCard}
                    theme={theme}
                  />
                ))}
              </div>
            )}
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
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Resumo financeiro
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <InfoMini
              label="Total já recebido"
              value={money(totalPaidCents)}
              theme={theme}
            />
            <InfoMini
              label="Total pendente"
              value={money(totalPendingCents)}
              theme={theme}
            />
            <InfoMini
              label="Resumo geral"
              value={money(totalPaidCents + totalPendingCents)}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DistributionCard({
  item,
  border,
  muted,
  subtleCard,
  theme,
}: {
  item: DistributionItem;
  border: string;
  muted: string;
  subtleCard: string;
  theme: ThemeShape;
}) {
  return (
    <div
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
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 800 }}>{item.region?.name || "Região"}</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: muted,
            }}
          >
            {formatMonthYear(item.month, item.year)} • {item.quotaCount} cota(s)
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <InfoMini
          label="Valor por cota"
          value={money(item.valuePerQuotaCents || 0)}
          theme={theme}
        />
        <InfoMini
          label="Total da distribuição"
          value={money(item.totalDistributionCents || 0)}
          theme={theme}
        />
        <InfoMini
          label="Status"
          value={item.status === "PENDING" ? "Pendente" : "Pago"}
          theme={theme}
        />
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
  const isLongValue = value.length > 11;

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
          fontSize: isLongValue ? 18 : 24,
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