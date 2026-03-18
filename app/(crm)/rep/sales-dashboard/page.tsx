"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

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

type OrderItem = {
  id: string;
  number?: number | null;
  status?: string | null;
  type?: string | null;
  totalCents?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  exhibitor?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
};

type OrdersResponse = {
  items: OrderItem[];
};

export default function RepSalesDashboardPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [dashboardRes, ordersRes] = await Promise.all([
        fetch("/api/rep/dashboard", { cache: "no-store" }),
        fetch("/api/rep/orders", { cache: "no-store" }),
      ]);

      const dashboardJson = await dashboardRes.json().catch(() => null);
      const ordersJson = await ordersRes.json().catch(() => null);

      if (!dashboardRes.ok) {
        throw new Error(
          dashboardJson?.error || "Erro ao carregar painel de vendas."
        );
      }

      if (!ordersRes.ok) {
        throw new Error(
          ordersJson?.error || "Erro ao carregar pedidos da região."
        );
      }

      setDashboard(dashboardJson as DashboardResponse);
      setOrders(Array.isArray(ordersJson?.items) ? ordersJson.items : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar painel de vendas."
      );
      setDashboard(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const salesSummary = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.totalOrders += 1;
        acc.totalSalesCents += order.totalCents ?? 0;

        if (order.paymentMethod === "CASH") acc.cashCents += order.totalCents ?? 0;
        if (order.paymentMethod === "PIX") acc.pixCents += order.totalCents ?? 0;
        if (order.paymentMethod === "BOLETO") acc.boletoCents += order.totalCents ?? 0;
        if (order.paymentMethod === "CARD_DEBIT")
          acc.cardDebitCents += order.totalCents ?? 0;
        if (order.paymentMethod === "CARD_CREDIT")
          acc.cardCreditCents += order.totalCents ?? 0;

        return acc;
      },
      {
        totalOrders: 0,
        totalSalesCents: 0,
        cashCents: 0,
        pixCents: 0,
        boletoCents: 0,
        cardDebitCents: 0,
        cardCreditCents: 0,
      }
    );
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => {
        const aTime = new Date(a.issuedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.issuedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [orders]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando painel de vendas...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Painel de Vendas
          </h1>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Região: {dashboard?.region?.name || "Não vinculada"}
        </div>

        {error ? (
          <div
            style={{
              ...card,
              marginBottom: 16,
              border: "1px solid #ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard
            label="Pedidos no mês"
            value={dashboard?.summary?.ordersThisMonth ?? 0}
            theme={theme}
          />
          <SummaryCard
            label="Vendas no mês"
            value={money(dashboard?.summary?.salesThisMonthCents ?? 0)}
            theme={theme}
            textValue
          />
          <SummaryCard
            label="Clientes ativos"
            value={dashboard?.summary?.clients ?? 0}
            theme={theme}
          />
          <SummaryCard
            label="Expositores ativos"
            value={dashboard?.summary?.exhibitors ?? 0}
            theme={theme}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard
            label="Dinheiro"
            value={money(salesSummary.cashCents)}
            theme={theme}
            textValue
          />
          <SummaryCard
            label="PIX"
            value={money(salesSummary.pixCents)}
            theme={theme}
            textValue
          />
          <SummaryCard
            label="Boleto"
            value={money(salesSummary.boletoCents)}
            theme={theme}
            textValue
          />
          <SummaryCard
            label="Débito"
            value={money(salesSummary.cardDebitCents)}
            theme={theme}
            textValue
          />
          <SummaryCard
            label="Crédito"
            value={money(salesSummary.cardCreditCents)}
            theme={theme}
            textValue
          />
        </div>

        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Pedidos recentes da região
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ color: muted }}>Nenhum pedido encontrado.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: theme.isDark ? "#111827" : "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 240, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>
                      Pedido #{order.number ?? "-"}
                    </div>
                    <div style={{ marginTop: 6, color: muted, fontSize: 14 }}>
                      Cliente: {order.client?.name ?? "-"}
                    </div>
                    <div style={{ marginTop: 4, color: muted, fontSize: 14 }}>
                      Expositor: {order.exhibitor?.name || order.exhibitor?.code || "-"}
                    </div>
                    <div style={{ marginTop: 4, color: muted, fontSize: 14 }}>
                      Data: {formatDateBR(order.issuedAt || order.createdAt)}
                    </div>
                  </div>

                  <div style={{ minWidth: 180, textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: muted }}>Forma de pagamento</div>
                    <div style={{ fontWeight: 800, marginTop: 4 }}>
                      {order.paymentMethod || "-"}
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>
                      Valor
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                      {money(order.totalCents ?? 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
  textValue,
}: {
  label: string;
  value: string | number;
  theme: any;
  textValue?: boolean;
}) {
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
          fontSize: textValue ? 20 : 28,
          fontWeight: 900,
          marginTop: 6,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}