"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type ThemeShape = ReturnType<typeof getThemeColors>;

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

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

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: hover ? theme.primary : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
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
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
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

function StatCard({
  title,
  value,
  subtitle,
  accent,
  iconBg,
  iconFg,
  icon,
  theme,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  iconBg: string;
  iconFg: string;
  icon: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      <div style={{ height: 4, background: accent }} />

      <div style={{ padding: 22 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: iconBg,
            color: iconFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            marginBottom: 16,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: theme.subtext,
            marginBottom: 8,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: theme.text,
            marginBottom: 8,
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: accent,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

type SalesDashboardResponse = {
  summary: {
    monthRevenue: number;
    ordersToday: number;
    ticketAverage: number;
    activeClients: number;
  };
  monthlyRevenue: Array<{
    label: string;
    value: number;
  }>;
  salesByRegion: Array<{
    label: string;
    value: number;
  }>;
  topProducts: Array<{
    name: string;
    qty: number;
  }>;
  topClients: Array<{
    name: string;
    value: number;
  }>;
};

export default function SalesDashboardPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";
  const green = "#22c55e";
  const blue = "#2563eb";
  const orange = "#f97316";
  const purple = "#7c3aed";

  const iconBlueBg = theme.isDark ? "rgba(37,99,235,0.15)" : "#eaf1ff";
  const iconBlueFg = "#2563eb";
  const iconGreenBg = theme.isDark ? "rgba(34,197,94,0.14)" : "#eaf8ef";
  const iconGreenFg = "#16a34a";
  const iconOrangeBg = theme.isDark ? "rgba(249,115,22,0.14)" : "#fff1e8";
  const iconOrangeFg = "#ea580c";
  const iconPurpleBg = theme.isDark ? "rgba(124,58,237,0.14)" : "#f3ebff";
  const iconPurpleFg = "#7c3aed";

  const [overview, setOverview] = useState<SalesDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/sales-dashboard/overview", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Falha ao carregar painel de vendas");
        }

        const data: SalesDashboardResponse = await res.json();

        if (active) {
          setOverview(data);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError("Não foi possível carregar o painel de vendas.");
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

  const monthlySales = overview?.monthlyRevenue?.map((item) => item.value ?? 0) ?? [];
  const months = overview?.monthlyRevenue?.map((item) => item.label ?? "") ?? [];
  const maxValue = monthlySales.length > 0 ? Math.max(...monthlySales, 1) : 1;

  const regionData = useMemo(
    () =>
      (overview?.salesByRegion ?? []).map((item, index) => {
        const colors = ["#5b8ee5", "#66c36f", "#f59e0b", "#a78bfa", "#ef4444"];
        return {
          ...item,
          color: colors[index % colors.length],
        };
      }),
    [overview]
  );

  const donutGradient = (() => {
    const total = regionData.reduce((acc, item) => acc + item.value, 0);

    if (total <= 0) {
      return "conic-gradient(#dbe5f7 0% 100%)";
    }

    let start = 0;

    const parts = regionData.map((item) => {
      const end = start + (item.value / total) * 100;
      const str = `${item.color} ${start}% ${end}%`;
      start = end;
      return str;
    });

    return `conic-gradient(${parts.join(", ")})`;
  })();

  const topProducts = Array.isArray(overview?.topProducts) ? overview.topProducts : [];
  const topClients = Array.isArray(overview?.topClients) ? overview.topClients : [];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
          background: theme.pageBg,
        }}
      >
        Carregando painel de vendas...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "40vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontWeight: 700,
          background: theme.pageBg,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
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
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Painel de Vendas
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Visão Comercial
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Acompanhe o desempenho das vendas, regiões, produtos e clientes.
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
            label="Produtos"
            theme={theme}
            onClick={() => router.push("/products")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Faturamento do mês"
          value={money(overview?.summary.monthRevenue ?? 0)}
          subtitle="Dados reais do período"
          accent={green}
          iconBg={iconGreenBg}
          iconFg={iconGreenFg}
          icon="💰"
          theme={theme}
        />

        <StatCard
          title="Pedidos hoje"
          value={String(overview?.summary.ordersToday ?? 0)}
          subtitle="Pedidos emitidos hoje"
          accent={blue}
          iconBg={iconBlueBg}
          iconFg={iconBlueFg}
          icon="🛒"
          theme={theme}
        />

        <StatCard
          title="Ticket médio"
          value={money(overview?.summary.ticketAverage ?? 0)}
          subtitle="Média por pedido no mês"
          accent={orange}
          iconBg={iconOrangeBg}
          iconFg={iconOrangeFg}
          icon="📈"
          theme={theme}
        />

        <StatCard
          title="Clientes ativos"
          value={String(overview?.summary.activeClients ?? 0)}
          subtitle="Clientes com compra no mês"
          accent={purple}
          iconBg={iconPurpleBg}
          iconFg={iconPurpleFg}
          icon="👥"
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <Block title="Faturamento mensal" theme={theme}>
          <div
            style={{
              height: 312,
              display: "flex",
              gap: 10,
              alignItems: "end",
              paddingTop: 16,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            {monthlySales.map((value, i) => {
              const height = Math.max(8, (value / maxValue) * 250);

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
                      color: theme.subtext,
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
              color: theme.subtext,
              textAlign: "center",
            }}
          >
            ● Vendas do período
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
                  background: theme.cardBg,
                  border: `1px solid ${theme.border}`,
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
              {regionData.map((item) => (
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <Block title="Produtos mais vendidos" theme={theme}>
          <div style={{ display: "grid", gap: 12 }}>
            {topProducts.map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  border: `1px solid ${theme.border}`,
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
                      background: iconPurpleBg,
                      color: iconPurpleFg,
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

        <Block title="Top clientes" theme={theme}>
          <div style={{ display: "grid", gap: 12 }}>
            {topClients.map((item, index) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 14,
                  border: `1px solid ${theme.border}`,
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
                      background: iconBlueBg,
                      color: iconBlueFg,
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
      </div>
    </div>
  );
}