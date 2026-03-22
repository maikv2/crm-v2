"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, RefreshCw, Smartphone, Sun } from "lucide-react";
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
  shares: ShareItem[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  icon,
  theme,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : theme.isDark
        ? "#0f172a"
        : theme.cardBg;

  const color = primary ? "#ffffff" : hover ? "#ffffff" : theme.text;
  const border = primary ? "none" : `1px solid ${theme.border}`;

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

function IconActionButton({
  icon,
  theme,
  onClick,
}: {
  icon: React.ReactNode;
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
        width: 42,
        height: 42,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: hover ? "#2563eb" : theme.isDark ? "#0f172a" : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      {icon}
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
        minHeight: 120,
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
  const { theme: mode, toggleTheme } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
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
        throw new Error((json as any)?.error || "Erro ao carregar cotas.");
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

  const shares = useMemo(() => data?.shares || [], [data]);

  const totalInvestedCents = useMemo(() => {
    return shares.reduce((sum, share) => sum + (share.amountCents ?? 0), 0);
  }, [shares]);

  const regionCount = useMemo(() => {
    return new Set(shares.map((share) => share.regionId)).size;
  }, [shares]);

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
        Carregando cotas...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
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
              Minhas cotas
            </h1>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Consulte suas cotas, regiões vinculadas e valores investidos.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ActionButton
              label={refreshing ? "Atualizando..." : "Atualizar"}
              icon={<RefreshCw size={16} />}
              theme={theme}
              onClick={() => load(true)}
              disabled={refreshing}
            />
            <IconActionButton
              icon={theme.isDark ? <Sun size={18} /> : <Moon size={18} />}
              theme={theme}
              onClick={toggleTheme}
            />
            <ActionButton
              label="Versão mobile"
              icon={<Smartphone size={16} />}
              theme={theme}
              primary
              onClick={() => router.push("/m/investor/quotas")}
            />
            <ActionButton
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
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            title="Cotas ativas"
            value={String(shares.length)}
            helper="Em carteira"
            theme={theme}
          />
          <SummaryCard
            title="Regiões"
            value={String(regionCount)}
            helper="Com participação"
            theme={theme}
          />
          <SummaryCard
            title="Investido"
            value={money(totalInvestedCents)}
            helper="Total aplicado"
            theme={theme}
            accent="#22c55e"
          />
        </div>

        <div
          style={{
            display: "grid",
            gap: 14,
          }}
        >
          {shares.length === 0 ? (
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: 18,
                background: theme.isDark ? "#0f172a" : theme.cardBg,
                color: muted,
                fontWeight: 700,
              }}
            >
              Nenhuma cota encontrada.
            </div>
          ) : (
            shares.map((share) => (
              <div
                key={share.id}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 18,
                  background: theme.isDark ? "#0f172a" : theme.cardBg,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
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
                      {share.region?.name || "Região"}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: muted,
                      }}
                    >
                      Cota #{share.quotaNumber}
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
                    {money(share.amountCents)}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Investido em
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {formatDate(share.investedAt)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Valor da cota
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {money(share.amountCents)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: muted, marginBottom: 4 }}>
                      Situação
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {share.paidBackAt ? "Encerrada" : "Ativa"}
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