"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  Boxes,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Sliders,
  Printer,
  AlertTriangle,
  Store,
  ShoppingCart,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StockReport = {
  period: { from: string; to: string };
  summary: {
    totalMovements: number;
    totalIn: number;
    totalOut: number;
    totalTransferIn: number;
    totalTransferOut: number;
    totalAdjustment: number;
  };
  byProductMovements: Array<{ id: string; name: string; in: number; out: number; transfers: number }>;
  byLocation: Array<{ id: string; name: string; in: number; out: number }>;
  currentPosition: Array<{
    productId: string;
    productName: string;
    priceCents: number;
    matrixQty: number;
    regionQtys: Array<{ regionId: string; regionName: string; qty: number }>;
    exhibitorQty: number;
    totalQty: number;
    totalValueCents: number;
  }>;
  movements: Array<{
    id: string;
    productName: string;
    locationName: string;
    type: string;
    typeLabel: string;
    quantity: number;
    note: string | null;
    orderNumber: number | null;
    createdAt: string;
  }>;
  exhibitorReport: {
    totalExhibitors: number;
    productTotals: Array<{ productId: string; name: string; qty: number }>;
    byClient: Array<{
      clientId: string;
      clientName: string;
      exhibitors: Array<{
        exhibitorId: string;
        exhibitorName: string | null;
        installedAt: string;
        items: Array<{ productId: string; productName: string; quantity: number }>;
      }>;
    }>;
  };
  salesStockReport: {
    productTotals: Array<{ productId: string; name: string; qty: number }>;
    byClient: Array<{
      clientId: string;
      clientName: string;
      products: Array<{ productId: string; name: string; qty: number }>;
    }>;
  };
  restockSuggestions: Array<{
    productId: string;
    productName: string;
    outQty: number;
    currentQty: number;
    needsRestock: boolean;
    suggestedQty: number;
  }>;
  restockMinimum: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}

// ─── PDF Generators ───────────────────────────────────────────────────────────

