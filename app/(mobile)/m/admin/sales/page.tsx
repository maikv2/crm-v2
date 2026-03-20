"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AdminOverviewResponse = {
  summary: {
    salesTodayCents: number;
    salesTodayCount: number;
    salesMonthCents: number;
    salesMonthCount: number;
  };
  recentOrders: Array<{
    id: string;
    number: number;
    totalCents: number;
    status: string;
    createdAt: string;
    clientName: string;
    regionName: string;
    sellerName?: string | null;
  }>;
  topRegionsMonth: Array<{
    regionId: string;
    regionName: string;
    totalCents: number;
    orderCount: number;
  }>;
};

export default function MobileAdminSalesPage() {
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
          throw new Error(json?.error || "Erro ao carregar vendas.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar vendas.");
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
      title="Vendas"
      subtitle="Resumo comercial do admin"
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
              label="Hoje"
              value={formatMoneyBR(data.summary.salesTodayCents)}
              helper={`${data.summary.salesTodayCount} pedidos`}
            />
            <MobileStatCard
              label="Mês"
              value={formatMoneyBR(data.summary.salesMonthCents)}
              helper={`${data.summary.salesMonthCount} pedidos`}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Regiões com maior venda no mês" />
            {data.topRegionsMonth.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Ainda sem movimento neste mês.
              </div>
            ) : (
              data.topRegionsMonth.map((region, index) => (
                <MobileInfoRow
                  key={region.regionId}
                  title={`${index + 1}. ${region.regionName}`}
                  subtitle={`${region.orderCount} pedidos no mês`}
                  right={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Trophy size={14} />
                      {formatMoneyBR(region.totalCents)}
                    </span>
                  }
                  href="/m/admin/orders"
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Pedidos recentes" />
            {data.recentOrders.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum pedido recente.
              </div>
            ) : (
              data.recentOrders.map((order) => (
                <MobileInfoRow
                  key={order.id}
                  title={`Pedido #${order.number} • ${order.clientName}`}
                  subtitle={`${order.regionName} • ${formatDateTimeBR(order.createdAt)}`}
                  right={formatMoneyBR(order.totalCents)}
                  href="/m/admin/orders"
                />
              ))
            )}
          </MobileCard>

          <Link href="/m/admin/orders">
            <MobileCard
              style={{
                background: colors.isDark ? "#111827" : "#eef4ff",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 6 }}>
                Abrir área mobile de pedidos
              </div>
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Acompanhe pedidos e ações rápidas sem sair do mobile.
              </div>
            </MobileCard>
          </Link>
        </>
      ) : null}
    </MobileShell>
  );
}