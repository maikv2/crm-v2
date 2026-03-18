"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type DashboardOverviewResponse = {
  summary: {
    totalClients: number;
    totalExhibitors: number;
    totalOrdersToday: number;
    totalOrdersMonth: number;
    monthRevenue: number;
  };
  receivable: {
    overdue: number;
    dueToday: number;
    restOfMonth: number;
  };
  payable: {
    overdue: number;
    dueToday: number;
    restOfMonth: number;
  };
  regions: Array<{
    id: string;
    name: string;
    clients: number;
    exhibitors: number;
    ordersToday: number;
    ordersMonth: number;
    revenue: number;
    summary: string;
  }>;
  monthlyRevenue: Array<{
    label: string;
    value: number;
  }>;
  salesByRegion: Array<{
    label: string;
    value: number;
  }>;
  financialAccounts: Array<{
    title: string;
    subtitle: string;
    value: number;
    type?: "bank" | "card" | "cash" | "other";
  }>;
  topClients: Array<{
    name: string;
    value: number;
  }>;
  topProducts: Array<{
    name: string;
    qty: number;
  }>;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  const buttonBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const buttonBorder = theme.isDark ? "#1e293b" : theme.border;
  const buttonText = theme.isDark ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${buttonBorder}`,
        background: hover ? "#2563eb" : buttonBg,
        color: hover ? "#ffffff" : buttonText,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        boxShadow: theme.isDark ? "0 4px 14px rgba(2,6,23,0.28)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  const blockBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const blockBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: blockBg,
        border: `1px solid ${blockBorder}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function SmallFinancialCard({
  title,
  value,
  extra,
  color,
  theme,
}: {
  title: string;
  value: string;
  extra: string;
  color: string;
  theme: ThemeShape;
}) {
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const cardBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 16,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
        minHeight: 136,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 4,
        }}
      >
        {extra.split("|")[0]}
      </div>

      <div
        style={{
          fontSize: 13,
          color: theme.isDark ? "#94a3b8" : "#64748b",
        }}
      >
        {extra.split("|")[1] ?? ""}
      </div>
    </div>
  );
}

function RegionCard({
  name,
  clients,
  exhibitors,
  ordersToday,
  ordersMonth,
  revenue,
  summary,
  theme,
}: {
  name: string;
  clients: number;
  exhibitors: number;
  ordersToday: number;
  ordersMonth: number;
  revenue: string;
  summary: string;
  theme: ThemeShape;
}) {
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const innerCardBg = theme.isDark ? "#111827" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: subtleCard,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {name}
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#3b82f6",
            background: theme.isDark ? "rgba(37,99,235,0.15)" : "#eaf1ff",
            padding: "6px 10px",
            borderRadius: 999,
          }}
        >
          Região ativa
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              color: muted,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            👥 Clientes
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {clients}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: muted,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            🏪 Expositores
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {exhibitors}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Pedidos hoje</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {ordersToday}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: muted }}>Pedidos no mês</div>
          <div
            style={{
              marginTop: 4,
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {ordersMonth}
          </div>
        </div>
      </div>

      <div
        style={{
          background: innerCardBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, color: muted }}>Faturamento do mês</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 22,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {revenue}
        </div>
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: muted,
        }}
      >
        {summary}
      </div>
    </div>
  );
}

