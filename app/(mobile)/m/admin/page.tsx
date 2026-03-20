"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FolderKanban,
  HandCoins,
  Home,
  Map,
  MoreHorizontal,
  PackagePlus,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
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
    overdueReceivablesCents: number;
    dueTodayReceivablesCents: number;
    pendingPortalRequests: number;
    pendingCashTransfersCount: number;
    overdueFinanceCount: number;
    clientsCount: number;
    exhibitorsCount: number;
    prospectsCount: number;
    representativesCount: number;
    visitsTodayCount: number;
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
  topRegionsMonth: Array<{
    regionId: string;
    regionName: string;
    totalCents: number;
    orderCount: number;
  }>;
};

const fabActions = [
  { label: "Novo pedido", href: "/m/admin/orders/new", icon: ShoppingCart },
  { label: "Novo cliente", href: "/m/admin/clients/new", icon: UserPlus },
  { label: "Novo expositor", href: "/m/admin/exhibitors/new", icon: PackagePlus },
  { label: "Prospectos", href: "/m/admin/prospects", icon: FolderKanban },
  { label: "Financeiro rápido", href: "/m/admin/finance", icon: HandCoins },
];

export default function MobileAdminHomePage() {
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
          throw new Error(json?.error || "Erro ao carregar admin mobile.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar admin mobile.");
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

  const alerts = useMemo(() => {
    if (!data) return [];

    return [
      {
        label: "Solicitações pendentes",
        value: `${data.summary.pendingPortalRequests}`,
        href: "/m/admin/alerts",
      },
      {
        label: "Contas em atraso",
        value: formatMoneyBR(data.summary.overdueReceivablesCents),
        href: "/m/admin/finance/receivables",
      },
      {
        label: "Repasses pendentes",
        value: `${data.summary.pendingCashTransfersCount}`,
        href: "/m/admin/finance/transfers",
      },
      {
        label: "Financeiro vencido",
        value: `${data.summary.overdueFinanceCount}`,
        href: "/m/admin/finance",
      },
    ];
  }, [data]);

  return (
    <MobileShell
      title="Admin Mobile"
      subtitle="Visão rápida para uso fora do escritório"
      navItems={adminMobileNavItems}
      fabActions={fabActions}
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
              label="Vendas hoje"
              value={formatMoneyBR(data.summary.salesTodayCents)}
              helper={`${data.summary.salesTodayCount} pedidos`}
            />
            <MobileStatCard
              label="Vendas do mês"
              value={formatMoneyBR(data.summary.salesMonthCents)}
              helper={`${data.summary.salesMonthCount} pedidos`}
            />
            <MobileStatCard
              label="Em atraso"
              value={formatMoneyBR(data.summary.overdueReceivablesCents)}
              helper="contas a receber"
            />
            <MobileStatCard
              label="Receber hoje"
              value={formatMoneyBR(data.summary.dueTodayReceivablesCents)}
              helper="vencimentos do dia"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Ações rápidas" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 10,
              }}
            >
              <Link href="/m/admin/orders/new">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShoppingCart size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Novo pedido</div>
                </div>
              </Link>

              <Link href="/m/admin/clients/new">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <UserPlus size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Novo cliente</div>
                </div>
              </Link>

              <Link href="/m/admin/exhibitors/new">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <PackagePlus size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Novo expositor</div>
                </div>
              </Link>

              <Link href="/m/admin/map">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Map size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Mapa comercial</div>
                </div>
              </Link>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Alertas principais" />
            {alerts.map((item) => (
              <MobileInfoRow
                key={item.label}
                title={item.label}
                right={item.value}
                href={item.href}
              />
            ))}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle
              title="Últimos pedidos"
              action={
                <Link href="/m/admin/orders" style={{ fontSize: 12, fontWeight: 800 }}>
                  ver tudo
                </Link>
              }
            />

            {data.recentOrders.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum pedido encontrado.
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

          <MobileCard>
            <MobileSectionTitle title="Base operacional" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MobileStatCard
                label="Clientes"
                value={String(data.summary.clientsCount)}
              />
              <MobileStatCard
                label="Expositores"
                value={String(data.summary.exhibitorsCount)}
              />
              <MobileStatCard
                label="Prospectos"
                value={String(data.summary.prospectsCount)}
              />
              <MobileStatCard
                label="Representantes"
                value={String(data.summary.representativesCount)}
              />
            </div>
          </MobileCard>
        </>
      ) : null}
    </MobileShell>
  );
}