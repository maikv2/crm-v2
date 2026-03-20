"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ClipboardPlus,
  DollarSign,
  Home,
  MapPin,
  ShoppingCart,
  Users,
  Wallet,
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
import { repMobileNavItems } from "@/app/components/mobile/mobile-rep-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepOverviewResponse = {
  summary: {
    salesTodayCents: number;
    salesTodayCount: number;
    salesMonthCents: number;
    salesMonthCount: number;
    clientsCount: number;
    exhibitorsCount: number;
    pendingProspectsCount: number;
    visitsTodayCount: number;
    pendingPortalRequests: number;
    overdueReceivablesCents: number;
    pendingCommissionsCents: number;
  };
  recentOrders: Array<{
    id: string;
    number: number;
    totalCents: number;
    createdAt: string;
    paymentStatus: string;
    clientId?: string | null;
    clientName: string;
  }>;
  nextClients: Array<{
    id: string;
    name: string;
    city?: string | null;
    district?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    lastVisitAt?: string | null;
  }>;
  pendingCommissions: Array<{
    id: string;
    month: number;
    year: number;
    commissionCents: number;
    regionName: string;
  }>;
};

const fabActions = [
  { label: "Novo pedido", href: "/m/rep/orders/new", icon: ShoppingCart },
  { label: "Registrar visita", href: "/m/rep/visit", icon: ClipboardPlus },
  { label: "Clientes da região", href: "/m/rep/clients", icon: Users },
];

export default function MobileRepPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RepOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mobile/rep/overview", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login?redirect=/m/rep");
          return;
        }

        if (res.status === 403) {
          router.push("/rep");
          return;
        }

        if (!res.ok) {
          throw new Error(
            json?.error || "Erro ao carregar representante mobile."
          );
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar representante mobile."
          );
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
      title="Representante"
      subtitle="Resumo da sua região e da sua operação"
      navItems={repMobileNavItems}
      fabActions={fabActions}
      showBrand
      brandHref="/m/rep"
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
              label="Visitas hoje"
              value={String(data.summary.visitsTodayCount)}
            />
            <MobileStatCard
              label="Comissões pendentes"
              value={formatMoneyBR(data.summary.pendingCommissionsCents)}
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
              <Link href="/m/rep/orders/new">
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

              <Link href="/m/rep/visit">
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
                  <ClipboardPlus size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    Registrar visita
                  </div>
                </div>
              </Link>

              <Link href="/m/rep/clients">
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
                  <Users size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Clientes</div>
                </div>
              </Link>

              <Link href="/m/rep/operations">
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
                  <BriefcaseBusiness size={18} />
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Operações</div>
                </div>
              </Link>
            </div>
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
                  subtitle={formatDateBR(order.createdAt)}
                  right={formatMoneyBR(order.totalCents)}
                  href="/m/rep/orders"
                />
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Clientes para acompanhar" />
            {data.nextClients.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum cliente encontrado.
              </div>
            ) : (
              data.nextClients.map((client) => (
                <MobileInfoRow
                  key={client.id}
                  title={client.name}
                  subtitle={`${client.city || "-"} • última visita ${formatDateBR(
                    client.lastVisitAt
                  )}`}
                  right={
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MapPin size={14} />
                      abrir
                    </span>
                  }
                  href="/m/rep/clients"
                />
              ))
            )}
          </MobileCard>

          <Link href="/m/rep/commissions">
            <MobileCard
              style={{
                background: colors.isDark ? "#111827" : "#eef4ff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <DollarSign size={18} />
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  Abrir minhas comissões
                </div>
              </div>
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Consulte mês a mês e acompanhe seus valores pendentes.
              </div>
            </MobileCard>
          </Link>

          <Link href="/m/rep/finance">
            <MobileCard
              style={{
                background: colors.isDark ? "#111827" : "#eef4ff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <Wallet size={18} />
                <div style={{ fontSize: 15, fontWeight: 900 }}>
                  Abrir financeiro da região
                </div>
              </div>
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Recebimentos em aberto e visão rápida da carteira.
              </div>
            </MobileCard>
          </Link>
        </>
      ) : null}
    </MobileShell>
  );
}