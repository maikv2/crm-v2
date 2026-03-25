"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

type RepDashboardResponse = {
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

type RepAgendaResponse = {
  atrasados: any[];
  hoje: any[];
  proximos: any[];
  visitadosHoje: any[];
  regionName?: string | null;
};

type RepCommissionsResponse = {
  dayCommissionCents?: number;
  weekCommissionCents?: number;
  monthCommissionCents?: number;
  topClients?: Array<{
    name: string;
    valueCents: number;
  }>;
  topProducts?: Array<{
    name: string;
    qty: number;
  }>;
  recentOrders?: Array<{
    id: string;
    totalCents: number;
    client?: {
      name?: string | null;
    } | null;
  }>;
};

type RepOrdersResponse = {
  items: Array<{
    id: string;
    number: number;
    totalCents: number;
    issuedAt: string | Date;
    createdAt: string | Date;
    client?: {
      name?: string | null;
    } | null;
  }>;
};

export default function RepHomePage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [dashboardData, setDashboardData] =
    useState<RepDashboardResponse | null>(null);
  const [agendaData, setAgendaData] = useState<RepAgendaResponse | null>(null);
  const [commissionData, setCommissionData] =
    useState<RepCommissionsResponse | null>(null);
  const [ordersData, setOrdersData] = useState<RepOrdersResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [dashboardRes, agendaRes, commissionsRes, ordersRes] =
        await Promise.all([
          fetch("/api/rep/dashboard", { cache: "no-store" }),
          fetch("/api/rep/agenda", { cache: "no-store" }),
          fetch("/api/rep/commissions", { cache: "no-store" }),
          fetch("/api/rep/orders", { cache: "no-store" }),
        ]);

      const dashboardJson = await dashboardRes.json().catch(() => null);
      const agendaJson = await agendaRes.json().catch(() => null);
      const commissionsJson = await commissionsRes.json().catch(() => null);
      const ordersJson = await ordersRes.json().catch(() => null);

      if (!dashboardRes.ok) {
        throw new Error(
          dashboardJson?.error || "Erro ao carregar dashboard do representante."
        );
      }

      if (!agendaRes.ok) {
        throw new Error(agendaJson?.error || "Erro ao carregar agenda.");
      }

      if (!ordersRes.ok) {
        throw new Error(ordersJson?.error || "Erro ao carregar pedidos.");
      }

      setDashboardData(dashboardJson as RepDashboardResponse);
      setAgendaData(agendaJson as RepAgendaResponse);
      setOrdersData(ordersJson as RepOrdersResponse);

      if (commissionsRes.ok) {
        setCommissionData(commissionsJson as RepCommissionsResponse);
      } else {
        setCommissionData(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao carregar painel do representante.");
      setDashboardData(null);
      setAgendaData(null);
      setCommissionData(null);
      setOrdersData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const atrasados = agendaData?.atrasados?.length ?? 0;
    const hoje = agendaData?.hoje?.length ?? 0;
    const visitadosHoje = agendaData?.visitadosHoje?.length ?? 0;
    const proximos = agendaData?.proximos?.length ?? 0;

    return {
      atrasados,
      hoje,
      visitadosHoje,
      proximos,
    };
  }, [agendaData]);

  const weekSalesCents = useMemo(() => {
    const weekStart = startOfWeek();
    const todayEnd = endOfDay();

    return (ordersData?.items ?? []).reduce((acc, order) => {
      const issuedAt = new Date(order.issuedAt);
      if (issuedAt >= weekStart && issuedAt <= todayEnd) {
        return acc + (order.totalCents ?? 0);
      }
      return acc;
    }, 0);
  }, [ordersData]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
        }}
      >
        Carregando painel do representante...
      </div>
    );
  }

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: 1100 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              Painel do Representante
            </h1>
            <div style={{ color: muted, marginTop: 6 }}>
              Região: {dashboardData?.region?.name || "Não vinculada"}
            </div>
          </div>

          <button
            onClick={loadData}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: `1px solid ${border}`,
              background: cardBg,
              color: theme.text,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Atualizar painel
          </button>
        </div>

        {error && (
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: 16,
              background: cardBg,
              marginBottom: 20,
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatMoney
            label="Vendas reais da semana"
            value={weekSalesCents}
            theme={theme}
          />
          <StatMoney
            label="Comissão total da semana"
            value={commissionData?.weekCommissionCents ?? 0}
            theme={theme}
          />
          <StatCard
            label="Visitas atrasadas"
            value={summary.atrasados}
            theme={theme}
            alert
          />
          <StatCard
            label="Próximas visitas"
            value={summary.proximos}
            theme={theme}
          />
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>
            Resumo de visitas
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MiniInfoCard
              label="Visitas de hoje"
              value={summary.hoje}
              theme={theme}
            />
            <MiniInfoCard
              label="Visitados hoje"
              value={summary.visitadosHoje}
              theme={theme}
            />
            <MiniInfoCard
              label="Visitas atrasadas"
              value={summary.atrasados}
              theme={theme}
              danger
            />
            <MiniInfoCard
              label="Visitas futuras"
              value={summary.proximos}
              theme={theme}
            />
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Acessos rápidos</h3>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <QuickAction
              href="/rep/orders/new"
              label="Novo pedido"
              theme={theme}
            />
            <QuickAction
              href="/clients/new"
              label="Novo cliente"
              theme={theme}
            />
            <QuickAction
              href="/exhibitors/new"
              label="Novo expositor"
              theme={theme}
            />
            <QuickAction
              href="/rep/visit"
              label="Registrar visitas"
              theme={theme}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatCard
            label="Clientes da região"
            value={dashboardData?.summary?.clients ?? 0}
            theme={theme}
          />
          <StatCard
            label="Expositores ativos"
            value={dashboardData?.summary?.exhibitors ?? 0}
            theme={theme}
          />
          <StatCard
            label="Pedidos no mês"
            value={dashboardData?.summary?.ordersThisMonth ?? 0}
            theme={theme}
          />
          <StatMoney
            label="Vendas do mês"
            value={dashboardData?.summary?.salesThisMonthCents ?? 0}
            theme={theme}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatMoney
            label="Comissão do dia"
            value={commissionData?.dayCommissionCents ?? 0}
            theme={theme}
          />
          <StatMoney
            label="Comissão da semana"
            value={commissionData?.weekCommissionCents ?? 0}
            theme={theme}
          />
          <StatMoney
            label="Comissão do mês"
            value={commissionData?.monthCommissionCents ?? 0}
            theme={theme}
          />
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Top clientes do mês</h3>

          {commissionData?.topClients?.length ? (
            commissionData.topClients.map((c, i) => (
              <div
                key={`${c.name}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  gap: 12,
                }}
              >
                <span>
                  {i + 1}. {c.name}
                </span>
                <b>{money(c.valueCents)}</b>
              </div>
            ))
          ) : (
            <div style={{ color: muted }}>Sem dados ainda</div>
          )}
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>
            Produtos mais vendidos
          </h3>

          {commissionData?.topProducts?.length ? (
            commissionData.topProducts.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 6,
                  gap: 12,
                }}
              >
                <span>
                  {i + 1}. {p.name}
                </span>
                <b>{p.qty} un</b>
              </div>
            ))
          ) : (
            <div style={{ color: muted }}>Sem dados ainda</div>
          )}
        </div>

        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Últimos pedidos</h3>

          {commissionData?.recentOrders?.length ? (
            commissionData.recentOrders.map((order) => (
              <div key={order.id} style={{ marginTop: 8 }}>
                {order.client?.name || "Cliente"} — {money(order.totalCents)}
              </div>
            ))
          ) : (
            <div style={{ color: muted }}>Nenhum pedido recente</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, theme, alert }: any) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ fontSize: 13, color: theme.isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginTop: 6,
          color: alert && value > 0 ? "#ef4444" : theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatMoney({ label, value, theme }: any) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ fontSize: 13, color: theme.isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>
        {money(value ?? 0)}
      </div>
    </div>
  );
}

function MiniInfoCard({
  label,
  value,
  theme,
  danger,
}: {
  label: string;
  value: number;
  theme: any;
  danger?: boolean;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#111827" : "#f8fafc";

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: 14,
        background: cardBg,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: danger && value > 0 ? "#ef4444" : theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  theme,
}: {
  href: string;
  label: string;
  theme: any;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: cardBg,
        color: theme.text,
        textDecoration: "none",
        fontWeight: 800,
      }}
    >
      {label}
    </Link>
  );
}