function AccountItem({
  iconBg,
  iconFg,
  icon,
  title,
  subtitle,
  value,
  theme,
}: {
  iconBg: string;
  iconFg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  theme: ThemeShape;
}) {
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const border = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 14,
        background: subtleCard,
        padding: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: iconBg,
            color: iconFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {icon}
        </div>

        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 13,
              color: muted,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: theme.text,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/dashboard/overview", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Falha ao carregar dashboard");
        }

        const data: DashboardOverviewResponse = await res.json();

        if (active) {
          setOverview(data);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Não foi possível carregar os dados da dashboard.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      active = false;
    };
  }, []);

  const months = overview?.monthlyRevenue?.map((item) => item.label) ?? [];
  const values = overview?.monthlyRevenue?.map((item) => item.value) ?? [];
  const maxValue = Math.max(...values, 1);

  const donutColors = ["#5b8ee5", "#66c36f", "#f59e0b", "#a78bfa", "#dbe5f7"];

  const donutData = useMemo(
    () =>
      (overview?.salesByRegion ?? []).map((item, index) => ({
        label: item.label,
        value: item.value,
        color: donutColors[index % donutColors.length],
      })),
    [overview]
  );

  const donutGradient = (() => {
    const total = donutData.reduce((acc, item) => acc + item.value, 0);

    if (total <= 0) {
      return "conic-gradient(#dbe5f7 0% 100%)";
    }

    let start = 0;

    const parts = donutData.map((item) => {
      const end = start + (item.value / total) * 100;
      const str = `${item.color} ${start}% ${end}%`;
      start = end;
      return str;
    });

    return `conic-gradient(${parts.join(", ")})`;
  })();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
        }}
      >
        Carregando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontWeight: 700,
        }}
      >
        {error}
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
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: muted,
              marginBottom: 10,
            }}
          >
            🏠 / Dashboard
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Visão Geral
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Bem-vindo de volta! Aqui está o resumo do dia.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Novo Pedido"
            theme={theme}
            onClick={() => router.push("/orders/new")}
          />
          <ActionButton
            label="Novo Cliente"
            theme={theme}
            onClick={() => router.push("/clients/new")}
          />
          <ActionButton
            label="Novo Expositor"
            theme={theme}
            onClick={() => router.push("/exhibitors/new")}
          />
          <ActionButton
            label="Novo Lançamento"
            theme={theme}
            onClick={() => router.push("/finance/new")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: theme.text,
              }}
            >
              A receber
            </div>

            <ActionButton
              label="Nova venda"
              theme={theme}
              onClick={() => router.push("/orders/new")}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <SmallFinancialCard
              title="Vencidos"
              value={money(overview?.receivable.overdue ?? 0)}
              extra="Vencidos|"
              color="#22c55e"
              theme={theme}
            />
            <SmallFinancialCard
              title="Vencem hoje"
              value={money(overview?.receivable.dueToday ?? 0)}
              extra={`Vencem hoje|Restante do mês: ${money(
                overview?.receivable.restOfMonth ?? 0
              )}`}
              color="#22c55e"
              theme={theme}
            />
          </div>
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: theme.text,
              }}
            >
              A pagar
            </div>

            <ActionButton
              label="Nova Despesa"
              theme={theme}
              onClick={() => router.push("/finance/new")}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <SmallFinancialCard
              title="Vencidos"
              value={money(overview?.payable.overdue ?? 0)}
              extra="Vencidos|"
              color="#ef4444"
              theme={theme}
            />
            <SmallFinancialCard
              title="Vencem hoje"
              value={money(overview?.payable.dueToday ?? 0)}
              extra={`Vencem hoje|Restante do mês: ${money(
                overview?.payable.restOfMonth ?? 0
              )}`}
              color="#ef4444"
              theme={theme}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Block title="Resumo por Região" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {(overview?.regions ?? []).map((region) => (
              <RegionCard
                key={region.id}
                name={region.name}
                clients={region.clients}
                exhibitors={region.exhibitors}
                ordersToday={region.ordersToday}
                ordersMonth={region.ordersMonth}
                revenue={money(region.revenue)}
                summary={region.summary}
                theme={theme}
              />
            ))}
          </div>
        </Block>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <Block title="Gráfico de vendas" theme={theme}>
          <div
            style={{
              height: 312,
              display: "flex",
              gap: 10,
              alignItems: "end",
              paddingTop: 16,
              paddingLeft: 8,
              paddingRight: 8,
              background: cardBg,
              borderRadius: 14,
            }}
          >
            {values.map((value, i) => {
              const height = Math.max(6, (value / maxValue) * 250);

              return (
                <div
                  key={`${months[i]}-${i}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "end",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 28,
                      height,
                      borderRadius: 4,
                      background: "#49b653",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      color: muted,
                    }}
                  >
                    {months[i]}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: muted,
              textAlign: "center",
            }}
          >
            ● Faturamento
          </div>
        </Block>

        <Block title="Vendas por Região" theme={theme}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 312,
              flexDirection: "column",
            }}
          >
            <div
              style={{
                width: 260,
                height: 260,
                borderRadius: "50%",
                background: donutGradient,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 52,
                  borderRadius: "50%",
                  background: cardBg,
                  border: `1px solid ${border}`,
                }}
              />
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 8,
                width: "100%",
              }}
            >
              {donutData.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 14,
                    color: theme.text,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: item.color,
                        display: "inline-block",
                      }}
                    />
                    <span>{item.label}</span>
                  </div>

                  <span style={{ fontWeight: 700 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Block>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Block title="Contas financeiras" theme={theme}>
          <div
            style={{
              textAlign: "center",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                fontSize: 34,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              {money(
                (overview?.financialAccounts ?? []).reduce(
                  (sum, item) => sum + item.value,
                  0
                )
              )}
            </div>
            <div
              style={{
                marginTop: 6,
                color: muted,
                fontSize: 15,
              }}
            >
              Valor total
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              maxHeight: 320,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {(overview?.financialAccounts ?? []).map((item) => (
              <AccountItem
                key={`${item.title}-${item.subtitle}`}
                iconBg={
                  item.type === "cash"
                    ? theme.isDark
                      ? "rgba(34,197,94,0.14)"
                      : "#eaf8ef"
                    : item.type === "bank"
                    ? theme.isDark
                      ? "rgba(37,99,235,0.15)"
                      : "#eaf1ff"
                    : item.type === "card"
                    ? theme.isDark
                      ? "rgba(124,58,237,0.14)"
                      : "#f3ebff"
                    : theme.isDark
                    ? "rgba(249,115,22,0.14)"
                    : "#fff1e8"
                }
                iconFg={
                  item.type === "cash"
                    ? "#16a34a"
                    : item.type === "bank"
                    ? "#2563eb"
                    : item.type === "card"
                    ? "#7c3aed"
                    : "#ea580c"
                }
                icon={
                  item.type === "cash"
                    ? "💵"
                    : item.type === "bank"
                    ? "🏦"
                    : item.type === "card"
                    ? "💳"
                    : "◼"
                }
                title={item.title}
                subtitle={item.subtitle}
                value={money(item.value)}
                theme={theme}
              />
            ))}
          </div>
        </Block>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Block title="Top clientes" theme={theme}>
          <div style={{ display: "grid", gap: 12 }}>
            {(overview?.topClients ?? []).map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  background: subtleCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: theme.isDark ? "rgba(37,99,235,0.15)" : "#eaf1ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: theme.text,
                    }}
                  >
                    {item.name}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: theme.text,
                  }}
                >
                  {money(item.value)}
                </div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Produtos mais vendidos" theme={theme}>
          <div style={{ display: "grid", gap: 12 }}>
            {(overview?.topProducts ?? []).map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  background: subtleCard,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 999,
                      background: theme.isDark ? "rgba(124,58,237,0.14)" : "#f3ebff",
                      color: "#7c3aed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      color: theme.text,
                    }}
                  >
                    {item.name}
                  </div>
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    color: theme.text,
                  }}
                >
                  {item.qty} un
                </div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  );
}