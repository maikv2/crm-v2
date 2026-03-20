"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard, MobileSectionTitle, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepOverviewResponse = {
  summary: {
    pendingCommissionsCents: number;
  };
  pendingCommissions: Array<{
    id: string;
    month: number;
    year: number;
    commissionCents: number;
    regionName: string;
  }>;
};

export default function MobileRepCommissionsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RepOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCommissions() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mobile/rep/overview", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login?redirect=/m/rep/commissions");
          return;
        }

        if (res.status === 403) {
          router.push("/rep");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar comissões.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar comissões.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCommissions();

    return () => {
      active = false;
    };
  }, [router]);

  const totalPending = useMemo(() => {
    return data?.summary?.pendingCommissionsCents ?? 0;
  }, [data]);

  return (
    <MobileRepPageFrame
      title="Comissões"
      subtitle="Comissões do representante"
      desktopHref="/rep/finance/commissions"
    >
      {loading ? (
        <MobileCard>Carregando comissões...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : data ? (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <DollarSign size={20} />
              <div style={{ fontSize: 16, fontWeight: 900 }}>
                Total pendente
              </div>
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.05,
              }}
            >
              {formatMoneyBR(totalPending)}
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Períodos" />

            {data.pendingCommissions.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhuma comissão pendente encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {data.pendingCommissions.map((item) => (
                  <Link key={item.id} href="/rep/finance/commissions">
                    <div
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        padding: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: colors.text,
                          }}
                        >
                          {String(item.month).padStart(2, "0")}/{item.year}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: colors.subtext,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <CalendarDays size={14} />
                          {item.regionName}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: "#16a34a",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoneyBR(item.commissionCents)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      ) : null}
    </MobileRepPageFrame>
  );
}