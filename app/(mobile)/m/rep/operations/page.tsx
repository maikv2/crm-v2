"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronRight,
  ClipboardPlus,
  Package,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard, MobileSectionTitle } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepOverviewResponse = {
  summary: {
    pendingPortalRequests: number;
    pendingProspectsCount: number;
    visitsTodayCount: number;
    exhibitorsCount: number;
    clientsCount: number;
  };
};

export default function MobileRepOperationsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RepOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOperations() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mobile/rep/overview", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login?redirect=/m/rep/operations");
          return;
        }

        if (res.status === 403) {
          router.push("/rep");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar operações.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar operações."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOperations();

    return () => {
      active = false;
    };
  }, [router]);

  const operationLinks = data
    ? [
        {
          href: "/m/rep/orders",
          label: "Pedidos da região",
          helper: `${data.summary.pendingPortalRequests} solicitações pendentes`,
          icon: ShoppingCart,
        },
        {
          href: "/m/rep/clients",
          label: "Clientes da região",
          helper: `${data.summary.clientsCount} clientes`,
          icon: Users,
        },
        {
          href: "/m/rep/visit",
          label: "Registrar visita",
          helper: `${data.summary.visitsTodayCount} visitas hoje`,
          icon: ClipboardPlus,
        },
        {
          href: "/rep/exhibitors",
          label: "Expositores",
          helper: `${data.summary.exhibitorsCount} expositores`,
          icon: Package,
        },
        {
          href: "/rep/prospects",
          label: "Prospectos",
          helper: `${data.summary.pendingProspectsCount} prospectos pendentes`,
          icon: BriefcaseBusiness,
        },
        {
          href: "/rep/exhibitors",
          label: "Manutenções e operação",
          helper: "Acompanhar expositores e movimentação",
          icon: Wrench,
        },
      ]
    : [];

  return (
    <MobileRepPageFrame
      title="Operações"
      subtitle="Atalhos rápidos da sua região"
      desktopHref="/rep"
    >
      {loading ? (
        <MobileCard>Carregando operações...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <MobileCard>
          <MobileSectionTitle title="Ferramentas" />

          <div style={{ display: "grid", gap: 10 }}>
            {operationLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.label} href={item.href}>
                  <div
                    style={{
                      minHeight: 62,
                      borderRadius: 16,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "0 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: colors.isDark ? "#111827" : "#f8fafc",
                          border: `1px solid ${colors.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: colors.text,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {item.helper}
                        </div>
                      </div>
                    </div>

                    <ChevronRight size={18} color={colors.subtext} />
                  </div>
                </Link>
              );
            })}
          </div>
        </MobileCard>
      )}
    </MobileRepPageFrame>
  );
}