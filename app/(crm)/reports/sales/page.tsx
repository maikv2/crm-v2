"use client";

import { useEffect, useMemo, useState } from "react";
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
  Printer,
  FileText,
  Boxes,
  BadgeDollarSign,
} from "lucide-react";

type Option = { id: string; name: string | null };

type SalesReport = {
  period: { from: string; to: string };
  filters?: { regionId: string | null; sellerId: string | null };
  filterOptions: {
    regions: Option[];
    sellers: Option[];
  };
  summary: {
    totalOrders: number;
    totalRevenueCents: number;
    totalRevenue: number;
    totalDiscountCents: number;
    totalDiscount: number;
    totalCommissionCents: number;
    totalCommission: number;
    paidCount: number;
    pendingCount: number;
    averageTicketCents: number;
  };
  byRegion: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  bySeller: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  byPaymentMethod: Array<{ label: string; orders: number; revenueCents: number }>;
  topClients: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  topProducts: Array<{ id: string; sku: string | null; name: string; qty: number; revenueCents: number; commissionCents: number }>;
  soldProducts: Array<{ id: string; sku: string | null; name: string; qty: number; revenueCents: number; commissionCents: number }>;
  soldProductsByClient: Array<{
    clientId: string;
    clientName: string;
    regionName: string;
    sellerName: string | null;
    qty: number;
    revenueCents: number;
    commissionCents: number;
    products: Array<{ id: string; sku: string | null; name: string; qty: number; revenueCents: number; commissionCents: number }>;
  }>;
  commissionOrders: Array<{
    id: string;
    number: number;
    issuedAt: string;
    clientName: string;
    regionName: string;
    sellerId: string | null;
    sellerName: string | null;
    totalCents: number;
    commissionCents: number;
    items: Array<{ productId: string; sku: string | null; productName: string; qty: number; unitCents: number; totalCents: number; commissionUnitCents: number; commissionCents: number }>;
  }>;
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
    commissionCents: number;
    paymentMethodLabel: string;
    statusLabel: string;
    paymentStatus: string;
    itemCount: number;
  }>;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank");
  if (!win) return;

  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
          h1 { font-size: 22px; margin: 0 0 6px; }
          h2 { font-size: 16px; margin: 24px 0 10px; }
          .muted { color: #64748b; font-size: 12px; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
          .card .label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .card .value { font-size: 18px; font-weight: 800; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 7px 6px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; color: #334155; font-size: 10px; text-transform: uppercase; }
          .right { text-align: right; }
          .group { margin-top: 18px; padding-top: 10px; border-top: 2px solid #e5e7eb; }
          .group-title { font-weight: 800; font-size: 13px; }
          @media print { body { padding: 16px; } .no-break { break-inside: avoid; } }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function pdfHeader(data: SalesReport, title: string, subtitle?: string) {
  return `
    <h1>${escapeHtml(title)}</h1>
    <div class="muted">Período: ${escapeHtml(fmtPeriod(data.period.from, data.period.to))}</div>
    ${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ""}
    <div class="cards">
      <div class="card"><div class="label">Pedidos</div><div class="value">${data.summary.totalOrders}</div></div>
      <div class="card"><div class="label">Vendas</div><div class="value">${money(data.summary.totalRevenueCents)}</div></div>
      <div class="card"><div class="label">Comissão</div><div class="value">${money(data.summary.totalCommissionCents)}</div></div>
      <div class="card"><div class="label">Ticket médio</div><div class="value">${money(data.summary.averageTicketCents)}</div></div>
    </div>
  `;
}

function generateSoldProductsPDF(data: SalesReport) {
  const rows = data.soldProducts.map((p) => `
    <tr>
      <td>${escapeHtml(p.sku ?? "—")}</td>
      <td>${escapeHtml(p.name)}</td>
      <td class="right">${p.qty}</td>
      <td class="right">${money(p.revenueCents)}</td>
      <td class="right">${money(p.commissionCents)}</td>
    </tr>
  `).join("");

  const html = `
    ${pdfHeader(data, "Itens Vendidos")}
    <table>
      <thead><tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Venda total</th><th class="right">Comissão</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5">Nenhum item vendido no período.</td></tr>`}</tbody>
    </table>
  `;

  printHTML(html, "Itens Vendidos");
}

function generateSoldProductsByClientPDF(data: SalesReport) {
  const groups = data.soldProductsByClient.map((client) => `
    <div class="group no-break">
      <div class="group-title">${escapeHtml(client.clientName)}</div>
      <div class="muted">Região: ${escapeHtml(client.regionName)} · Representante: ${escapeHtml(client.sellerName ?? "—")} · Qtd: ${client.qty} · Venda: ${money(client.revenueCents)} · Comissão: ${money(client.commissionCents)}</div>
      <table>
        <thead><tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Venda total</th><th class="right">Comissão</th></tr></thead>
        <tbody>
          ${client.products.map((p) => `
            <tr>
              <td>${escapeHtml(p.sku ?? "—")}</td>
              <td>${escapeHtml(p.name)}</td>
              <td class="right">${p.qty}</td>
              <td class="right">${money(p.revenueCents)}</td>
              <td class="right">${money(p.commissionCents)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  const html = `${pdfHeader(data, "Itens Vendidos por Cliente")}${groups || `<p>Nenhum item vendido no período.</p>`}`;
  printHTML(html, "Itens Vendidos por Cliente");
}

function generateCommissionPDF(data: SalesReport, sellerName: string) {
  const orders = data.commissionOrders;
  const groups = orders.map((order) => `
    <div class="group no-break">
      <div class="group-title">Pedido #${String(order.number).padStart(4, "0")} · ${escapeHtml(order.clientName)}</div>
      <div class="muted">Data: ${escapeHtml(fmtDate(order.issuedAt))} · Região: ${escapeHtml(order.regionName)} · Representante: ${escapeHtml(order.sellerName ?? "—")} · Venda: ${money(order.totalCents)} · Comissão: ${money(order.commissionCents)}</div>
      <table>
        <thead><tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Unitário</th><th class="right">Venda item</th><th class="right">Comissão un.</th><th class="right">Comissão item</th></tr></thead>
        <tbody>
          ${order.items.map((item) => `
            <tr>
              <td>${escapeHtml(item.sku ?? "—")}</td>
              <td>${escapeHtml(item.productName)}</td>
              <td class="right">${item.qty}</td>
              <td class="right">${money(item.unitCents)}</td>
              <td class="right">${money(item.totalCents)}</td>
              <td class="right">${money(item.commissionUnitCents)}</td>
              <td class="right">${money(item.commissionCents)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  const subtitle = sellerName === "Todos" ? "Representante: Todos" : `Representante: ${sellerName}`;
  const html = `${pdfHeader(data, "Detalhamento de Comissão", subtitle)}${groups || `<p>Nenhuma comissão no período.</p>`}`;
  printHTML(html, "Detalhamento de Comissão");
}

type Theme = ReturnType<typeof getThemeColors>;

function Block({ title, children, theme }: { title: string; children: React.ReactNode; theme: Theme }) {
  const isDark = theme.isDark;
  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`, borderRadius: 18, padding: 22, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, iconBg, iconFg, label, value, sub, theme }: { icon: any; iconBg: string; iconFg: string; label: string; value: string; sub?: string; theme: Theme }) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${border}`, borderRadius: 16, padding: 20, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} /></div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
    </div>
  );
}

function RankRow({ rank, name, value, sub, color, theme }: { rank: number; name: string; value: string; sub?: string; color: string; theme: Theme }) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const subtle = isDark ? "#0b1324" : "#f8fafc";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: subtle, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}22`, color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{rank}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{name}</div>
          {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 800, color: theme.text, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

function BarChart({ data, color, theme }: { data: Array<{ label: string; value: number }>; color: string; theme: Theme }) {
  const isDark = theme.isDark;
  const max = Math.max(...data.map((d) => d.value), 1);
  const muted = isDark ? "#94a3b8" : "#64748b";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160, paddingTop: 8 }}>
      {data.map((item, i) => {
        const h = Math.max(4, (item.value / max) * 130);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", maxWidth: 32, height: h, borderRadius: 6, background: color }} />
            <div style={{ fontSize: 11, color: muted, textAlign: "center" }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function PDFBlock({ icon: Icon, title, description, onPrint, theme }: { icon: any; title: string; description: string; onPrint: () => void; theme: Theme }) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const muted = isDark ? "#94a3b8" : "#64748b";

  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${border}`, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 14, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={19} /></div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: theme.text }}>{title}</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <button onClick={onPrint} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", borderRadius: 12, padding: "10px 12px", background: "#2563eb", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
        <Printer size={15} /> Imprimir / PDF
      </button>
    </div>
  );
}

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
  const initialRegionId = searchParams.get("regionId") ?? "all";
  const initialSellerId = searchParams.get("sellerId") ?? "all";

  const [selectedRegionId, setSelectedRegionId] = useState(initialRegionId || "all");
  const [selectedSellerId, setSelectedSellerId] = useState(initialSellerId || "all");
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
        const params = new URLSearchParams({ from, to });
        if (selectedRegionId !== "all") params.set("regionId", selectedRegionId);
        if (selectedSellerId !== "all") params.set("sellerId", selectedSellerId);
        const res = await fetch(`/api/reports/sales?${params.toString()}`, { cache: "no-store" });
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
  }, [from, to, selectedRegionId, selectedSellerId]);

  const sellerName = useMemo(() => {
    if (!data || selectedSellerId === "all") return "Todos";
    return data.filterOptions.sellers.find((s) => s.id === selectedSellerId)?.name ?? "Representante selecionado";
  }, [data, selectedSellerId]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>Carregando relatório...</div>;
  }

  if (error || !data) {
    return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700 }}>{error ?? "Erro desconhecido."}</div>;
  }

  const { summary } = data;
  const chartData = data.byDay.map((d) => ({ label: d.date.slice(8), value: d.revenueCents }));

  return (
    <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <button onClick={() => router.push(`/reports?from=${from}&to=${to}`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontWeight: 700, fontSize: 13, marginBottom: 10, padding: 0 }}>
            <ArrowLeft size={14} /> Voltar para Relatórios
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Relatório de Vendas</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{fmtPeriod(data.period.from, data.period.to)}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${border}`, borderRadius: 16, padding: 16, marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: muted }}>Região</span>
          <select value={selectedRegionId} onChange={(e) => setSelectedRegionId(e.target.value)} style={{ height: 42, borderRadius: 12, border: `1px solid ${border}`, background: isDark ? "#020617" : "#ffffff", color: theme.text, padding: "0 12px", fontWeight: 700 }}>
            <option value="all">Todas as regiões</option>
            {data.filterOptions.regions.map((region) => <option key={region.id} value={region.id}>{region.name ?? "Região sem nome"}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: muted }}>Representante</span>
          <select value={selectedSellerId} onChange={(e) => setSelectedSellerId(e.target.value)} style={{ height: 42, borderRadius: 12, border: `1px solid ${border}`, background: isDark ? "#020617" : "#ffffff", color: theme.text, padding: "0 12px", fontWeight: 700 }}>
            <option value="all">Todos os representantes</option>
            {data.filterOptions.sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name ?? "Sem nome"}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon={ShoppingCart} iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"} iconFg="#16a34a" label="Total de Pedidos" value={String(summary.totalOrders)} sub={`${summary.paidCount} pagos · ${summary.pendingCount} pendentes`} theme={theme} />
        <StatCard icon={TrendingUp} iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"} iconFg="#2563eb" label="Faturamento Total" value={money(summary.totalRevenueCents)} sub={`Ticket médio: ${money(summary.averageTicketCents)}`} theme={theme} />
        <StatCard icon={BadgeDollarSign} iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"} iconFg="#7c3aed" label="Comissão Total" value={money(summary.totalCommissionCents)} theme={theme} />
        <StatCard icon={Package} iconBg={isDark ? "rgba(249,115,22,0.14)" : "#fff1e8"} iconFg="#ea580c" label="Pedidos Pagos" value={String(summary.paidCount)} sub={`${summary.pendingCount} ainda pendentes`} theme={theme} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <PDFBlock icon={Boxes} title="Itens Vendidos" description="Quantidade, venda total e comissão por produto." onPrint={() => generateSoldProductsPDF(data)} theme={theme} />
        <PDFBlock icon={Users} title="Itens Vendidos por Cliente" description="Produtos separados por cliente, com totais." onPrint={() => generateSoldProductsByClientPDF(data)} theme={theme} />
        <PDFBlock icon={FileText} title="Detalhamento de Comissão" description="Pedidos, itens, venda e comissão por representante." onPrint={() => generateCommissionPDF(data, sellerName)} theme={theme} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Faturamento por Dia" theme={theme}>
          {chartData.length > 0 ? <BarChart data={chartData} color="#16a34a" theme={theme} /> : <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Nenhuma venda no período</div>}
        </Block>

        <Block title="Por Região" theme={theme}>
          <div style={{ display: "grid", gap: 10 }}>
            {data.byRegion.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
            {data.byRegion.map((r, i) => <RankRow key={r.id} rank={i + 1} name={r.name} value={money(r.revenueCents)} sub={`${r.orders} pedido${r.orders !== 1 ? "s" : ""} · Comissão ${money(r.commissionCents)}`} color="#2563eb" theme={theme} />)}
          </div>
        </Block>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Top Clientes" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.topClients.slice(0, 8).map((c, i) => <RankRow key={c.id} rank={i + 1} name={c.name} value={money(c.revenueCents)} sub={`${c.orders} pedido${c.orders !== 1 ? "s" : ""} · Comissão ${money(c.commissionCents)}`} color="#16a34a" theme={theme} />)}
            {data.topClients.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>

        <Block title="Top Produtos" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.topProducts.slice(0, 8).map((p, i) => <RankRow key={p.id} rank={i + 1} name={p.name} value={money(p.revenueCents)} sub={`${p.qty} un · Comissão ${money(p.commissionCents)}`} color="#7c3aed" theme={theme} />)}
            {data.topProducts.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Por Representante / Vendedor" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.bySeller.map((s, i) => <RankRow key={s.id} rank={i + 1} name={s.name} value={money(s.revenueCents)} sub={`${s.orders} pedido${s.orders !== 1 ? "s" : ""} · Comissão ${money(s.commissionCents)}`} color="#ea580c" theme={theme} />)}
            {data.bySeller.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>

        <Block title="Por Forma de Pagamento" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byPaymentMethod.map((p, i) => <RankRow key={p.label} rank={i + 1} name={p.label} value={money(p.revenueCents)} sub={`${p.orders} pedido${p.orders !== 1 ? "s" : ""}`} color="#2563eb" theme={theme} />)}
            {data.byPaymentMethod.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      <Block title={`Lista de Pedidos (${data.orders.length})`} theme={theme}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Nº", "Data", "Cliente", "Região", "Vendedor", "Pagamento", "Status", "Comissão", "Total"].map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: theme.text }}>#{String(o.number).padStart(4, "0")}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{fmtDate(o.issuedAt)}</td>
                  <td style={{ padding: "10px 12px", color: theme.text }}>{o.clientName}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.regionName}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.sellerName ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{o.paymentMethodLabel}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: o.paymentStatus === "PAID" ? isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef" : o.paymentStatus === "PENDING" ? isDark ? "rgba(249,115,22,0.14)" : "#fff7ed" : isDark ? "rgba(148,163,184,0.14)" : "#f1f5f9", color: o.paymentStatus === "PAID" ? "#16a34a" : o.paymentStatus === "PENDING" ? "#ea580c" : muted }}>{o.statusLabel}</span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: theme.text, textAlign: "right" }}>{money(o.commissionCents)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: theme.text, textAlign: "right" }}>{money(o.totalCents)}</td>
                </tr>
              ))}
              {data.orders.length === 0 && <tr><td colSpan={9} style={{ padding: "24px 12px", textAlign: "center", color: muted }}>Nenhum pedido no período selecionado</td></tr>}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
}
