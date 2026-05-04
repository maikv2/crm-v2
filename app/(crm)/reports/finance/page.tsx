"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import { DollarSign, ArrowLeft, TrendingUp, TrendingDown, ArrowRightLeft, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FinanceReport = {
  period: { from: string; to: string };
  summary: {
    totalIncomeCents: number;
    totalIncome: number;
    totalExpenseCents: number;
    totalExpense: number;
    netCents: number;
    net: number;
    paidIncomeCents: number;
    paidIncome: number;
    paidExpenseCents: number;
    paidExpense: number;
    transactionCount: number;
  };
  receivables: {
    totalCents: number;
    receivedCents: number;
    pendingCents: number;
    overdueCents: number;
    count: number;
  };
  transfers: {
    totalCents: number;
    confirmedCents: number;
    pendingCents: number;
    count: number;
  };
  byCategory: Array<{ label: string; type: string; totalCents: number; count: number }>;
  byRegion: Array<{ id: string; name: string; incomeCents: number; expenseCents: number }>;
  byPaymentMethod: Array<{ label: string; totalCents: number; count: number }>;
  byDay: Array<{ date: string; incomeCents: number; expenseCents: number }>;
  transactions: Array<{
    id: string;
    type: string;
    categoryLabel: string;
    description: string;
    amountCents: number;
    status: string;
    regionName: string | null;
    orderNumber: number | null;
    dueDate: string | null;
    paidAt: string | null;
    createdAt: string;
    notes: string | null;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} → ${fmtDate(to)}`;
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

function StatCard({ icon: Icon, iconBg, iconFg, label, value, sub, accent, theme }: {
  icon: any; iconBg: string; iconFg: string; label: string; value: string; sub?: string; accent?: string; theme: Theme;
}) {
  const isDark = theme.isDark;
  return (
    <div style={{ background: isDark ? "#0f172a" : "#ffffff", border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`, borderRadius: 16, padding: 20, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: iconBg, color: iconFg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={20} /></div>
      <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ?? theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
    </div>
  );
}