function printHTML(html: string, title: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
        h1 { font-size: 18px; font-weight: 900; margin-bottom: 4px; }
        h2 { font-size: 14px; font-weight: 800; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
        h3 { font-size: 12px; font-weight: 700; margin: 14px 0 6px; color: #444; }
        p { font-size: 11px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { text-align: left; font-size: 11px; font-weight: 700; color: #666; border-bottom: 1px solid #ddd; padding: 6px 8px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
        .total-row td { font-weight: 800; border-top: 2px solid #ccc; border-bottom: none; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
        .badge-red { background: #fee2e2; color: #dc2626; }
        .badge-orange { background: #fff7ed; color: #ea580c; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function generateExhibitorPDF(data: StockReport) {
  const period = fmtPeriod(data.period.from, data.period.to);
  const totalQty = data.exhibitorReport.productTotals.reduce((s, p) => s + p.qty, 0);

  let html = `
    <h1>Produtos Deixados em Expositores</h1>
    <p>Período: ${period} &nbsp;|&nbsp; Total de expositores instalados: ${data.exhibitorReport.totalExhibitors}</p>

    <h2>Total Geral por Produto</h2>
    <table>
      <thead><tr><th>Produto</th><th style="text-align:right">Qtd</th></tr></thead>
      <tbody>
        ${data.exhibitorReport.productTotals.map((p) => `
          <tr><td>${p.name}</td><td style="text-align:right;font-weight:700">${p.qty}</td></tr>
        `).join("")}
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${totalQty}</td></tr>
      </tbody>
    </table>

    <h2>Por Cliente</h2>
    ${data.exhibitorReport.byClient.map((client) => {
      const clientTotal = client.exhibitors.reduce((s, ex) => s + ex.items.reduce((ss, i) => ss + i.quantity, 0), 0);
      return `
        <h3>${client.clientName.toUpperCase()}</h3>
        ${client.exhibitors.map((ex) => `
          <p style="margin-bottom:4px;font-weight:600">
            Expositor: ${ex.exhibitorName ?? "S/N"} &nbsp;|&nbsp; Instalado em: ${fmtDate(ex.installedAt)}
          </p>
          <table>
            <thead><tr><th>Produto</th><th style="text-align:right">Qtd</th></tr></thead>
            <tbody>
              ${ex.items.map((item) => `
                <tr><td>${item.productName}</td><td style="text-align:right">${item.quantity}</td></tr>
              `).join("")}
            </tbody>
          </table>
        `).join("")}
        <p style="font-weight:800;text-align:right">Subtotal cliente: ${clientTotal} un</p>
      `;
    }).join("")}
  `;

  if (data.exhibitorReport.byClient.length === 0) {
    html += `<p>Nenhum expositor instalado no período selecionado.</p>`;
  }

  printHTML(html, "Relatório de Expositores");
}

function generateSalesPDF(data: StockReport) {
  const period = fmtPeriod(data.period.from, data.period.to);
  const totalQty = data.salesStockReport.productTotals.reduce((s, p) => s + p.qty, 0);

  let html = `
    <h1>Saídas de Estoque para Vendas</h1>
    <p>Período: ${period}</p>

    <h2>Total por Produto</h2>
    <table>
      <thead><tr><th>Produto</th><th style="text-align:right">Qtd vendida</th></tr></thead>
      <tbody>
        ${data.salesStockReport.productTotals.map((p) => `
          <tr><td>${p.name}</td><td style="text-align:right;font-weight:700">${p.qty}</td></tr>
        `).join("")}
        <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${totalQty}</td></tr>
      </tbody>
    </table>

    <h2>Por Cliente</h2>
    ${data.salesStockReport.byClient.map((client) => {
      const clientTotal = client.products.reduce((s, p) => s + p.qty, 0);
      return `
        <h3>${client.clientName.toUpperCase()}</h3>
        <table>
          <thead><tr><th>Produto</th><th style="text-align:right">Qtd</th></tr></thead>
          <tbody>
            ${client.products.map((p) => `
              <tr><td>${p.name}</td><td style="text-align:right">${p.qty}</td></tr>
            `).join("")}
            <tr class="total-row"><td>Subtotal</td><td style="text-align:right">${clientTotal}</td></tr>
          </tbody>
        </table>
      `;
    }).join("")}
  `;

  if (data.salesStockReport.byClient.length === 0) {
    html += `<p>Nenhuma saída para vendas no período.</p>`;
  }

  printHTML(html, "Saídas de Estoque — Vendas");
}

function generateRestockPDF(data: StockReport) {
  const period = fmtPeriod(data.period.from, data.period.to);

  const html = `
    <h1>Sugestão de Reposição de Estoque</h1>
    <p>Período analisado: ${period} &nbsp;|&nbsp; Mínimo em estoque: ${data.restockMinimum} unidades</p>

    <h2>Produtos que Precisam de Reposição</h2>
    <table>
      <thead>
        <tr>
          <th>Produto</th>
          <th style="text-align:right">Saldo Atual</th>
          <th style="text-align:right">Saiu no Período</th>
          <th style="text-align:right">Sugestão de Compra</th>
        </tr>
      </thead>
      <tbody>
        ${data.restockSuggestions.map((r) => `
          <tr>
            <td>${r.productName}</td>
            <td style="text-align:right">
              <span class="badge badge-${r.currentQty === 0 ? "red" : "orange"}">${r.currentQty}</span>
            </td>
            <td style="text-align:right">${r.outQty}</td>
            <td style="text-align:right;font-weight:800">${r.suggestedQty}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    ${data.restockSuggestions.length === 0
      ? `<p>Todos os produtos estão acima do estoque mínimo de ${data.restockMinimum} unidades.</p>`
      : `<p style="margin-top:8px">Total de produtos abaixo do mínimo: <strong>${data.restockSuggestions.length}</strong></p>`
    }
  `;

  printHTML(html, "Sugestão de Reposição");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function StatCard({ icon: Icon, iconBg, iconFg, label, value, sub, theme }: {
  icon: any; iconBg: string; iconFg: string; label: string; value: string; sub?: string; theme: Theme;
}) {
  const isDark = theme.isDark;
  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`, borderRadius: 16, padding: 20, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} /></div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
    </div>
  );
}

function MovTypeLabel({ typeLabel, theme }: { typeLabel: string; theme: Theme }) {
  const isDark = theme.isDark;
  const map: Record<string, { bg: string; fg: string }> = {
    "Entrada":                 { bg: isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef",  fg: "#16a34a" },
    "Saída":                   { bg: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",   fg: "#dc2626" },
    "Transferência (Entrada)": { bg: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff",  fg: "#2563eb" },
    "Transferência (Saída)":   { bg: isDark ? "rgba(124,58,237,0.18)" : "#f3ebff", fg: "#7c3aed" },
    "Ajuste":                  { bg: isDark ? "rgba(249,115,22,0.14)" : "#fff1e8", fg: "#ea580c" },
  };
  const style = map[typeLabel] ?? { bg: isDark ? "#1e293b" : "#f1f5f9", fg: isDark ? "#94a3b8" : "#64748b" };
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: "nowrap" }}>
      {typeLabel}
    </span>
  );
}

function PDFBlock({
  icon: Icon,
  iconBg,
  iconFg,
  title,
  description,
  count,
  countLabel,
  onPrint,
  theme,
}: {
  icon: any;
  iconBg: string;
  iconFg: string;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  onPrint: () => void;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const [hover, setHover] = useState(false);

  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${border}`, borderRadius: 18, padding: 22, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={22} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b" }}>{description}</div>
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: iconFg }}>
            {count} {countLabel}
          </div>
        </div>
      </div>

      <button
        onClick={onPrint}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 12,
          border: `1px solid ${hover ? "#2563eb" : border}`,
          background: hover ? "#2563eb" : "transparent",
          color: hover ? "#ffffff" : theme.text,
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13,
          transition: "all 0.15s ease",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        <Printer size={15} />
        Imprimir / PDF
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsStockPage() {
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

  const [data, setData] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/reports/stock?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setError("Não foi possível carregar o relatório de estoque.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [from, to]);

  if (loading) return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>Carregando relatório...</div>;
  if (error || !data) return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700 }}>{error ?? "Erro."}</div>;

  const { summary } = data;
  const totalValueCents = data.currentPosition.reduce((s, p) => s + p.totalValueCents, 0);

  return (
    <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.push(`/reports?from=${from}&to=${to}`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontWeight: 700, fontSize: 13, marginBottom: 10, padding: 0 }}>
          <ArrowLeft size={14} /> Voltar para Relatórios
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(124,58,237,0.18)" : "#f3ebff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Relatório de Estoque</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{fmtPeriod(data.period.from, data.period.to)}</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon={Boxes} iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"} iconFg="#7c3aed" label="Movimentações" value={String(summary.totalMovements)} theme={theme} />
        <StatCard icon={ArrowDown} iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"} iconFg="#16a34a" label="Entradas" value={String(summary.totalIn)} sub={`Transf. recebidas: ${summary.totalTransferIn}`} theme={theme} />
        <StatCard icon={ArrowUp} iconBg={isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"} iconFg="#dc2626" label="Saídas" value={String(summary.totalOut)} sub={`Transf. enviadas: ${summary.totalTransferOut}`} theme={theme} />
        <StatCard icon={Sliders} iconBg={isDark ? "rgba(249,115,22,0.14)" : "#fff1e8"} iconFg="#ea580c" label="Valor em Estoque" value={money(totalValueCents)} theme={theme} />
      </div>

      {/* PDF Blocks */}
      <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
        <PDFBlock
          icon={Store}
          iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"}
          iconFg="#2563eb"
          title="Produtos Deixados em Expositores"
          description="Total de produtos instalados em expositores no período, detalhado por cliente"
          count={data.exhibitorReport.totalExhibitors}
          countLabel={`expositor${data.exhibitorReport.totalExhibitors !== 1 ? "es" : ""} instalado${data.exhibitorReport.totalExhibitors !== 1 ? "s" : ""} no período`}
          onPrint={() => generateExhibitorPDF(data)}
          theme={theme}
        />

        <PDFBlock
          icon={ShoppingCart}
          iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"}
          iconFg="#16a34a"
          title="Saídas de Estoque para Vendas"
          description="Produtos que saíram do estoque para atender vendas no período, por produto e por cliente"
          count={data.salesStockReport.productTotals.reduce((s, p) => s + p.qty, 0)}
          countLabel="unidades vendidas no período"
          onPrint={() => generateSalesPDF(data)}
          theme={theme}
        />

        <PDFBlock
          icon={AlertTriangle}
          iconBg={
            data.restockSuggestions.length > 0
              ? isDark ? "rgba(249,115,22,0.14)" : "#fff1e8"
              : isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"
          }
          iconFg={data.restockSuggestions.length > 0 ? "#ea580c" : "#16a34a"}
          title="Sugestão de Reposição"
          description={`Produtos com saldo atual abaixo de ${data.restockMinimum} unidades que precisam de reposição`}
          count={data.restockSuggestions.length}
          countLabel={`produto${data.restockSuggestions.length !== 1 ? "s" : ""} abaixo do estoque mínimo`}
          onPrint={() => generateRestockPDF(data)}
          theme={theme}
        />
      </div>

      {/* By product movements + by location */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Produtos com Mais Movimentação" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byProductMovements.slice(0, 10).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: isDark ? "#0b1324" : "#f8fafc", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: isDark ? "rgba(124,58,237,0.18)" : "#f3ebff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{i + 1}</div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>+{p.in}</span>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>-{p.out}</span>
                  {p.transfers > 0 && <span style={{ color: "#2563eb", fontWeight: 700 }}>↔{p.transfers}</span>}
                </div>
              </div>
            ))}
            {data.byProductMovements.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Nenhuma movimentação no período</div>}
          </div>
        </Block>

        <Block title="Por Local de Estoque" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byLocation.map((loc) => (
              <div key={loc.id} style={{ padding: "12px 14px", border: `1px solid ${border}`, borderRadius: 12, background: isDark ? "#0b1324" : "#f8fafc" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: theme.text, marginBottom: 8 }}>{loc.name}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>↓ {loc.in} entradas</span>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>↑ {loc.out} saídas</span>
                </div>
              </div>
            ))}
            {data.byLocation.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      {/* Current position */}
      <div style={{ marginBottom: 20 }}>
        <Block title={`Posição Atual do Estoque (${data.currentPosition.length} produtos)`} theme={theme}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Produto", "Matriz", ...((data.currentPosition[0]?.regionQtys ?? []).map((r) => r.regionName)), "Expositores", "Total", "Valor"].map((h, i) => (
                    <th key={i} style={{ textAlign: i > 0 ? "center" : "left", padding: "8px 12px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.currentPosition.map((p) => (
                  <tr key={p.productId} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: theme.text }}>{p.productName}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", color: theme.text }}>{p.matrixQty}</td>
                    {p.regionQtys.map((r) => (
                      <td key={r.regionId} style={{ padding: "10px 12px", textAlign: "center", color: theme.text }}>{r.qty}</td>
                    ))}
                    <td style={{ padding: "10px 12px", textAlign: "center", color: theme.text }}>{p.exhibitorQty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, color: theme.text }}>{p.totalQty}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: theme.text }}>{money(p.totalValueCents)}</td>
                  </tr>
                ))}
                {data.currentPosition.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: "24px 12px", textAlign: "center", color: muted }}>Nenhum produto com estoque</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Block>
      </div>

      {/* Movements list */}
      <Block title={`Movimentações no Período (${data.movements.length})`} theme={theme}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Data/Hora", "Produto", "Local", "Tipo", "Qty", "Pedido", "Obs"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m) => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "10px 12px", color: muted, whiteSpace: "nowrap" }}>{fmtDateTime(m.createdAt)}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: theme.text }}>{m.productName}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{m.locationName}</td>
                  <td style={{ padding: "10px 12px" }}><MovTypeLabel typeLabel={m.typeLabel} theme={theme} /></td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: theme.text, textAlign: "center" }}>{m.quantity}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{m.orderNumber ? `#${String(m.orderNumber).padStart(4, "0")}` : "—"}</td>
                  <td style={{ padding: "10px 12px", color: muted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note ?? "—"}</td>
                </tr>
              ))}
              {data.movements.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "24px 12px", textAlign: "center", color: muted }}>Nenhuma movimentação no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
}
