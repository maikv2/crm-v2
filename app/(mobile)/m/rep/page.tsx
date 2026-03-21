"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Map,
  Package,
  PlusCircle,
  Store,
  Target,
  UserPlus,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type DashboardResponse = {
  region: {
    id: string;
    name: string;
  } | null;
  summary: {
    clients: number;
    exhibitors: number;
    ordersThisMonth: number;
    salesThisMonthCents: number;
    visitsToday: number;
    overdueVisits: number;
    portalRequestsPending: number;
  };
};

type AgendaResponse = {
  atrasados?: any[];
  hoje?: any[];
  proximos?: any[];
  visitadosHoje?: any[];
};

type CommissionsResponse = {
  dayCommissionCents?: number;
  weekCommissionCents?: number;
  monthCommissionCents?: number;
};

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111827" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

export default function RepMobileDashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [agenda, setAgenda] = useState<AgendaResponse | null>(null);
  const [commissions, setCommissions] = useState<CommissionsResponse | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [dashboardRes, agendaRes, commissionsRes] = await Promise.all([
          fetch("/api/rep/dashboard", { cache: "no-store" }),
          fetch("/api/rep/agenda", { cache: "no-store" }),
          fetch("/api/rep/commissions", { cache: "no-store" }),
        ]);

        if (
          dashboardRes.status === 401 ||
          agendaRes.status === 401 ||
          commissionsRes.status === 401
        ) {
          router.push("/login?redirect=/m/rep");
          return;
        }

        const dashboardJson = await dashboardRes.json().catch(() => null);
        const agendaJson = await agendaRes.json().catch(() => null);
        const commissionsJson = await commissionsRes.json().catch(() => null);

        if (!dashboardRes.ok) {
          throw new Error(
            dashboardJson?.error ||
              "Erro ao carregar dashboard do representante."
          );
        }

        if (!agendaRes.ok) {
          throw new Error(agendaJson?.error || "Erro ao carregar agenda.");
        }

        if (active) {
          setDashboard(dashboardJson);
          setAgenda(agendaJson);
          setCommissions(commissionsRes.ok ? commissionsJson : null);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar painel mobile."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  const agendaSummary = useMemo(() => {
    return {
      atrasados: agenda?.atrasados?.length ?? 0,
      hoje: agenda?.hoje?.length ?? 0,
      proximos: agenda?.proximos?.length ?? 0,
      visitadosHoje: agenda?.visitadosHoje?.length ?? 0,
    };
  }, [agenda]);

  return (
    <MobileRepPageFrame
      title="Dashboard"
      subtitle={
        dashboard?.region?.name
          ? `Região ${dashboard.region.name}`
          : "Painel mobile do representante"
      }
      desktopHref="/rep"
    >
      {loading ? (
        <MobileCard>Carregando dashboard...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <MobileCard style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.subtext,
                marginBottom: 8,
              }}
            >
              Vendas do mês
            </div>

            <div
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 900,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {formatMoneyBR(dashboard?.summary?.salesThisMonthCents ?? 0)}
            </div>

            <div
              style={{
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              {dashboard?.summary?.ordersThisMonth ?? 0} pedidos no mês •{" "}
              {dashboard?.summary?.clients ?? 0} clientes ativos na região
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Visitas hoje"
              value={String(dashboard?.summary?.visitsToday ?? 0)}
              helper={`${agendaSummary.visitadosHoje} já visitados`}
            />
            <MobileStatCard
              label="Atrasados"
              value={String(dashboard?.summary?.overdueVisits ?? 0)}
              helper={`${agendaSummary.proximos} próximos`}
            />
            <MobileStatCard
              label="Comissão mês"
              value={formatMoneyBR(commissions?.monthCommissionCents ?? 0)}
              helper={formatMoneyBR(commissions?.weekCommissionCents ?? 0)}
            />
            <MobileStatCard
              label="Expositores"
              value={String(dashboard?.summary?.exhibitors ?? 0)}
              helper="Base da região"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Atalhos principais" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/orders/new"
                title="Novo pedido"
                subtitle="Abrir o fluxo mobile para lançar um pedido"
                icon={<PlusCircle size={18} />}
              />

              <Shortcut
                href="/m/rep/clients/new"
                title="Novo cliente"
                subtitle="Cadastrar um novo cliente rapidamente"
                icon={<UserPlus size={18} />}
              />

              <Shortcut
                href="/m/rep/exhibitors/new"
                title="Novo expositor"
                subtitle="Abrir o cadastro do expositor da região"
                icon={<Store size={18} />}
              />

              <Shortcut
                href="/m/rep/prospects"
                title="Prospectos"
                subtitle="Cadastrar e acompanhar prospecções"
                icon={<Target size={18} />}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Agenda" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/visit"
                title="Minha agenda"
                subtitle="Ver visitas do dia, atrasadas e próximas"
                icon={<CalendarDays size={18} />}
              />

              <Shortcut
                href="/m/rep/map"
                title="Mapa"
                subtitle="Abrir clientes e prospectos com rota no Google Maps"
                icon={<Map size={18} />}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Centro de operações" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/operations"
                title="Abrir operações"
                subtitle="Cadastros, mapa, agenda e apoio operacional"
                icon={<Wrench size={18} />}
              />

              <Shortcut
                href="/m/rep/orders"
                title="Pedidos"
                subtitle="Consultar pedidos e andamento"
                icon={<Package size={18} />}
              />

              <Shortcut
                href="/m/rep/finance"
                title="Financeiro"
                subtitle="Ver comissão, cobranças e repasses"
                icon={<CircleDollarSign size={18} />}
              />
            </div>
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}