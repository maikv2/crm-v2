"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AdminOverviewResponse = {
  summary: {
    overdueReceivablesCents: number;
    dueTodayReceivablesCents: number;
    pendingCashTransfersCount: number;
    overdueFinanceCount: number;
  };
  urgentReceivables: Array<{
    id: string;
    amountCents: number;
    receivedCents: number;
    openCents: number;
    dueDate?: string | null;
    status: string;
    clientName: string;
    regionName: string;
    orderNumber?: number | null;
  }>;
};

export default function MobileAdminFinancePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mobile/admin/overview", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login?redirect=/m");
          return;
        }

        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar financeiro.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <MobileShell
      title="Financeiro"
      subtitle="Resumo executivo do financeiro"
      navItems={adminMobileNavItems}
      showBrand
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
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
            <MobileStatCard
              label="Em atraso"
              value={formatMoneyBR(data.summary.overdueReceivablesCents)}
            />
            <MobileStatCard
              label="Receber hoje"
              value={formatMoneyBR(data.summary.dueTodayReceivablesCents)}
            />
            <MobileStatCard
              label="Repasses"
              value={String(data.summary.pendingCashTransfersCount)}
              helper="pendentes"
            />
            <MobileStatCard
              label="Lançamentos vencidos"
              value={String(data.summary.overdueFinanceCount)}
              helper="financeiro pendente"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Recebimentos urgentes" />
            {data.urgentReceivables.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum recebimento urgente no momento.
              </div>
            ) : (
              data.urgentReceivables.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.clientName} • ${item.regionName}`}
                  subtitle={`Vence em ${formatDateBR(item.dueDate)}${
                    item.orderNumber ? ` • Pedido #${item.orderNumber}` : ""
                  }`}
                  right={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: item.status === "OVERDUE" ? "#ef4444" : colors.text,
                      }}
                    >
                      {item.status === "OVERDUE" ? <AlertTriangle size={14} /> : null}
                      {formatMoneyBR(item.openCents)}
                    </span>
                  }
                  href="/m/admin/finance/receivables"
                />
              ))
            )}
          </MobileCard>

          <div style={{ display: "grid", gap: 12 }}>
            <Link href="/m/admin/finance/receivables">
              <MobileCard
                style={{
                  background: colors.isDark ? "#111827" : "#eef4ff",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                  Contas a receber
                </div>
                <div style={{ fontSize: 13, color: colors.subtext }}>
                  Abra a área mobile de recebimentos.
                </div>
              </MobileCard>
            </Link>

            <Link href="/m/admin/finance/transfers">
              <MobileCard
                style={{
                  background: colors.isDark ? "#111827" : "#eef4ff",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                  Repasses pendentes
                </div>
                <div style={{ fontSize: 13, color: colors.subtext }}>
                  Abra a área mobile de repasses e conferências.
                </div>
              </MobileCard>
            </Link>
          </div>
        </>
      ) : null}
    </MobileShell>
  );
}