"use client";

import { useEffect, useState } from "react";
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

type RegionQuotaItem = {
  regionId: string;
  regionName: string;
  quotaCount: number;
  regionTotalQuotaCount: number;
  investedCents: number;
  quotaNumbers: number[];
};

type InvestorMeResponse = {
  investor: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    document: string | null;
  };
  quotas: {
    totalInvestedCents: number;
    totalQuotaCount: number;
    regions: RegionQuotaItem[];
  };
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

export default function InvestorQuotasPage() {
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
        throw new Error((json as { error?: string } | null)?.error || "Erro ao carregar cotas.");
      }

      setData(json);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Erro ao carregar cotas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regions = data?.quotas.regions ?? [];

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
        Carregando cotas...
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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
              Minhas cotas
            </h1>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Quanto você investiu e o que isso representa em cada região.
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
              label="Voltar ao resumo"
              icon={<ArrowLeft size={16} />}
              theme={theme}
              onClick={() => router.push("/investor/dashboard")}
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
            title="Total investido"
            value={money(data?.quotas.totalInvestedCents ?? 0)}
            theme={theme}
            accent="#22c55e"
          />
          <SummaryCard
            title="Cotas em carteira"
            value={String(data?.quotas.totalQuotaCount ?? 0)}
            theme={theme}
          />
          <SummaryCard
            title="Regiões"
            value={String(regions.length)}
            helper="Com participação"
            theme={theme}
          />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {regions.length === 0 ? (
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
              Nenhuma cota encontrada.
            </div>
          ) : (
            regions.map((region) => {
              const percent =
                region.regionTotalQuotaCount > 0
                  ? Math.round((region.quotaCount / region.regionTotalQuotaCount) * 100)
                  : 0;

              return (
                <div
                  key={region.regionId}
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
                      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>
                        {region.regionName}
                      </div>
                      <div style={{ fontSize: 13, color: muted }}>
                        Cotas #{region.quotaNumbers.join(", #")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: theme.primary }}>
                        {money(region.investedCents)}
                      </div>
                      <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                        investido nesta região
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: theme.isDark ? "#111827" : "#f8fafc",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        color: muted,
                      }}
                    >
                      <span>
                        {region.quotaCount} de {region.regionTotalQuotaCount || "?"} cotas da região
                      </span>
                      <span style={{ color: theme.text, fontWeight: 900 }}>{percent}%</span>
                    </div>

                    <div
                      style={{
                        width: "100%",
                        height: 10,
                        borderRadius: 999,
                        background: theme.isDark ? "#1f2937" : "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, percent)}%`,
                          height: "100%",
                          background: theme.primary,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
