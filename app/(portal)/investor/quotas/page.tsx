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

export default function InvestorQuotasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await fetch("/api/investor-auth/me", {
        cache: "no-store",
      });

      if (res.status === 401) {
        router.push("/investor/login");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();

    const interval = setInterval(() => {
      load(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const shares = useMemo(() => data?.shares || [], [data]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
        background: colors.pageBg,
        padding: 28,
        color: colors.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colors.subtext,
              marginBottom: 8,
            }}
          >
            📈 Portal do Investidor
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Minhas Cotas
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => load(true)}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {refreshing ? "Atualizando..." : "Atualizar"}
          </button>

          <button
            onClick={() => router.push("/investor")}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {shares.map((share: any) => (
          <div
            key={share.id}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: 16,
              background: colors.cardBg,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                marginBottom: 6,
              }}
            >
              Região: {share.region?.name}
            </div>

            <div
              style={{
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              Cota #{share.quotaNumber}
            </div>

            <div
              style={{
                marginTop: 8,
                fontWeight: 800,
              }}
            >
              Investido: {money(share.amountCents)}
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
                marginTop: 4,
              }}
            >
              Data: {formatDate(share.investedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}