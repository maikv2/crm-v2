"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  ChevronDown,
  Clock,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthlyRow = {
  id: string;
  representativeId: string;
  representative: string;
  regionId: string;
  region: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  commissionPercent: number;
  commissionCents: number;
  status: string;
  paidAt: string | null;
};

type SettlementRow = {
  id: string;
  representativeId: string | null;
  representative: string;
  regionId: string;
  region: string;
  weekStart: string;
  weekEnd: string;
  totalSalesPaidCents: number;
  totalCommissionGeneratedCents: number;
  matrixOwesRepresentativeCents: number;
  representativeOwesMatrixCents: number;
  netSettlementCents: number;
  status: string;
  closedAt: string | null;
};

type ConfirmationRow = {
  id: string;
  representative: string;
  region: string;
  weekStart: string;
  weekEnd: string;
  amountCents: number;
  pendingCents: number;
  confirmedAt: string | null;
  status: string;
  totalSalesCents: number | null;
  totalCommissionCents: number | null;
  payableCurrentWeekCents: number | null;
  payablePriorWeekCents: number | null;
};

type Summary = {
  totalGeneratedCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  totalConfirmedPaymentsCents: number;
  settlementsCount: number;
  repsCount: number;
};

type FilterOption = { id: string; name: string; region?: string | null };
type Report = {
  summary: Summary;
  monthly: MonthlyRow[];
  settlements: SettlementRow[];
  confirmations: ConfirmationRow[];
  filterOptions: {
    representatives: FilterOption[];
    regions: FilterOption[];
  };
};

type Theme = ReturnType<typeof getThemeColors>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(val: number) {
  return `${val.toFixed(2)}%`;
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-BR");
}

function fmtWeek(start: string, end: string) {
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    CANCELLED: "Cancelado",
    OPEN: "Aberto",
    CLOSED: "Fechado",
    PAID_BY_MATRIX: "Pago pela Matriz",
    TRANSFERRED_TO_MATRIX: "Transferido",
    SETTLED: "Liquidado",
  };
  return m[s] || s;
}

