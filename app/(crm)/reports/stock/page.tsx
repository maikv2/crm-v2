"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import { Boxes, ArrowLeft, ArrowDown, ArrowUp, ArrowRightLeft, Sliders } from "lucide-react";

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

// ─── Sub-components ───────────────────────────────────────────────────────────

type Theme = ReturnType<typeof getThemeColors>;

function Block({ title, children, theme }: { title: string; children: React.ReactNode; theme: Theme }) {
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

function StatCard({ icon: Icon, iconBg, iconFg, label, value, sub, theme }: {
  icon: any; iconBg: string; iconFg: string; label: string; value: string; sub?: string; theme: Theme;
}) {
  const isDark = theme.isDark;
  return (
    <div style={{
      background: isDark ? "#0f172a" : "#ffffff",
      border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
      borderRadius: 16,
      padding: 20,
      boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={20} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
    </div>
  );
}

function MovTypeLabel({ typeLabel, theme }: { typeLabel: string; theme: Theme }) {
  const isDark = theme.isDark;
  const map: Record<string, { bg: string; fg: string }> = {
    "Entrada":              { bg: isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef",  fg: "#16a34a" },
    "Saída":                { bg: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",   fg: "#dc2626" },
    "Transferência (Entrada)": { bg: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff", fg: "#2563eb" },
    "Transferência (Saída)":   { bg: isDark ? "rgba(124,58,237,0.18)" : "#f3ebff", fg: "#7c3aed" },
    "Ajuste":               { bg: isDark ? "rgba(249,115,22,0.14)" : "#fff1e8", fg: "#ea580c" },
  };
  const style = map[typeLabel] ?? { bg: isDark ? "#1e293b" : "#f1f5f9", fg: isDark ? "#94a3b8" : "#64748b" };
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: style.bg, color: style.fg, whiteSpace: "nowrap" }}>
      {typeLabel}
    </span>
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

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon={Boxes} iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"} iconFg="#7c3aed" label="Movimentações" value={String(summary.totalMovements)} theme={theme} />
        <StatCard icon={ArrowDown} iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"} iconFg="#16a34a" label="Entradas" value={String(summary.totalIn)} sub={`Transf. recebidas: ${summary.totalTransferIn}`} theme={theme} />
        <StatCard icon={ArrowUp} iconBg={isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"} iconFg="#dc2626" label="Saídas" value={String(summary.totalOut)} sub={`Transf. enviadas: ${summary.totalTransferOut}`} theme={theme} />
        <StatCard icon={Sliders} iconBg={isDark ? "rgba(249,115,22,0.14)" : "#fff1e8"} iconFg="#ea580c" label="Valor em Estoque" value={money(totalValueCents)} theme={theme} />
      </div>

      {/* By product movements + by location */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Produtos com Mais Movimentação" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byProductMovements.slice(0, 10).map((p, i) => {
              const isDarkT = isDark;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: isDarkT ? "#0b1324" : "#f8fafc", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: isDarkT ? "rgba(124,58,237,0.18)" : "#f3ebff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{i + 1}</div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{p.name}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
                    <span style={{ color: "#16a34a", fontWeight: 700 }}>+{p.in}</span>
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>-{p.out}</span>
                    {p.transfers > 0 && <span style={{ color: "#2563eb", fontWeight: 700 }}>↔{p.transfers}</span>}
                  </div>
                </div>
              );
            })}
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
