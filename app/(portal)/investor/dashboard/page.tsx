"use client";

import { useEffect, useState } from "react";
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

function fifthBusinessDay(year: number, month: number): Date {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
      if (count === 5) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(year, month - 1, 7);
}

function getNextDay10(): Date {
  const now = new Date();
  const thisMonth10 = new Date(now.getFullYear(), now.getMonth(), 10);
  if (now < thisMonth10) return thisMonth10;
  return new Date(now.getFullYear(), now.getMonth() + 1, 10);
}

type InvestorMeResponse = {
  investor: { id: string; name: string; email: string | null };
  period: { month: number; year: number };
  totals: {
    salesCents: number;
    receivedCents: number;
    yourShareCents: number;
  };
  quotas: {
    totalInvestedCents: number;
    totalQuotaCount: number;
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

function BigCard({
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
        borderRadius: 20,
        padding: 26,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 36,
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
            marginTop: 10,
            fontSize: 13,
            color: theme.isDark ? "#94a3b8" : "#64748b",
            lineHeight: 1.5,
          }}
        >
          {helper}
        </div>
      ) : null}
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
  const [data, setData] = useState<InvestorMeResponse | null>(null);

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });

      if (res.status === 401) {
        router.push("/investor/login");
        return;
      }

      const json = (await res.json().catch(() => null)) as InvestorMeResponse | null;

      if (!res.ok) {
        throw new Error((json as { error?: string } | null)?.error || "Erro ao carregar portal do investidor.");
      }

      setData(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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

  const nextDay10 = getNextDay10();
  const periodLabel = data ? `${String(data.period.month).padStart(2, "0")}/${data.period.year}` : "";

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "calc(100vh - 74px)",
        width: "100%",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 8 }}>
              Portal do investidor
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Resumo</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              Referente a {periodLabel} · atualizado em tempo real
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
            <PageButton
              label="Minhas cotas"
              theme={theme}
              onClick={() => router.push("/investor/quotas")}
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
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <BigCard
            title="Total de vendas no mês"
            value={money(data?.totals.salesCents ?? 0)}
            helper="Todas as vendas emitidas na região neste mês."
            theme={theme}
          />
          <BigCard
            title="Total recebido no mês"
            value={money(data?.totals.receivedCents ?? 0)}
            helper="Só o que já entrou de fato no caixa (vendas parceladas contam quando a parcela é paga)."
            theme={theme}
            accent="#16a34a"
          />
          <BigCard
            title="Sua parte disponível"
            value={money(data?.totals.yourShareCents ?? 0)}
            helper={`Será distribuída no dia ${nextDay10.toLocaleDateString("pt-BR")}.`}
            theme={theme}
            accent="#2563eb"
          />
        </div>
      </div>
    </div>
  );
}
