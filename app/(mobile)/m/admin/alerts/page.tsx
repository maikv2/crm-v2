"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  ChevronRight,
  ClipboardList,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AdminOverviewResponse = {
  summary: {
    pendingPortalRequests: number;
    overdueReceivablesCents: number;
    dueTodayReceivablesCents: number;
    pendingCashTransfersCount: number;
    overdueFinanceCount: number;
    visitsTodayCount: number;
  };
  urgentReceivables: Array<{
    id: string;
    openCents: number;
    status: string;
    clientName: string;
    regionName: string;
    dueDate?: string | null;
    orderNumber?: number | null;
  }>;
  recentOrders: Array<{
    id: string;
    number: number;
    clientName: string;
    regionName: string;
    status: string;
    totalCents: number;
  }>;
};

export default function MobileAdminAlertsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/alerts");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/mobile/admin/overview", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar alertas.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar alertas.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAlerts();

    return () => {
      active = false;
    };
  }, [router]);

  const alertCards = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Solicitações pendentes",
        value: String(data.summary.pendingPortalRequests),
        href: "/m/admin/alerts",
        icon: Bell,
        accent: colors.primary,
      },
      {
        label: "Contas em atraso",
        value: formatMoneyBR(data.summary.overdueReceivablesCents),
        href: "/m/admin/finance/receivables",
        icon: AlertTriangle,
        accent: "#ef4444",
      },
      {
        label: "Receber hoje",
        value: formatMoneyBR(data.summary.dueTodayReceivablesCents),
        href: "/m/admin/finance/receivables",
        icon: ClipboardList,
        accent: colors.primary,
      },
      {
        label: "Repasses pendentes",
        value: String(data.summary.pendingCashTransfersCount),
        href: "/m/admin/finance/transfers",
        icon: ArrowRightLeft,
        accent: "#f59e0b",
      },
    ];
  }, [data, colors.primary]);

  return (
    <MobilePageFrame
      title="Alertas"
      subtitle="Central mobile de prioridades"
      desktopHref="/alerts"
    >
      {loading ? (
        <MobileCard>Carregando alertas...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : data ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            {alertCards.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.label} href={item.href}>
                  <MobileCard style={{ padding: 14 }}>
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
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
                          color: item.accent,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: colors.subtext,
                          fontWeight: 700,
                        }}
                      >
                        {item.label}
                      </div>

                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: colors.text,
                          lineHeight: 1.15,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  </MobileCard>
                </Link>
              );
            })}
          </div>

          <MobileCard>
            <MobileSectionTitle title="Recebimentos críticos" />

            {data.urgentReceivables.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum recebimento crítico no momento.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {data.urgentReceivables.slice(0, 8).map((item) => (
                  <Link key={item.id} href="/m/admin/finance/receivables">
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
                          {item.clientName}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {item.regionName}
                          {item.orderNumber ? ` • Pedido #${item.orderNumber}` : ""}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: item.status === "OVERDUE" ? "#ef4444" : colors.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoneyBR(item.openCents)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Ações rápidas" />

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/m/admin/finance/receivables">
                <div
                  style={{
                    minHeight: 52,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertTriangle size={18} />
                    <span style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>
                      Abrir contas a receber
                    </span>
                  </div>
                  <ChevronRight size={18} color={colors.subtext} />
                </div>
              </Link>

              <Link href="/m/admin/finance/transfers">
                <div
                  style={{
                    minHeight: 52,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <ArrowRightLeft size={18} />
                    <span style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>
                      Abrir repasses
                    </span>
                  </div>
                  <ChevronRight size={18} color={colors.subtext} />
                </div>
              </Link>

              <Link href="/m/admin/exhibitors">
                <div
                  style={{
                    minHeight: 52,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Wrench size={18} />
                    <span style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>
                      Ver expositores e manutenção
                    </span>
                  </div>
                  <ChevronRight size={18} color={colors.subtext} />
                </div>
              </Link>
            </div>
          </MobileCard>
        </>
      ) : null}
    </MobilePageFrame>
  );
}