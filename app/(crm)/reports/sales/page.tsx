"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  ShoppingCart,
  ArrowLeft,
  TrendingUp,
  Users,
  Package,
  CreditCard,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SalesReport = {
  period: { from: string; to: string };
  summary: {
    totalOrders: number;
    totalRevenueCents: number;
    totalRevenue: number;
    totalDiscountCents: number;
    totalDiscount: number;
    paidCount: number;
    pendingCount: number;
    averageTicketCents: number;
  };
  byRegion: Array<{ id: string; name: string; orders: number; revenueCents: number }>;
  bySeller: Array<{ id: string; name: string; orders: number; revenueCents: number }>;
  byPaymentMethod: Array<{ label: string; orders: number; revenueCents: number }>;
  topClients: Array<{ id: string; name: string; orders: number; revenueCents: number }>;
  topProducts: Array<{ id: string; name: string; qty: number; revenueCents: number }>;
  byDay: Array<{ date: string; orders: number; revenueCents: number }>;
  orders: Array<{
    id: string;
    number: number;
    issuedAt: string;
    clientName: string;
    regionName: string;
    sellerName: string | null;
    totalCents: number;
    discountCents: number;
    paymentMethodLabel: string;
    statusLabel: string;
    paymentStatus: string;
    itemCount: number;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Theme = ReturnType<typeof getThemeColors>;

function Block({
  title,
  children,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  return (
    <div
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconFg,
  label,
  value,
  sub,
  theme,
}: {
  icon: any;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  sub?: string;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  return (
    <div
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: iconBg,
          color: iconFg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>
      )}
    </div>
  );
}

function RankRow({
  rank,
  name,
  value,
  sub,
  color,
  theme,
}: {
  rank: number;
  name: string;
  value: string;
  sub?: string;
  color: string;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const subtle = isDark ? "#0b1324" : "#f8fafc";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        border: `1px solid ${border}`,
        borderRadius: 12,
        background: subtle,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `${color}22`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {rank}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{name}</div>
          {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.text, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

function BarChart({
  data,
  color,
  theme,
}: {
  data: Array<{ label: string; value: number }>;
  color: string;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const max = Math.max(...data.map((d) => d.value), 1);
  const muted = isDark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, paddingTop: 8 }}>
      {data.map((item, i) => {
        const h = Math.max(4, (item.value / max) * 130);
        return (
          <div
            key={i}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <div
              style={{ width: "100%", maxWidth: 32, height: h, borderRadius: 6, background: color }}
            />
            <div style={{ fontSize: 11, color: muted, textAlign: "center" }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsSalesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const isDark = theme.isDark;
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/reports/sales?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Falha ao carregar relatório");
        const json = await res.json();
        if (active) setData(json);
      } catch (err) {
        if (active) setError("Não foi possível carregar o relatório de vendas.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [from, to]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>
        Carregando relatório...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700 }}>
        {error ?? "Erro desconhecido."}
      </div>
    );
  }

  const { summary } = data;

  // Chart: by day
  const chartData = data.byDay.map((d) => ({
    label: d.date.slice(8),
    value: d.revenueCents,
  }));

  return (
    <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <button
            onClick={() => router.push(`/reports?from=${from}&to=${to}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: muted,
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 10,
              padding: 0,
            }}
          >
            <ArrowLeft size={14} /> Voltar para Relatórios
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Relatório de Vendas</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                {fmtPeriod(data.period.from, data.period.to)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={ShoppingCart}
          iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"}
          iconFg="#16a34a"
          label="Total de Pedidos"
          value={String(summary.totalOrders)}
          sub={`${summary.paidCount} pagos · ${summary.pendingCount} pendentes`}
          theme={theme}
        />
        <StatCard
          icon={TrendingUp}
          iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"}
          iconFg="#2563eb"
          label="Faturamento Total"
          value={money(summary.totalRevenueCents)}
          sub={`Ticket médio: ${money(summary.averageTicketCents)}`}
          theme={theme}
        />
        <StatCard
          icon={CreditCard}
          iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"}
          iconFg="#7c3aed"
          label="Descontos Concedidos"
          value={money(summary.totalDiscountCents)}
          theme={theme}
        />
        <StatCard
          icon={Package}
          iconBg={isDark ? "rgba(249,115,22,0.14)" : "#fff1e8"}
          iconFg="#ea580c"
          label="Pedidos Pagos"
          value={String(summary.paidCount)}
          sub={`${summary.pendingCount} ainda pendentes`}
          theme={theme}
        />
      </div>

      {/* Chart + by region */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Faturamento por Dia" theme={theme}>
          {chartData.length > 0 ? (
            <BarChart data={chartData} color="#16a34a" theme={theme} />
          ) : (
            <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>
              Nenhuma venda no período
            </div>
          )}
        </Block>

        <Block title="Por Região" theme={theme}>
          <div style={{ display: "grid", gap: 10 }}>
            {data.byRegion.length === 0 && (
              <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>
            )}
            {data.byRegion.map((r, i) => (
              <RankRow
                key={r.id}
                rank={i + 1}
                name={r.name}
                value={money(r.revenueCents)}
                sub={`${r.orders} pedido${r.orders !== 1 ? "s" : ""}`}
                color="#2563eb"
                theme={theme}
              />
            ))}
          </div>
        </Block>
      </div>

      {/* Top clients + top products */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Top Clientes" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.topClients.slice(0, 8).map((c, i) => (
              <RankRow
                key={c.id}
                rank={i + 1}
                name={c.name}
                value={money(c.revenueCents)}
                sub={`${c.orders} pedido${c.orders !== 1 ? "s" : ""}`}
                color="#16a34a"
                theme={theme}
              />
            ))}
            {data.topClients.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>

        <Block title="Top Produtos" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.topProducts.slice(0, 8).map((p, i) => (
              <RankRow
                key={p.id}
                rank={i + 1}
                name={p.name}
                value={money(p.revenueCents)}
                sub={`${p.qty} un`}
                color="#7c3aed"
                theme={theme}
              />
            ))}
            {data.topProducts.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      {/* By seller + by payment method */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Por Representante / Vendedor" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.bySeller.map((s, i) => (
              <RankRow
                key={s.id}
                rank={i + 1}
                name={s.name}
                value={money(s.revenueCents)}
                sub={`${s.orders} pedido${s.orders !== 1 ? "s" : ""}`}
                color="#ea580c"
                theme={theme}
              />
            ))}
            {data.bySeller.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>

        <Block title="Por Forma de Pagamento" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byPaymentMethod.map((p, i) => (
              <RankRow
                key={p.label}
                rank={i + 1}
                name={p.label}
                value={money(p.revenueCents)}
                sub={`${p.orders} pedido${p.orders !== 1 ? "s" : ""}`}
                color="#2563eb"
                theme={theme}
              />
            ))}
            {data.byPaymentMethod.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      {/* Orders table */}
      <Block title={`Lista de Pedidos (${data.orders.length})`} theme={theme}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Nº", "Data", "Cliente", "Região", "Vendedor", "Pagamento", "Status", "Total"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: muted,
                      fontWeight: 700,
                      borderBottom: `1px solid ${border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr
                  key={o.id}
                  style={{ borderBottom: `1px solid ${border}` }}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: theme.text }}>
                    #{String(o.number).padStart(4, "0")}
                  </td>
                  <td style={{ padding: "10px 12px", color: muted }}>{fmtDate(o.issuedAt)}</td>
                  <td style={{ padding: "10px 12px", color: theme.text }}>{o.clientName}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.regionName}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.sellerName ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.paymentMethodLabel}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: 999,
                        background:
                          o.paymentStatus === "PAID"
                            ? isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"
                            : o.paymentStatus === "PENDING"
                            ? isDark ? "rgba(249,115,22,0.14)" : "#fff7ed"
                            : isDark ? "rgba(148,163,184,0.14)" : "#f1f5f9",
                        color:
                          o.paymentStatus === "PAID"
                            ? "#16a34a"
                            : o.paymentStatus === "PENDING"
                            ? "#ea580c"
                            : muted,
                      }}
                    >
                      {o.statusLabel}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: theme.text, textAlign: "right" }}>
                    {money(o.totalCents)}
                  </td>
                </tr>
              ))}
              {data.orders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "24px 12px", textAlign: "center", color: muted }}>
                    Nenhum pedido no período selecionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
}