function statusColor(s: string) {
  if (s === "PAID" || s === "PAID_BY_MATRIX" || s === "SETTLED") return "#16a34a";
  if (s === "PENDING" || s === "OPEN") return "#f59e0b";
  if (s === "CANCELLED") return "#6b7280";
  return "#2563eb";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, theme }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; theme: Theme;
}) {
  return (
    <div style={{
      background: theme.cardBg,
      border: `1px solid ${theme.border}`,
      borderRadius: 18,
      padding: "18px 22px",
      display: "flex",
      gap: 16,
      alignItems: "flex-start",
      boxShadow: theme.isDark ? "0 8px 24px rgba(2,6,23,0.28)" : "0 6px 18px rgba(15,23,42,0.06)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: theme.isDark ? `${color}22` : `${color}18`,
        color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: theme.text, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: theme.subtext, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ title, count, theme }: { title: string; count?: number; theme: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: theme.text }}>{title}</div>
      {count !== undefined && (
        <div style={{
          borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800,
          background: theme.isDark ? "#111f39" : "#e8f0ff", color: "#2563eb",
        }}>{count}</div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{
      padding: "10px 14px", fontWeight: 800, fontSize: 12,
      textAlign: right ? "right" : "left", whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function Td({ children, right, muted, theme }: {
  children: React.ReactNode; right?: boolean; muted?: boolean; theme: Theme;
}) {
  return (
    <td style={{
      padding: "11px 14px", fontSize: 13,
      color: muted ? theme.subtext : theme.text,
      textAlign: right ? "right" : "left",
      verticalAlign: "middle",
    }}>
      {children}
    </td>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      borderRadius: 999, padding: "3px 10px",
      fontSize: 11, fontWeight: 800,
      background: `${color}22`, color,
    }}>
      {label}
    </span>
  );
}

function Select({ value, onChange, children, theme }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; theme: Theme;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 38, padding: "0 34px 0 12px", borderRadius: 10,
          border: `1px solid ${theme.border}`, background: theme.cardBg,
          color: theme.text, fontWeight: 700, fontSize: 13,
          appearance: "none", cursor: "pointer", outline: "none",
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{ position: "absolute", right: 10, color: theme.subtext, pointerEvents: "none" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "monthly" | "settlements" | "payments";

export default function CommissionsReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("monthly");

  const [filterRep, setFilterRep] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        const res = await fetch(`/api/reports/commissions?${params}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Erro ao carregar.");
        if (active) setData(json);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [from, to]);

  const periodLabel = useMemo(() => {
    if (from && to) return `${fmtDate(from + "T00:00:00")} – ${fmtDate(to + "T00:00:00")}`;
    return "Período atual";
  }, [from, to]);

  const filteredMonthly = useMemo(() => {
    if (!data) return [];
    return data.monthly.filter((r) => {
      if (filterRep !== "all" && r.representativeId !== filterRep) return false;
      if (filterRegion !== "all" && r.regionId !== filterRegion) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [data, filterRep, filterRegion, filterStatus]);

  const filteredSettlements = useMemo(() => {
    if (!data) return [];
    return data.settlements.filter((r) => {
      if (filterRep !== "all" && r.representativeId !== filterRep) return false;
      if (filterRegion !== "all" && r.regionId !== filterRegion) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      return true;
    });
  }, [data, filterRep, filterRegion, filterStatus]);

  const filteredConfirmations = useMemo(() => {
    if (!data) return [];
    return data.confirmations.filter((r) => {
      const rep = data.filterOptions.representatives.find((x) => x.name === r.representative);
      const region = data.filterOptions.regions.find((x) => x.name === r.region);
      if (filterRep !== "all" && rep?.id !== filterRep) return false;
      if (filterRegion !== "all" && region?.id !== filterRegion) return false;
      return true;
    });
  }, [data, filterRep, filterRegion]);

  const monthlyTotals = useMemo(() => filteredMonthly.reduce((acc, r) => ({
    gross: acc.gross + r.grossRevenueCents,
    commission: acc.commission + r.commissionCents,
    paid: acc.paid + (r.status === "PAID" ? r.commissionCents : 0),
    pending: acc.pending + (r.status === "PENDING" ? r.commissionCents : 0),
  }), { gross: 0, commission: 0, paid: 0, pending: 0 }), [filteredMonthly]);

  const settlementTotals = useMemo(() => filteredSettlements.reduce((acc, r) => ({
    salesPaid: acc.salesPaid + r.totalSalesPaidCents,
    commissionGenerated: acc.commissionGenerated + r.totalCommissionGeneratedCents,
    matrixOwes: acc.matrixOwes + r.matrixOwesRepresentativeCents,
    repOwes: acc.repOwes + r.representativeOwesMatrixCents,
    net: acc.net + r.netSettlementCents,
  }), { salesPaid: 0, commissionGenerated: 0, matrixOwes: 0, repOwes: 0, net: 0 }), [filteredSettlements]);

  const isDark = theme.isDark;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const border = theme.border;
  const cardBg = theme.cardBg;
  const subtleBg = isDark ? "#0b1324" : "#f8fafc";
  const theadBg = isDark ? "#0f172a" : "#f1f5f9";

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "monthly", label: "Comissões mensais", count: filteredMonthly.length },
    { id: "settlements", label: "Acertos semanais", count: filteredSettlements.length },
    { id: "payments", label: "Pagamentos confirmados", count: filteredConfirmations.length },
  ];

  return (
    <div style={{ background: pageBg, minHeight: "100vh", padding: 28, color: theme.text }}>
      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: muted, marginBottom: 10 }}>
          🏠 / Relatórios / Comissões
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: isDark ? "rgba(245,158,11,0.18)" : "#fef9e7",
              color: "#d97706",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BadgeDollarSign size={22} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Relatório de Comissões</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 3 }}>{periodLabel}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              height: 40, padding: "0 16px", borderRadius: 12,
              border: `1px solid ${border}`, background: cardBg,
              color: theme.text, fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={15} /> Voltar
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: muted, fontWeight: 700 }}>
          Carregando relatório...
        </div>
      ) : error ? (
        <div style={{
          background: cardBg, border: `1px solid ${border}`, borderRadius: 18, padding: 32, textAlign: "center",
          color: "#dc2626", fontWeight: 700,
        }}>
          {error}
        </div>
      ) : !data ? null : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 26 }}>
            <StatCard
              label="Total gerado (comissões)"
              value={money(data.summary.totalGeneratedCents)}
              sub={`${data.summary.repsCount} representante(s)`}
              icon={TrendingUp} color="#d97706" theme={theme}
            />
            <StatCard
              label="Total pago"
              value={money(data.summary.totalPaidCents)}
              sub="Registros com status Pago"
              icon={CheckCircle2} color="#16a34a" theme={theme}
            />
            <StatCard
              label="Total pendente"
              value={money(data.summary.totalPendingCents)}
              sub="Aguardando pagamento"
              icon={Clock} color="#f59e0b" theme={theme}
            />
            <StatCard
              label="Pagamentos confirmados"
              value={money(data.summary.totalConfirmedPaymentsCents)}
              sub={`${filteredConfirmations.length} confirmações no período`}
              icon={Wallet} color="#2563eb" theme={theme}
            />
            <StatCard
              label="Acertos semanais"
              value={String(data.summary.settlementsCount)}
              sub="Fechamentos no período"
              icon={Users} color="#7c3aed" theme={theme}
            />
            <StatCard
              label="Comissões mensais"
              value={String(data.monthly.length)}
              sub="Registros no período"
              icon={BadgeDollarSign} color="#0ea5e9" theme={theme}
            />
          </div>

          {/* Filters */}
          <div style={{
            background: cardBg, border: `1px solid ${border}`, borderRadius: 16,
            padding: "14px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: muted }}>Filtrar:</span>
            <Select value={filterRep} onChange={setFilterRep} theme={theme}>
              <option value="all">Todos os representantes</option>
              {data.filterOptions.representatives.map((r) => (
                <option key={r.id} value={r.id}>{r.name}{r.region ? ` (${r.region})` : ""}</option>
              ))}
            </Select>
            <Select value={filterRegion} onChange={setFilterRegion} theme={theme}>
              <option value="all">Todas as regiões</option>
              {data.filterOptions.regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
            <Select value={filterStatus} onChange={setFilterStatus} theme={theme}>
              <option value="all">Todos os status</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </Select>
            {(filterRep !== "all" || filterRegion !== "all" || filterStatus !== "all") && (
              <button
                type="button"
                onClick={() => { setFilterRep("all"); setFilterRegion("all"); setFilterStatus("all"); }}
                style={{
                  height: 38, padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: `1px solid ${border}`, background: "transparent", color: muted, cursor: "pointer",
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  height: 40, padding: "0 16px", borderRadius: 12,
                  border: `1px solid ${tab === t.id ? "#2563eb" : border}`,
                  background: tab === t.id ? "#2563eb" : cardBg,
                  color: tab === t.id ? "#ffffff" : theme.text,
                  fontWeight: 800, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {t.label}
                <span style={{
                  borderRadius: 999, padding: "1px 8px", fontSize: 11,
                  background: tab === t.id ? "rgba(255,255,255,0.22)" : (isDark ? "#111f39" : "#e8f0ff"),
                  color: tab === t.id ? "#ffffff" : "#2563eb",
                  fontWeight: 900,
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Tab: Comissões mensais ── */}
          {tab === "monthly" && (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden" }}>
              <SectionTitle title="Comissões por representante / mês" count={filteredMonthly.length} theme={theme} />

              {/* Totals bar */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
                padding: "0 20px 16px",
              }}>
                {[
                  { label: "Faturamento bruto", value: money(monthlyTotals.gross) },
                  { label: "Comissão total", value: money(monthlyTotals.commission) },
                  { label: "Pago", value: money(monthlyTotals.paid), green: true },
                  { label: "Pendente", value: money(monthlyTotals.pending), orange: true },
                ].map((s) => (
                  <div key={s.label} style={{
                    borderRadius: 12, padding: "10px 14px",
                    background: subtleBg, border: `1px solid ${border}`,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 4 }}>{s.label}</div>
                    <div style={{
                      fontSize: 16, fontWeight: 900,
                      color: s.green ? "#16a34a" : s.orange ? "#d97706" : theme.text,
                    }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: theadBg, color: muted }}>
                      <Th>Representante</Th>
                      <Th>Região</Th>
                      <Th>Mês/Ano</Th>
                      <Th right>Faturamento bruto</Th>
                      <Th right>% Comissão</Th>
                      <Th right>Comissão gerada</Th>
                      <Th>Status</Th>
                      <Th>Pago em</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMonthly.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 32, textAlign: "center", color: muted, fontSize: 14 }}>
                          Nenhuma comissão encontrada para o período selecionado.
                        </td>
                      </tr>
                    ) : filteredMonthly.map((row, i) => (
                      <tr key={row.id} style={{
                        borderTop: `1px solid ${border}`,
                        background: i % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)"),
                      }}>
                        <Td theme={theme}><strong>{row.representative}</strong></Td>
                        <Td muted theme={theme}>{row.region}</Td>
                        <Td theme={theme}>{MONTH_NAMES[row.month - 1]}/{row.year}</Td>
                        <Td right theme={theme}>{money(row.grossRevenueCents)}</Td>
                        <Td right theme={theme}>{pct(row.commissionPercent)}</Td>
                        <Td right theme={theme}><strong>{money(row.commissionCents)}</strong></Td>
                        <Td theme={theme}><Badge label={statusLabel(row.status)} color={statusColor(row.status)} /></Td>
                        <Td muted theme={theme}>{row.paidAt ? fmtDate(row.paidAt) : "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Acertos semanais ── */}
          {tab === "settlements" && (
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "20px 20px 0" }}>
                <SectionTitle title="Acertos semanais" count={filteredSettlements.length} theme={theme} />

                {/* Totals bar */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Vendas pagas", value: money(settlementTotals.salesPaid) },
                    { label: "Comissão gerada", value: money(settlementTotals.commissionGenerated) },
                    { label: "Matriz deve ao rep.", value: money(settlementTotals.matrixOwes), green: true },
                    { label: "Rep. deve à matriz", value: money(settlementTotals.repOwes), red: true },
                    { label: "Saldo líquido", value: money(settlementTotals.net), bold: true },
                  ].map((s) => (
                    <div key={s.label} style={{
                      borderRadius: 12, padding: "10px 14px",
                      background: subtleBg, border: `1px solid ${border}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 4 }}>{s.label}</div>
                      <div style={{
                        fontSize: 15, fontWeight: s.bold ? 900 : 800,
                        color: s.green ? "#16a34a" : s.red ? "#dc2626" : theme.text,
                      }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: theadBg, color: muted }}>
                      <Th>Representante</Th>
                      <Th>Região</Th>
                      <Th>Semana</Th>
                      <Th right>Vendas pagas</Th>
                      <Th right>Comissão gerada</Th>
                      <Th right>Matriz → Rep.</Th>
                      <Th right>Rep. → Matriz</Th>
                      <Th right>Saldo líquido</Th>
                      <Th>Status</Th>
                      <Th>Fechado em</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: 32, textAlign: "center", color: muted, fontSize: 14 }}>
                          Nenhum acerto encontrado para o período selecionado.
                        </td>
                      </tr>
                    ) : filteredSettlements.map((row, i) => (
                      <tr key={row.id} style={{
                        borderTop: `1px solid ${border}`,
                        background: i % 2 === 0 ? "transparent" : (isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)"),
                      }}>
                        <Td theme={theme}><strong>{row.representative}</strong></Td>
                        <Td muted theme={theme}>{row.region}</Td>
                        <Td theme={theme} muted>{fmtWeek(row.weekStart, row.weekEnd)}</Td>
                        <Td right theme={theme}>{money(row.totalSalesPaidCents)}</Td>
                        <Td right theme={theme}>{money(row.totalCommissionGeneratedCents)}</Td>
                        <Td right theme={theme}>
                          <span style={{ color: row.matrixOwesRepresentativeCents > 0 ? "#16a34a" : theme.subtext }}>
                            {money(row.matrixOwesRepresentativeCents)}
                          </span>
                        </Td>
                        <Td right theme={theme}>
                          <span style={{ color: row.representativeOwesMatrixCents > 0 ? "#dc2626" : theme.subtext }}>
                            {money(row.representativeOwesMatrixCents)}
                          </span>
                        </Td>
                        <Td right theme={theme}>
                          <strong style={{ color: row.netSettlementCents >= 0 ? "#16a34a" : "#dc2626" }}>
                            {money(row.netSettlementCents)}
                          </strong>
                        </Td>
                        <Td theme={theme}><Badge label={statusLabel(row.status)} color={statusColor(row.status)} /></Td>
                        <Td muted theme={theme}>{row.closedAt ? fmtDate(row.closedAt) : "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: Pagamentos confirmados ── */}
          {tab === "payments" && (
            <div>
              {/* Totals bar */}
              <div style={{
                background: cardBg, border: `1px solid ${border}`, borderRadius: 16,
                padding: "14px 20px", marginBottom: 18,
                display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 3 }}>Total pago no período</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#16a34a" }}>
                    {money(filteredConfirmations.reduce((s, c) => s + c.amountCents, 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 3 }}>Da semana de referência</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1e40af" }}>
                    {money(filteredConfirmations.reduce((s, c) => s + (c.payableCurrentWeekCents ?? 0), 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 3 }}>De semanas anteriores</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#7e22ce" }}>
                    {money(filteredConfirmations.reduce((s, c) => s + (c.payablePriorWeekCents ?? 0), 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 3 }}>Migrado p/ próx. acerto</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>
                    {money(filteredConfirmations.reduce((s, c) => s + (c.pendingCents ?? 0), 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: muted, marginBottom: 3 }}>Confirmações</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: theme.text }}>{filteredConfirmations.length}</div>
                </div>
              </div>

              {filteredConfirmations.length === 0 ? (
                <div style={{
                  background: cardBg, border: `1px solid ${border}`, borderRadius: 18,
                  padding: 40, textAlign: "center", color: muted, fontSize: 14,
                }}>
                  Nenhum pagamento confirmado no período selecionado.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {filteredConfirmations.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        background: cardBg, border: `1px solid ${border}`, borderRadius: 18,
                        overflow: "hidden",
                      }}
                    >
                      {/* Card header */}
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                        padding: "16px 20px 12px", gap: 16, flexWrap: "wrap",
                        borderBottom: `1px solid ${border}`,
                      }}>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>{row.representative}</div>
                          <div style={{ fontSize: 13, color: muted, marginTop: 3 }}>
                            {row.region} · Semana {fmtWeek(row.weekStart, row.weekEnd)}
                          </div>
                          {row.confirmedAt && (
                            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                              Confirmado em {fmtDate(row.confirmedAt)}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 26, fontWeight: 900, color: "#16a34a" }}>
                            {money(row.amountCents)}
                          </div>
                          <div style={{ fontSize: 12, color: "#16a34a", marginTop: 1 }}>valor pago</div>
                          <div style={{ marginTop: 6 }}>
                            <Badge label={statusLabel(row.status)} color={statusColor(row.status)} />
                          </div>
                        </div>
                      </div>

                      {/* Breakdown grid */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 10, padding: "14px 20px",
                      }}>
                        {row.totalSalesCents != null && (
                          <div style={{ borderRadius: 12, padding: "10px 14px", background: subtleBg, border: `1px solid ${border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Total vendido considerado</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{money(row.totalSalesCents)}</div>
                          </div>
                        )}
                        {row.totalCommissionCents != null && (
                          <div style={{ borderRadius: 12, padding: "10px 14px", background: subtleBg, border: `1px solid ${border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Comissão total apurada</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: theme.text }}>{money(row.totalCommissionCents)}</div>
                          </div>
                        )}
                        {(row.payableCurrentWeekCents ?? 0) > 0 && (
                          <div style={{ borderRadius: 12, padding: "10px 14px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", marginBottom: 4 }}>Da semana de referência</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#1e40af" }}>{money(row.payableCurrentWeekCents!)}</div>
                          </div>
                        )}
                        {(row.payablePriorWeekCents ?? 0) > 0 && (
                          <div style={{ borderRadius: 12, padding: "10px 14px", background: "#faf5ff", border: "1px solid #e9d5ff" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#7e22ce", textTransform: "uppercase", marginBottom: 4 }}>De semanas anteriores</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#7e22ce" }}>{money(row.payablePriorWeekCents!)}</div>
                            <div style={{ fontSize: 10, color: "#a78bfa", marginTop: 2 }}>pendente de acertos anteriores</div>
                          </div>
                        )}
                        {(row.pendingCents ?? 0) > 0 && (
                          <div style={{ borderRadius: 12, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 4 }}>Ficou pendente</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#92400e" }}>{money(row.pendingCents)}</div>
                            <div style={{ fontSize: 10, color: "#b45309", marginTop: 2 }}>migrado para o próximo acerto</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
