"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  ArrowLeft,
  BadgeDollarSign,
  Boxes,
  CreditCard,
  FileText,
  Package,
  Printer,
  Send,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

type Option = { id: string; name: string | null };
type Theme = ReturnType<typeof getThemeColors>;

type SoldProduct = {
  id: string;
  sku: string | null;
  name: string;
  qty: number;
  revenueCents: number;
  commissionCents: number;
};

type CommissionItem = {
  productId: string;
  sku: string | null;
  productName: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  commissionUnitCents: number;
  commissionCents: number;
};

type PendingReason = {
  label: string;
  dueDate: string | null;
  amountCents: number;
  receivedCents: number;
  pendingAmountCents: number;
  pendingCommissionCents: number;
  reason: string;
};

type SalesReport = {
  period: { from: string; to: string };
  filters?: { regionId: string | null; sellerId: string | null };
  filterOptions?: {
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
    payableCommissionCents: number;
    payableCommission: number;
    pendingCommissionCents: number;
    pendingCommission: number;
    paidCount: number;
    pendingCount: number;
    averageTicketCents: number;
  };
  byRegion: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  bySeller: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  byPaymentMethod: Array<{ label: string; orders: number; revenueCents: number }>;
  topClients: Array<{ id: string; name: string; orders: number; revenueCents: number; commissionCents: number }>;
  topProducts: SoldProduct[];
  soldProducts: SoldProduct[];
  soldProductsByClient: Array<{
    clientId: string;
    clientName: string;
    regionName: string;
    sellerName: string | null;
    qty: number;
    revenueCents: number;
    commissionCents: number;
    products: SoldProduct[];
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
    payableCommissionCents: number;
    pendingCommissionCents: number;
    receivedCents: number;
    receivableTotalCents: number;
    pendingReasons: PendingReason[];
    items: CommissionItem[];
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printHtml(html: string, title: string) {
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
          .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 18px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
          .card .label { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .card .value { font-size: 16px; font-weight: 800; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 7px 6px; text-align: left; vertical-align: top; }
          th { background: #f8fafc; color: #334155; font-size: 10px; text-transform: uppercase; }
          .right { text-align: right; }
          .group { margin-top: 18px; padding-top: 10px; border-top: 2px solid #e5e7eb; }
          .group-title { font-weight: 800; font-size: 13px; }
          @media print {
            body { padding: 16px; }
            .no-break { break-inside: avoid; }
            .cards { grid-template-columns: repeat(3, 1fr); }
          }
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
      <div class="card"><div class="label">Comissão total</div><div class="value">${money(data.summary.totalCommissionCents)}</div></div>
      <div class="card"><div class="label">Paga agora</div><div class="value">${money(data.summary.payableCommissionCents)}</div></div>
      <div class="card"><div class="label">Pendente</div><div class="value">${money(data.summary.pendingCommissionCents)}</div></div>
    </div>
  `;
}

function generateSoldProductsPdf(data: SalesReport) {
  const rows = data.soldProducts
    .map(
      (p) => `
        <tr>
          <td>${escapeHtml(p.sku ?? "—")}</td>
          <td>${escapeHtml(p.name)}</td>
          <td class="right">${p.qty}</td>
          <td class="right">${money(p.revenueCents)}</td>
          <td class="right">${money(p.commissionCents)}</td>
        </tr>
      `,
    )
    .join("");

  printHtml(
    `
      ${pdfHeader(data, "Itens vendidos")}
      <table>
        <thead>
          <tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Venda total</th><th class="right">Comissão</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="5">Nenhum item vendido no período.</td></tr>`}</tbody>
      </table>
    `,
    "Itens vendidos",
  );
}

function generateSoldProductsByClientPdf(data: SalesReport) {
  const groups = data.soldProductsByClient
    .map(
      (client) => `
        <div class="group no-break">
          <div class="group-title">${escapeHtml(client.clientName)}</div>
          <div class="muted">Região: ${escapeHtml(client.regionName)} · Representante: ${escapeHtml(client.sellerName ?? "—")} · Qtd: ${client.qty} · Venda: ${money(client.revenueCents)} · Comissão: ${money(client.commissionCents)}</div>
          <table>
            <thead>
              <tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Venda total</th><th class="right">Comissão</th></tr>
            </thead>
            <tbody>
              ${client.products
                .map(
                  (p) => `
                    <tr>
                      <td>${escapeHtml(p.sku ?? "—")}</td>
                      <td>${escapeHtml(p.name)}</td>
                      <td class="right">${p.qty}</td>
                      <td class="right">${money(p.revenueCents)}</td>
                      <td class="right">${money(p.commissionCents)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `,
    )
    .join("");

  printHtml(
    `${pdfHeader(data, "Itens vendidos por cliente")}${groups || `<p>Nenhum item vendido no período.</p>`}`,
    "Itens vendidos por cliente",
  );
}

function generateCommissionPdf(data: SalesReport, sellerName: string) {
  const groups = data.commissionOrders
    .map((order) => {
      const itemRows = order.items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.sku ?? "—")}</td>
              <td>${escapeHtml(item.productName)}</td>
              <td class="right">${item.qty}</td>
              <td class="right">${money(item.unitCents)}</td>
              <td class="right">${money(item.totalCents)}</td>
              <td class="right">${money(item.commissionUnitCents)}</td>
              <td class="right">${money(item.commissionCents)}</td>
            </tr>
          `,
        )
        .join("");

      const pendingRows = order.pendingReasons
        .map(
          (reason) => `
            <tr>
              <td>${escapeHtml(reason.label)}</td>
              <td>${reason.dueDate ? escapeHtml(fmtDate(reason.dueDate)) : "—"}</td>
              <td>${escapeHtml(reason.reason)}</td>
              <td class="right">${money(reason.amountCents)}</td>
              <td class="right">${money(reason.receivedCents)}</td>
              <td class="right">${money(reason.pendingAmountCents)}</td>
              <td class="right">${money(reason.pendingCommissionCents)}</td>
            </tr>
          `,
        )
        .join("");

      return `
        <div class="group no-break">
          <div class="group-title">Pedido #${String(order.number).padStart(4, "0")} · ${escapeHtml(order.clientName)}</div>
          <div class="muted">Data: ${escapeHtml(fmtDate(order.issuedAt))} · Região: ${escapeHtml(order.regionName)} · Representante: ${escapeHtml(order.sellerName ?? "—")}</div>
          <div class="cards">
            <div class="card"><div class="label">Venda</div><div class="value">${money(order.totalCents)}</div></div>
            <div class="card"><div class="label">Recebido</div><div class="value">${money(order.receivedCents)}</div></div>
            <div class="card"><div class="label">Comissão total</div><div class="value">${money(order.commissionCents)}</div></div>
            <div class="card"><div class="label">Paga agora</div><div class="value">${money(order.payableCommissionCents)}</div></div>
            <div class="card"><div class="label">Pendente</div><div class="value">${money(order.pendingCommissionCents)}</div></div>
          </div>
          <table>
            <thead>
              <tr><th>SKU</th><th>Produto</th><th class="right">Qtd</th><th class="right">Unitário</th><th class="right">Venda item</th><th class="right">Comissão un.</th><th class="right">Comissão item</th></tr>
            </thead>
            <tbody>${itemRows || `<tr><td colspan="7">Nenhum item encontrado.</td></tr>`}</tbody>
          </table>
          ${
            order.pendingCommissionCents > 0
              ? `
                <h2>Comissão ainda não paga / motivo</h2>
                <table>
                  <thead>
                    <tr><th>Parcela</th><th>Vencimento</th><th>Motivo</th><th class="right">Valor</th><th class="right">Recebido</th><th class="right">Em aberto</th><th class="right">Comissão pendente</th></tr>
                  </thead>
                  <tbody>${pendingRows || `<tr><td colspan="7">Comissão pendente sem parcela detalhada.</td></tr>`}</tbody>
                </table>
              `
              : `<div class="muted" style="margin-top:10px;">Comissão liberada para pagamento neste acerto.</div>`
          }
        </div>
      `;
    })
    .join("");

  const subtitle = sellerName === "Todos" ? "Representante: Todos" : `Representante: ${sellerName}`;
  printHtml(
    `${pdfHeader(data, "Detalhamento de comissão", subtitle)}${groups || `<p>Nenhuma comissão no período.</p>`}`,
    "Detalhamento de comissão",
  );
}

function Block({ title, children, theme }: { title: string; children: ReactNode; theme: Theme }) {
  const isDark = theme.isDark;
  return (
    <div
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, marginBottom: 16 }}>{title}</div>
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
  icon: React.ElementType;
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
        boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
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
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
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
          <div key={`${item.label}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", maxWidth: 32, height: h, borderRadius: 6, background: color }} />
            <div style={{ fontSize: 11, color: muted, textAlign: "center" }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function PdfBlock({
  icon: Icon,
  title,
  description,
  onPrint,
  theme,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onPrint: () => void;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const muted = isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={19} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: theme.text }}>{title}</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{description}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onPrint}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "none",
          borderRadius: 12,
          padding: "10px 12px",
          background: "#2563eb",
          color: "#ffffff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
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

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  const [from, setFrom] = useState(searchParams.get("from") ?? firstDay);
  const [to, setTo] = useState(searchParams.get("to") ?? lastDay);
  const [regionId, setRegionId] = useState(searchParams.get("regionId") ?? "all");
  const [sellerId, setSellerId] = useState(searchParams.get("sellerId") ?? "all");
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financePhone, setFinancePhone] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [sendingSettlement, setSendingSettlement] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<string | null>(null);

  const isDark = theme.isDark;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const subtle = isDark ? "#0b1324" : "#f8fafc";

  async function loadReport(nextFrom = from, nextTo = to, nextRegionId = regionId, nextSellerId = sellerId) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ from: nextFrom, to: nextTo });
    if (nextRegionId && nextRegionId !== "all") params.set("regionId", nextRegionId);
    if (nextSellerId && nextSellerId !== "all") params.set("sellerId", nextSellerId);

    try {
      const res = await fetch(`/api/reports/sales?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erro ao carregar relatório.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFinancePhone(window.localStorage.getItem("salesReport.financePhone") ?? "");
    setPixKey(window.localStorage.getItem("salesReport.pixKey") ?? "");
  }, []);

  function applyFilters() {
    const params = new URLSearchParams({ from, to });
    if (regionId !== "all") params.set("regionId", regionId);
    if (sellerId !== "all") params.set("sellerId", sellerId);
    router.replace(`/reports/sales?${params.toString()}`);
    loadReport(from, to, regionId, sellerId);
  }

  function saveFinancialAutomationConfig() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("salesReport.financePhone", financePhone);
    window.localStorage.setItem("salesReport.pixKey", pixKey);
    setSettlementStatus("Dados do financeiro salvos neste navegador.");
  }

  async function sendCommissionSettlement() {
    if (!data) return;
    setSendingSettlement(true);
    setSettlementStatus(null);

    try {
      const res = await fetch("/api/automations/commission-settlement/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: financePhone,
          pixKey,
          period: data.period,
          filters: {
            regionName: regionId === "all" ? "Todas as regiões" : data.filterOptions?.regions.find((region) => region.id === regionId)?.name ?? "Região selecionada",
            sellerName: sellerId === "all" ? "Todos os representantes" : data.filterOptions?.sellers.find((seller) => seller.id === sellerId)?.name ?? "Representante selecionado",
          },
          summary: data.summary,
          bySeller: data.bySeller,
          commissionOrders: data.commissionOrders,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erro ao enviar fechamento.");
      setSettlementStatus("Fechamento enviado pelo WhatsApp com sucesso.");
    } catch (err) {
      setSettlementStatus(err instanceof Error ? err.message : "Erro ao enviar fechamento.");
    } finally {
      setSendingSettlement(false);
    }
  }

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.byDay.map((d) => ({
      label: new Date(`${d.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: d.revenueCents,
    }));
  }, [data]);

  const selectedSellerName = useMemo(() => {
    if (!data || sellerId === "all") return "Todos";
    return data.filterOptions?.sellers.find((seller) => seller.id === sellerId)?.name ?? "Selecionado";
  }, [data, sellerId]);

  return (
    <div style={{ minHeight: "100vh", background: theme.pageBg, color: theme.text, padding: 24 }}>
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => router.push("/reports")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: `1px solid ${border}`,
            background: isDark ? "#0f172a" : "#ffffff",
            color: theme.text,
            borderRadius: 12,
            padding: "10px 14px",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart size={24} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Relatório de Vendas</h1>
                <div style={{ color: muted, fontSize: 14 }}>Resumo, produtos vendidos, clientes e detalhamento de comissão.</div>
              </div>
            </div>
          </div>
        </div>

        <Block title="Filtros" theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>De</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle(isDark, border, theme.text)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>Até</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle(isDark, border, theme.text)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>Região</label>
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)} style={inputStyle(isDark, border, theme.text)}>
                <option value="all">Todas as regiões</option>
                {(data?.filterOptions?.regions ?? []).map((region) => (
                  <option key={region.id} value={region.id}>{region.name ?? "Sem nome"}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>Representante</label>
              <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} style={inputStyle(isDark, border, theme.text)}>
                <option value="all">Todos os representantes</option>
                {(data?.filterOptions?.sellers ?? []).map((seller) => (
                  <option key={seller.id} value={seller.id}>{seller.name ?? "Sem nome"}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={applyFilters} style={{ width: "100%", border: "none", borderRadius: 12, padding: "12px 14px", background: "#16a34a", color: "#ffffff", fontWeight: 900, cursor: "pointer" }}>
                Aplicar filtros
              </button>
            </div>
          </div>
        </Block>

        {loading && <div style={{ padding: 28, color: muted }}>Carregando relatório...</div>}
        {error && <div style={{ marginTop: 18, padding: 16, border: "1px solid #fecaca", borderRadius: 14, background: "#fef2f2", color: "#991b1b", fontWeight: 700 }}>{error}</div>}

        {data && !loading && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 14, marginTop: 18, marginBottom: 18 }}>
              <StatCard icon={ShoppingCart} iconBg="#dcfce7" iconFg="#16a34a" label="Pedidos" value={String(data.summary.totalOrders)} sub={fmtPeriod(data.period.from, data.period.to)} theme={theme} />
              <StatCard icon={TrendingUp} iconBg="#dbeafe" iconFg="#2563eb" label="Vendas" value={money(data.summary.totalRevenueCents)} sub={`Ticket médio ${money(data.summary.averageTicketCents)}`} theme={theme} />
              <StatCard icon={BadgeDollarSign} iconBg="#fef3c7" iconFg="#d97706" label="Comissão total" value={money(data.summary.totalCommissionCents)} sub="Total gerado no período" theme={theme} />
              <StatCard icon={CreditCard} iconBg="#dcfce7" iconFg="#16a34a" label="Paga agora" value={money(data.summary.payableCommissionCents)} sub="Somente valores baixados" theme={theme} />
              <StatCard icon={FileText} iconBg="#fee2e2" iconFg="#dc2626" label="Pendente" value={money(data.summary.pendingCommissionCents)} sub="Em aberto ou a vencer" theme={theme} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
              <PdfBlock icon={Package} title="Itens vendidos" description="Produtos vendidos com quantidade, venda total e comissão." onPrint={() => generateSoldProductsPdf(data)} theme={theme} />
              <PdfBlock icon={Users} title="Itens por cliente" description="Produtos vendidos separados por cliente, com totais." onPrint={() => generateSoldProductsByClientPdf(data)} theme={theme} />
              <PdfBlock icon={BadgeDollarSign} title="Detalhamento de comissão" description="Pedido, itens, comissão liberada, pendente e motivo." onPrint={() => generateCommissionPdf(data, selectedSellerName)} theme={theme} />
            </div>

            <Block title="Fechamento de comissão por WhatsApp" theme={theme}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>Telefone do financeiro</label>
                  <input
                    value={financePhone}
                    onChange={(e) => setFinancePhone(e.target.value)}
                    placeholder="Ex: 47999999999"
                    style={inputStyle(isDark, border, theme.text)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: muted, marginBottom: 6 }}>Chave Pix para pagamento</label>
                  <input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Chave Pix"
                    style={inputStyle(isDark, border, theme.text)}
                  />
                </div>
                <button
                  type="button"
                  onClick={saveFinancialAutomationConfig}
                  style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "12px 14px", background: isDark ? "#020617" : "#ffffff", color: theme.text, fontWeight: 900, cursor: "pointer" }}
                >
                  Salvar dados
                </button>
                <button
                  type="button"
                  onClick={sendCommissionSettlement}
                  disabled={sendingSettlement || !financePhone.trim()}
                  style={{ border: "none", borderRadius: 12, padding: "12px 14px", background: sendingSettlement || !financePhone.trim() ? "#94a3b8" : "#16a34a", color: "#ffffff", fontWeight: 900, cursor: sendingSettlement || !financePhone.trim() ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Send size={16} /> {sendingSettlement ? "Enviando..." : "Enviar fechamento"}
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: muted, lineHeight: 1.5 }}>
                O envio usa o período, região e representante filtrados nesta tela. A comissão a pagar considera somente valores já baixados no financeiro.
              </div>
              {settlementStatus && (
                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, border: `1px solid ${border}`, background: subtle, color: theme.text, fontSize: 13, fontWeight: 700 }}>
                  {settlementStatus}
                </div>
              )}
            </Block>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 20 }}>
              <Block title="Vendas por dia" theme={theme}>
                <BarChart data={chartData} color="#16a34a" theme={theme} />
              </Block>

              <Block title="Resumo de Comissão" theme={theme}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={summaryLineStyle(subtle, border)}><span>Total gerado</span><strong>{money(data.summary.totalCommissionCents)}</strong></div>
                  <div style={summaryLineStyle(subtle, border)}><span>Pago neste acerto</span><strong>{money(data.summary.payableCommissionCents)}</strong></div>
                  <div style={summaryLineStyle(subtle, border)}><span>Pendente para próximo acerto</span><strong>{money(data.summary.pendingCommissionCents)}</strong></div>
                  <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>A comissão só entra como paga quando o financeiro baixa o recebimento do cliente.</div>
                </div>
              </Block>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
              <Block title="Top Clientes" theme={theme}>
                <div style={{ display: "grid", gap: 8 }}>
                  {data.topClients.slice(0, 8).map((client, i) => (
                    <RankRow key={client.id} rank={i + 1} name={client.name} value={money(client.revenueCents)} sub={`${client.orders} pedido${client.orders !== 1 ? "s" : ""} · Comissão ${money(client.commissionCents)}`} color="#16a34a" theme={theme} />
                  ))}
                  {data.topClients.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
                </div>
              </Block>

              <Block title="Top Produtos" theme={theme}>
                <div style={{ display: "grid", gap: 8 }}>
                  {data.topProducts.slice(0, 8).map((product, i) => (
                    <RankRow key={product.id} rank={i + 1} name={product.name} value={money(product.revenueCents)} sub={`${product.qty} un · Comissão ${money(product.commissionCents)}`} color="#7c3aed" theme={theme} />
                  ))}
                  {data.topProducts.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
                </div>
              </Block>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
              <Block title="Por Representante / Vendedor" theme={theme}>
                <div style={{ display: "grid", gap: 8 }}>
                  {data.bySeller.map((seller, i) => (
                    <RankRow key={seller.id} rank={i + 1} name={seller.name} value={money(seller.revenueCents)} sub={`${seller.orders} pedido${seller.orders !== 1 ? "s" : ""} · Comissão ${money(seller.commissionCents)}`} color="#ea580c" theme={theme} />
                  ))}
                  {data.bySeller.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
                </div>
              </Block>

              <Block title="Por Forma de Pagamento" theme={theme}>
                <div style={{ display: "grid", gap: 8 }}>
                  {data.byPaymentMethod.map((payment, i) => (
                    <RankRow key={payment.label} rank={i + 1} name={payment.label} value={money(payment.revenueCents)} sub={`${payment.orders} pedido${payment.orders !== 1 ? "s" : ""}`} color="#2563eb" theme={theme} />
                  ))}
                  {data.byPaymentMethod.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
                </div>
              </Block>
            </div>

            <Block title={`Lista de Pedidos (${data.orders.length})`} theme={theme}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Nº", "Data", "Cliente", "Região", "Vendedor", "Pagamento", "Status", "Comissão", "Total"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td style={tdStyle(border)}>#{String(order.number).padStart(4, "0")}</td>
                        <td style={tdStyle(border)}>{fmtDate(order.issuedAt)}</td>
                        <td style={tdStyle(border)}>{order.clientName}</td>
                        <td style={tdStyle(border)}>{order.regionName}</td>
                        <td style={tdStyle(border)}>{order.sellerName ?? "—"}</td>
                        <td style={tdStyle(border)}>{order.paymentMethodLabel}</td>
                        <td style={tdStyle(border)}>{order.statusLabel}</td>
                        <td style={tdStyle(border)}>{money(order.commissionCents)}</td>
                        <td style={{ ...tdStyle(border), fontWeight: 900 }}>{money(order.totalCents)}</td>
                      </tr>
                    ))}
                    {data.orders.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: 18, color: muted, textAlign: "center" }}>Nenhum pedido encontrado no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Block>
          </>
        )}
      </div>
    </div>
  );
}

function inputStyle(isDark: boolean, border: string, color: string): React.CSSProperties {
  return {
    width: "100%",
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: "11px 12px",
    background: isDark ? "#020617" : "#ffffff",
    color,
    outline: "none",
  };
}

function summaryLineStyle(background: string, border: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 14px",
    border: `1px solid ${border}`,
    borderRadius: 12,
    background,
  };
}

function tdStyle(border: string): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderBottom: `1px solid ${border}`,
    whiteSpace: "nowrap",
  };
}
