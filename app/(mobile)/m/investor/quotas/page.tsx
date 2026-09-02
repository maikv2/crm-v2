"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RegionQuotaItem = {
  regionId: string;
  regionName: string;
  quotaCount: number;
  regionTotalQuotaCount: number;
  investedCents: number;
  quotaNumbers: number[];
};

type InvestorMeResponse = {
  quotas: {
    totalInvestedCents: number;
    totalQuotaCount: number;
    regions: RegionQuotaItem[];
  };
};

export default function MobileInvestorQuotasPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const colors = getThemeColors(mode);

  const [data, setData] = useState<InvestorMeResponse | null>(null);
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
      console.error("Erro ao carregar cotas do investidor:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(() => data?.quotas.regions ?? [], [data]);

  return (
    <MobileInvestorPageFrame
      title="Minhas cotas"
      subtitle="Investimento por região"
      desktopHref="/investor/quotas"
    >
      <MobileCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>
              Total investido
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#16a34a", marginTop: 3 }}>
              {formatMoneyBR(data?.quotas.totalInvestedCents ?? 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>
              Cotas em carteira
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: colors.text, marginTop: 3 }}>
              {data?.quotas.totalQuotaCount ?? 0}
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileSectionTitle
        title="Por região"
        action={
          <button
            onClick={() => load(true)}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              background: colors.isDark ? "#0f172a" : "#ffffff",
              color: colors.text,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {refreshing ? "..." : "↻"}
          </button>
        }
      />

      {loading ? <MobileCard>Carregando cotas...</MobileCard> : null}

      {!loading && regions.length === 0 ? (
        <MobileCard>
          <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma cota encontrada.</div>
        </MobileCard>
      ) : null}

      {!loading &&
        regions.map((region) => {
          const percent =
            region.regionTotalQuotaCount > 0
              ? Math.round((region.quotaCount / region.regionTotalQuotaCount) * 100)
              : 0;

          return (
            <MobileCard key={region.regionId}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>{region.regionName}</div>
                  <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
                    Cotas #{region.quotaNumbers.join(", #")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: colors.primary }}>
                    {formatMoneyBR(region.investedCents)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: colors.isDark ? "#111827" : "#f8fafc",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.subtext,
                  }}
                >
                  <span>{region.quotaCount} de {region.regionTotalQuotaCount || "?"} cotas</span>
                  <span style={{ color: colors.text, fontWeight: 900 }}>{percent}%</span>
                </div>
                <div style={{ width: "100%", height: 8, borderRadius: 999, background: colors.isDark ? "#1f2937" : "#e5e7eb", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, percent)}%`, height: "100%", background: colors.primary }} />
                </div>
              </div>
            </MobileCard>
          );
        })}
    </MobileInvestorPageFrame>
  );
}
