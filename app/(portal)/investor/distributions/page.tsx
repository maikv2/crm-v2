"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

type InvestorMeResponse = {
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
  distributions: DistributionItem[];
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

export default function InvestorDistributionsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : "#f3f6fb";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<InvestorMeResponse | null>(null);
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

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;

      if (!res.ok) {
        throw new Error((json as any)?.error || "Erro ao carregar distribuições.");
      }

      setData(json);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Erro ao carregar distribuições."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const distributions = useMemo(() => data?.distributions || [], [data]);

  const paid = useMemo(() => {
    return distributions.filter((item) => item.status === "PAID");
  }, [distributions]);

  const pending = useMemo(() => {
    return distributions.filter((item) => item.status !== "PAID");
  }, [distributions]);

  const totalPaid = useMemo(() => {
    return paid.reduce((sum, item) => sum + (item.totalDistributionCents ?? 0), 0);
  }, [paid]);

  const totalPending = useMemo(() => {
    return pending.reduce((sum, item) => sum + (item.totalDistributionCents ?? 0), 0);
  }, [pending]);

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
        Carregando distribuições...
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
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
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
              Distribuições
            </h1>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Acompanhe o histórico de repasses, valores e status dos pagamentos.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PageButton
              label={refreshing ? "Atualizando..." : "Atualizar"}
              icon={<RefreshCw size={16} />}
              theme={theme}
              onClick={() => load(true)}
              disabled={refreshing}
            />
            <PageButton
              label="Voltar ao painel"
              icon={<ArrowLeft size={16} />}
              theme={theme}
              onClick={() => router.push("/investor")}
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
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            title="Total de lançamentos"
            value={String(distributions.length)}
            helper="Histórico completo"
            theme={theme}
          />
          <SummaryCard
            title="Total pago"
            value={money(totalPaid)}
            helper="Distribuições pagas"
            theme={theme}
            accent="#22c55e"
          />
          <SummaryCard
            title="Total pendente"
            value={money(totalPending)}
            helper="Aguardando pagamento"
            theme={theme}
            accent="#f59e0b"
          />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {distributions.length === 0 ? (
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 18,
                background: theme.isDark ? "#0f172a" : "#ffffff",
                color: muted,
                fontWeight: 700,
              }}
            >
              Nenhuma distribuição encontrada.
            </div>
          ) : (
            distributions.map((dist) => (
              <div
                key={dist.id}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 18,
                  background: theme.isDark ? "#0f172a" : "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 16,
                        marginBottom: 6,
                      }}
                    >
                      {dist.region?.name || "Região"}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: muted,
                      }}
                    >
                      {formatMonthYear(dist.month, dist.year)}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: dist.status === "PAID" ? "#16a34a" : "#f59e0b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dist.status === "PAID" ? "Pago" : "Pendente"}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Cotas
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {dist.quotaCount}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Valor por cota
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {money(dist.valuePerQuotaCents)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Total
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {money(dist.totalDistributionCents)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}