function DualBarChart({ data, theme }: {
  data: Array<{ date: string; incomeCents: number; expenseCents: number }>;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const max = Math.max(...data.flatMap((d) => [d.incomeCents, d.expenseCents]), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160, paddingTop: 8 }}>
      {data.map((item, i) => {
        const hIn = Math.max(4, (item.incomeCents / max) * 130);
        const hOut = Math.max(4, (item.expenseCents / max) * 130);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%" }}>
              <div style={{ flex: 1, maxWidth: 14, height: hIn, borderRadius: 4, background: "#16a34a" }} />
              <div style={{ flex: 1, maxWidth: 14, height: hOut, borderRadius: 4, background: "#dc2626" }} />
            </div>
            <div style={{ fontSize: 10, color: muted }}>{item.date.slice(8)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsFinancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const isDark = theme.isDark;
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const subtle = isDark ? "#0b1324" : "#f8fafc";

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [data, setData] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from || !to) return;
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/reports/finance?from=${from}&to=${to}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (active) setData(json);
      } catch {
        if (active) setError("Não foi possível carregar o relatório financeiro.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [from, to]);

  if (loading) return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>Carregando relatório...</div>;
  if (error || !data) return <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontWeight: 700 }}>{error ?? "Erro."}</div>;

  const { summary, receivables, transfers } = data;
  const netPositive = summary.netCents >= 0;

  return (
    <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.push(`/reports?from=${from}&to=${to}`)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontWeight: 700, fontSize: 13, marginBottom: 10, padding: 0 }}>
          <ArrowLeft size={14} /> Voltar para Relatórios
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Relatório Financeiro</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{fmtPeriod(data.period.from, data.period.to)}</div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon={TrendingUp} iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"} iconFg="#16a34a" label="Total de Receitas" value={money(summary.totalIncomeCents)} sub={`Pago: ${money(summary.paidIncomeCents)}`} theme={theme} />
        <StatCard icon={TrendingDown} iconBg={isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"} iconFg="#dc2626" label="Total de Despesas" value={money(summary.totalExpenseCents)} sub={`Pago: ${money(summary.paidExpenseCents)}`} theme={theme} />
        <StatCard icon={DollarSign} iconBg={netPositive ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(239,68,68,0.15)" : "#fef2f2")} iconFg={netPositive ? "#16a34a" : "#dc2626"} label="Resultado Líquido" value={money(summary.netCents)} accent={netPositive ? "#16a34a" : "#dc2626"} theme={theme} />
        <StatCard icon={FileText} iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"} iconFg="#2563eb" label="Lançamentos" value={String(summary.transactionCount)} theme={theme} />
      </div>

      {/* Receivables + Transfers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Contas a Receber no Período" theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Total gerado", value: money(receivables.totalCents), color: theme.text },
              { label: "Recebido", value: money(receivables.receivedCents), color: "#16a34a" },
              { label: "Pendente", value: money(receivables.pendingCents), color: "#ea580c" },
              { label: "Vencido", value: money(receivables.overdueCents), color: "#dc2626" },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Repasses no Período" theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Total", value: money(transfers.totalCents), color: theme.text },
              { label: "Confirmados", value: money(transfers.confirmedCents), color: "#16a34a" },
              { label: "Pendentes", value: money(transfers.pendingCents), color: "#ea580c" },
              { label: "Quantidade", value: `${transfers.count} repasse${transfers.count !== 1 ? "s" : ""}`, color: theme.text },
            ].map((item) => (
              <div key={item.label} style={{ padding: 14, border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Block>
      </div>

      {/* Chart + by category */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Fluxo de Caixa por Dia" theme={theme}>
          {data.byDay.length > 0 ? (
            <>
              <DualBarChart data={data.byDay} theme={theme} />
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: muted }}>
                <span>● <span style={{ color: "#16a34a" }}>Receitas</span></span>
                <span>● <span style={{ color: "#dc2626" }}>Despesas</span></span>
              </div>
            </>
          ) : (
            <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "32px 0" }}>Sem lançamentos no período</div>
          )}
        </Block>

        <Block title="Por Categoria" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byCategory.map((c) => (
              <div key={`${c.label}-${c.type}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{c.label}</div>
                  <div style={{ fontSize: 12, color: muted }}>{c.type === "INCOME" ? "Receita" : "Despesa"} · {c.count} lançamento{c.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: c.type === "INCOME" ? "#16a34a" : "#dc2626", whiteSpace: "nowrap" }}>
                  {c.type === "INCOME" ? "+" : "-"}{money(c.totalCents)}
                </div>
              </div>
            ))}
            {data.byCategory.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      {/* By region + by payment method */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <Block title="Por Região" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byRegion.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{r.name}</div>
                <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
                  <span style={{ color: "#16a34a", fontWeight: 700 }}>+{money(r.incomeCents)}</span>
                  <span style={{ color: "#dc2626", fontWeight: 700 }}>-{money(r.expenseCents)}</span>
                </div>
              </div>
            ))}
            {data.byRegion.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados por região</div>}
          </div>
        </Block>

        <Block title="Por Forma de Pagamento" theme={theme}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.byPaymentMethod.map((p) => (
              <div key={p.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: muted }}>{p.count} lançamento{p.count !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>{money(p.totalCents)}</div>
              </div>
            ))}
            {data.byPaymentMethod.length === 0 && <div style={{ color: muted, fontSize: 13 }}>Sem dados</div>}
          </div>
        </Block>
      </div>

      {/* Transactions table */}
      <Block title={`Lançamentos (${data.transactions.length})`} theme={theme}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Data", "Tipo", "Categoria", "Descrição", "Região", "Vencimento", "Status", "Valor"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${border}` }}>
                  <td style={{ padding: "10px 12px", color: muted, whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: t.type === "INCOME" ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"), color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "INCOME" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: muted }}>{t.categoryLabel}</td>
                  <td style={{ padding: "10px 12px", color: theme.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                  <td style={{ padding: "10px 12px", color: muted }}>{t.regionName ?? "Matriz"}</td>
                  <td style={{ padding: "10px 12px", color: muted, whiteSpace: "nowrap" }}>{fmtDate(t.dueDate)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: t.status === "PAID" ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(249,115,22,0.14)" : "#fff7ed"), color: t.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                      {t.status === "PAID" ? "Pago" : "Pendente"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: t.type === "INCOME" ? "#16a34a" : "#dc2626", textAlign: "right", whiteSpace: "nowrap" }}>
                    {t.type === "INCOME" ? "+" : "-"}{money(t.amountCents)}
                  </td>
                </tr>
              ))}
              {data.transactions.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "24px 12px", textAlign: "center", color: muted }}>Nenhum lançamento no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
}
