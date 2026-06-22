"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  BookOpen,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  ShoppingCart,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountingReport = {
  period: { from: string; to: string };
  company: { tradeName: string; legalName: string | null; cnpj: string | null; taxRegime: string | null } | null;
  sales: {
    grossRevenueCents: number;
    discountTotalCents: number;
    netRevenueCents: number;
    orderCount: number;
    withNfeCount: number;
  };
  income: { totalCents: number; paidCents: number; count: number };
  expense: { totalCents: number; paidCents: number; taxCents: number; payrollCents: number; count: number };
  net: number;
  receivables: { totalCents: number; receivedCents: number; pendingCents: number; overdueCents: number; count: number };
  commissions: {
    totalCents: number;
    paidCents: number;
    pendingCents: number;
    count: number;
    list: Array<{
      id: string;
      representativeName: string;
      regionName: string;
      month: number;
      year: number;
      grossRevenueCents: number;
      commissionPercent: number;
      commissionCents: number;
      status: string;
      paidAt: string | null;
    }>;
  };
  distributions: { totalCents: number; paidCents: number; count: number };
  byCategory: Array<{ label: string; type: string; totalCents: number; paidCents: number; count: number }>;
  byPaymentMethod: Array<{ label: string; totalCents: number; count: number }>;
  transactions: Array<{
    id: string;
    type: string;
    category: string;
    categoryLabel: string;
    description: string;
    amountCents: number;
    status: string;
    paymentMethod: string | null;
    regionName: string | null;
    dueDate: string | null;
    paidAt: string | null;
    createdAt: string;
    notes: string | null;
  }>;
  orders: Array<{
    id: string;
    number: number;
    issuedAt: string;
    clientName: string;
    clientDocument: string | null;
    regionName: string;
    sellerName: string | null;
    totalCents: number;
    discountCents: number;
    paymentMethod: string;
    paymentStatus: string;
    nfeNumber: string | null;
    nfeStatus: string | null;
  }>;
};

// ─── Period helpers ───────────────────────────────────────────────────────────

type PeriodMode = "month" | "custom";
type DateRange = { start: Date | null; end: Date | null };

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatMonthYear(year: number, month: number) {
  return `${MONTH_NAMES[month]} de ${year}`;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isInRange(date: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  year, month, range, onDayClick, onPrev, onNext, theme,
}: {
  year: number; month: number; range: DateRange;
  onDayClick: (d: Date) => void; onPrev: () => void; onNext: () => void;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const isDark = theme.isDark;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const calBg = isDark ? "#0f172a" : "#ffffff";
  const hoverBg = isDark ? "#1e293b" : "#eff6ff";
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: calBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18, width: 272, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.45)" : "0 8px 24px rgba(15,23,42,0.10)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={onPrev} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, borderRadius: 8, display: "flex", alignItems: "center" }}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 800, fontSize: 13, color: theme.text }}>{formatMonthYear(year, month)}</span>
        <button onClick={onNext} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, borderRadius: 8, display: "flex", alignItems: "center" }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {WEEKDAY_NAMES.map((d) => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: muted }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const date = new Date(year, month, day);
          const isStart = range.start ? isSameDay(date, range.start) : false;
          const isEnd = range.end ? isSameDay(date, range.end) : false;
          const inRange = isInRange(date, range.start, range.end);
          const isSelected = isStart || isEnd;
          return (
            <button
              key={day}
              onClick={() => onDayClick(date)}
              style={{
                background: isSelected ? "#6366f1" : inRange ? (isDark ? "rgba(99,102,241,0.18)" : "#eef2ff") : "transparent",
                color: isSelected ? "#fff" : theme.text,
                border: "none",
                borderRadius: isStart ? "8px 0 0 8px" : isEnd ? "0 8px 8px 0" : inRange ? "0" : 8,
                padding: "5px 0", cursor: "pointer", fontWeight: isSelected ? 800 : 500, fontSize: 12, textAlign: "center",
              }}
              onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = hoverBg; }}
              onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = inRange ? (isDark ? "rgba(99,102,241,0.18)" : "#eef2ff") : "transparent"; }}
            >{day}</button>
          );
        })}
      </div>
    </div>
  );
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} a ${fmtDate(to)}`;
}

function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Theme = ReturnType<typeof getThemeColors>;

function Block({ title, children, theme }: { title: string; children: React.ReactNode; theme: Theme }) {
  const isDark = theme.isDark;
  return (
    <div
      className="accounting-block"
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: theme.text, marginBottom: 16 }}>{title}</div>
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
  accent,
  theme,
}: {
  icon: any;
  iconBg: string;
  iconFg: string;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  theme: Theme;
}) {
  const isDark = theme.isDark;
  return (
    <div
      style={{
        background: isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
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
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: accent ?? theme.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{sub}</div>}
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportCSV(data: AccountingReport, period: string) {
  const rows: string[][] = [];

  rows.push([`RELATÓRIO CONTÁBIL - ${period}`]);
  rows.push([`Empresa: ${data.company?.tradeName ?? "—"}`]);
  rows.push([`CNPJ: ${data.company?.cnpj ?? "—"}`]);
  rows.push([`Regime Tributário: ${data.company?.taxRegime ?? "—"}`]);
  rows.push([]);

  rows.push(["=== RESUMO ==="]);
  rows.push(["Item", "Valor"]);
  rows.push(["Faturamento Bruto (Vendas)", money(data.sales.grossRevenueCents)]);
  rows.push(["Descontos Concedidos", money(data.sales.discountTotalCents)]);
  rows.push(["Total de Receitas (Lançamentos)", money(data.income.totalCents)]);
  rows.push(["Total de Despesas (Lançamentos)", money(data.expense.totalCents)]);
  rows.push(["Impostos e Taxas", money(data.expense.taxCents)]);
  rows.push(["Comissões de Representantes", money(data.commissions.totalCents)]);
  rows.push(["Distribuições a Investidores", money(data.distributions.totalCents)]);
  rows.push(["Resultado Líquido", money(data.net)]);
  rows.push([]);

  rows.push(["=== RECEITAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "INCOME")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), String(c.count)]);
  }
  rows.push([]);

  rows.push(["=== DESPESAS POR CATEGORIA ==="]);
  rows.push(["Categoria", "Total", "Pago", "Qtd"]);
  for (const c of data.byCategory.filter((c) => c.type === "EXPENSE")) {
    rows.push([c.label, money(c.totalCents), money(c.paidCents), String(c.count)]);
  }
  rows.push([]);

  rows.push(["=== LANÇAMENTOS FINANCEIROS ==="]);
  rows.push(["Data", "Tipo", "Categoria", "Descrição", "Região", "Status", "Valor"]);
  for (const t of data.transactions) {
    rows.push([
      fmtDate(t.createdAt),
      t.type === "INCOME" ? "Receita" : "Despesa",
      t.categoryLabel,
      t.description,
      t.regionName ?? "Matriz",
      t.status === "PAID" ? "Pago" : "Pendente",
      (t.type === "INCOME" ? "+" : "-") + money(t.amountCents),
    ]);
  }
  rows.push([]);

  rows.push(["=== COMISSÕES DE REPRESENTANTES ==="]);
  rows.push(["Representante", "Região", "Mês/Ano", "Faturamento", "% Comissão", "Comissão", "Status"]);
  for (const c of data.commissions.list) {
    rows.push([
      c.representativeName,
      c.regionName,
      monthLabel(c.month, c.year),
      money(c.grossRevenueCents),
      `${c.commissionPercent}%`,
      money(c.commissionCents),
      c.status === "PAID" ? "Pago" : "Pendente",
    ]);
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-contabil-${period.replace(/[^a-z0-9]/gi, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsAccountingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const isDark = theme.isDark;
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const subtle = isDark ? "#0b1324" : "#f8fafc";
  const cardBg = isDark ? "#0f172a" : "#ffffff";

  // ── Period state ─────────────────────────────────────────────────────────────
  const initFrom = searchParams.get("from");
  const initTo = searchParams.get("to");

  const today = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(
    initFrom ? new Date(initFrom).getMonth() : today.getMonth()
  );
  const [selectedYear, setSelectedYear] = useState(
    initFrom ? new Date(initFrom).getFullYear() : today.getFullYear()
  );
  const [range, setRange] = useState<DateRange>({
    start: initFrom ? new Date(initFrom) : null,
    end: initTo ? new Date(initTo) : null,
  });
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [showCal, setShowCal] = useState(false);

  function getQueryDates(): { from: string; to: string } | null {
    if (periodMode === "month") {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
    }
    if (range.start && range.end) {
      return { from: range.start.toISOString().split("T")[0], to: range.end.toISOString().split("T")[0] };
    }
    return null;
  }

  const periodReady = periodMode === "month" || (range.start !== null && range.end !== null);
  const dates = getQueryDates();
  const from = dates?.from ?? "";
  const to = dates?.to ?? "";

  function getPeriodLabel() {
    if (periodMode === "month") return formatMonthYear(selectedYear, selectedMonth);
    if (range.start && range.end) return `${range.start.toLocaleDateString("pt-BR")} → ${range.end.toLocaleDateString("pt-BR")}`;
    if (range.start) return `${range.start.toLocaleDateString("pt-BR")} → ...`;
    return "Selecione o período";
  }

  function handleDayClick(date: Date) {
    if (!range.start || (range.start && range.end)) {
      setRange({ start: date, end: null });
    } else {
      setRange(date < range.start ? { start: date, end: range.start } : { start: range.start, end: date });
      setShowCal(false);
    }
  }

  function prevCalMonth() { calMonth === 0 ? (setCalMonth(11), setCalYear((y) => y - 1)) : setCalMonth((m) => m - 1); }
  function nextCalMonth() { calMonth === 11 ? (setCalMonth(0), setCalYear((y) => y + 1)) : setCalMonth((m) => m + 1); }
  function prevMonth() { selectedMonth === 0 ? (setSelectedMonth(11), setSelectedYear((y) => y - 1)) : setSelectedMonth((m) => m - 1); }
  function nextMonth() { selectedMonth === 11 ? (setSelectedMonth(0), setSelectedYear((y) => y + 1)) : setSelectedMonth((m) => m + 1); }

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const [data, setData] = useState<AccountingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (f: string, t: string) => {
    let active = true;
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const res = await fetch(`/api/reports/accounting?from=${f}&to=${t}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      if (active) setData(json);
    } catch {
      if (active) setError("Não foi possível carregar o relatório contábil.");
    } finally {
      if (active) setLoading(false);
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (from && to) loadReport(from, to);
  }, [from, to, loadReport]);

  const netPositive = (data?.net ?? 0) >= 0;
  const periodLabel = data ? fmtPeriod(data.period.from, data.period.to) : getPeriodLabel();
  const incomeCategories = data?.byCategory.filter((c) => c.type === "INCOME") ?? [];
  const expenseCategories = data?.byCategory.filter((c) => c.type === "EXPENSE") ?? [];

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .accounting-block { break-inside: avoid; box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          body { background: white !important; }
        }
      `}</style>

      <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <button
            className="no-print"
            onClick={() => router.push("/reports")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontWeight: 700, fontSize: 13, marginBottom: 10, padding: 0 }}
          >
            <ArrowLeft size={14} /> Voltar para Relatórios
          </button>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Relatório Contábil</div>
                <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                  {data?.company ? `${data.company.tradeName} · ` : ""}Selecione o período e clique em Gerar
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="no-print" style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              {data && (
                <>
                  <button
                    onClick={() => exportCSV(data, periodLabel)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1px solid ${border}`, background: cardBg, color: theme.text, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                  >
                    <FileSpreadsheet size={15} color="#16a34a" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => window.open(`/print/accounting?from=${from}&to=${to}`, "_blank", "width=1000,height=800")}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "#ffffff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                  >
                    <Download size={15} />
                    Baixar PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div
          className="no-print"
          style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 18, padding: 22, marginBottom: 24, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: theme.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={17} color="#6366f1" />
            Período do Relatório
          </div>

          {/* Mode toggle */}
          <div style={{ display: "inline-flex", background: isDark ? "#0b1324" : "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 18 }}>
            {(["month", "custom"] as PeriodMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setPeriodMode(m); setShowCal(false); }}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, background: periodMode === m ? "#6366f1" : "transparent", color: periodMode === m ? "#ffffff" : muted, transition: "all 0.15s ease" }}
              >
                {m === "month" ? "Por Mês" : "Por Período"}
              </button>
            ))}
          </div>

          {/* Month selector */}
          {periodMode === "month" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={prevMonth} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, background: cardBg, color: theme.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronLeft size={15} />
              </button>
              <div style={{ padding: "8px 24px", borderRadius: 10, border: `1px solid ${border}`, background: isDark ? "#0b1324" : "#f8fafc", fontWeight: 800, fontSize: 14, color: theme.text, minWidth: 200, textAlign: "center" }}>
                {formatMonthYear(selectedYear, selectedMonth)}
              </div>
              <button onClick={nextMonth} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${border}`, background: cardBg, color: theme.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Custom range */}
          {periodMode === "custom" && (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setShowCal(!showCal)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: `1px solid ${showCal ? "#6366f1" : border}`, background: isDark ? "#0b1324" : "#f8fafc", color: theme.text, cursor: "pointer", fontWeight: 700, fontSize: 13 }}
                >
                  <CalendarDays size={15} color="#6366f1" />
                  {range.start && range.end
                    ? `${range.start.toLocaleDateString("pt-BR")} → ${range.end.toLocaleDateString("pt-BR")}`
                    : range.start
                    ? `${range.start.toLocaleDateString("pt-BR")} → ...`
                    : "Selecione as datas"}
                </button>
                {range.start && range.end && (
                  <button onClick={() => setRange({ start: null, end: null })} style={{ padding: "7px 12px", borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: muted, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                    Limpar
                  </button>
                )}
              </div>
              {showCal && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100 }}>
                  <MiniCalendar year={calYear} month={calMonth} range={range} onDayClick={handleDayClick} onPrev={prevCalMonth} onNext={nextCalMonth} theme={theme} />
                  {range.start && !range.end && (
                    <div style={{ marginTop: 6, fontSize: 12, color: muted, fontWeight: 600, textAlign: "center" }}>
                      Agora clique na data final
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generate button */}
          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              disabled={!periodReady}
              onClick={() => { if (from && to) loadReport(from, to); }}
              style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: periodReady ? "#6366f1" : (isDark ? "#1e293b" : "#e5e7eb"), color: periodReady ? "#ffffff" : muted, cursor: periodReady ? "pointer" : "not-allowed", fontWeight: 800, fontSize: 14, transition: "all 0.15s ease" }}
            >
              {loading ? "Gerando..." : "Gerar Relatório"}
            </button>
            {data && !loading && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                ✓ {periodLabel}
              </span>
            )}
          </div>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted, fontWeight: 700 }}>
            Carregando relatório contábil...
          </div>
        )}
        {error && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#ef4444", fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Report content — only shown when data is loaded */}
        {!loading && !error && data && (<>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          <StatCard
            icon={ShoppingCart}
            iconBg={isDark ? "rgba(99,102,241,0.18)" : "#eef2ff"}
            iconFg="#6366f1"
            label="Faturamento Bruto (Vendas)"
            value={money(data.sales.grossRevenueCents)}
            sub={`${data.sales.orderCount} pedido${data.sales.orderCount !== 1 ? "s" : ""} · ${data.sales.withNfeCount} com NF`}
            theme={theme}
          />
          <StatCard
            icon={TrendingUp}
            iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"}
            iconFg="#16a34a"
            label="Total de Receitas"
            value={money(data.income.totalCents)}
            sub={`Pago: ${money(data.income.paidCents)}`}
            theme={theme}
          />
          <StatCard
            icon={TrendingDown}
            iconBg={isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"}
            iconFg="#dc2626"
            label="Total de Despesas"
            value={money(data.expense.totalCents)}
            sub={`Impostos: ${money(data.expense.taxCents)}`}
            theme={theme}
          />
          <StatCard
            icon={DollarSign}
            iconBg={netPositive ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(239,68,68,0.15)" : "#fef2f2")}
            iconFg={netPositive ? "#16a34a" : "#dc2626"}
            label="Resultado Líquido"
            value={money(data.net)}
            accent={netPositive ? "#16a34a" : "#dc2626"}
            theme={theme}
          />
        </div>

        {/* Secondary summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
          <StatCard
            icon={BarChart3}
            iconBg={isDark ? "rgba(249,115,22,0.14)" : "#fff7ed"}
            iconFg="#ea580c"
            label="Contas a Receber"
            value={money(data.receivables.totalCents)}
            sub={`Recebido: ${money(data.receivables.receivedCents)} · Vencido: ${money(data.receivables.overdueCents)}`}
            theme={theme}
          />
          <StatCard
            icon={Users}
            iconBg={isDark ? "rgba(245,158,11,0.18)" : "#fef9e7"}
            iconFg="#d97706"
            label="Comissões de Representantes"
            value={money(data.commissions.totalCents)}
            sub={`Pago: ${money(data.commissions.paidCents)} · Pendente: ${money(data.commissions.pendingCents)}`}
            theme={theme}
          />
          <StatCard
            icon={DollarSign}
            iconBg={isDark ? "rgba(139,92,246,0.18)" : "#f5f3ff"}
            iconFg="#8b5cf6"
            label="Distribuições a Investidores"
            value={money(data.distributions.totalCents)}
            sub={`Pago: ${money(data.distributions.paidCents)}`}
            theme={theme}
          />
        </div>

        {/* Receitas e Despesas por categoria */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <Block title="Receitas por Categoria" theme={theme}>
            {incomeCategories.length === 0 ? (
              <div style={{ color: muted, fontSize: 13 }}>Sem receitas no período</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Categoria", "Total", "Pago", "Qtd"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Qtd" || h === "Total" || h === "Pago" ? "right" : "left", padding: "6px 8px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incomeCategories.map((c) => (
                    <tr key={c.label} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "9px 8px", color: theme.text, fontWeight: 600 }}>{c.label}</td>
                      <td style={{ padding: "9px 8px", color: "#16a34a", fontWeight: 700, textAlign: "right" }}>{money(c.totalCents)}</td>
                      <td style={{ padding: "9px 8px", color: muted, textAlign: "right" }}>{money(c.paidCents)}</td>
                      <td style={{ padding: "9px 8px", color: muted, textAlign: "right" }}>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Block>

          <Block title="Despesas por Categoria" theme={theme}>
            {expenseCategories.length === 0 ? (
              <div style={{ color: muted, fontSize: 13 }}>Sem despesas no período</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Categoria", "Total", "Pago", "Qtd"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Qtd" || h === "Total" || h === "Pago" ? "right" : "left", padding: "6px 8px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenseCategories.map((c) => (
                    <tr key={c.label} style={{ borderBottom: `1px solid ${border}` }}>
                      <td style={{ padding: "9px 8px", color: theme.text, fontWeight: 600 }}>{c.label}</td>
                      <td style={{ padding: "9px 8px", color: "#dc2626", fontWeight: 700, textAlign: "right" }}>{money(c.totalCents)}</td>
                      <td style={{ padding: "9px 8px", color: muted, textAlign: "right" }}>{money(c.paidCents)}</td>
                      <td style={{ padding: "9px 8px", color: muted, textAlign: "right" }}>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Block>
        </div>

        {/* Contas a Receber detail */}
        <Block title="Contas a Receber no Período" theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "Total gerado", value: money(data.receivables.totalCents), color: theme.text },
              { label: "Recebido", value: money(data.receivables.receivedCents), color: "#16a34a" },
              { label: "Pendente", value: money(data.receivables.pendingCents), color: "#ea580c" },
              { label: "Vencido", value: money(data.receivables.overdueCents), color: "#dc2626" },
            ].map((item) => (
              <div key={item.label} style={{ padding: 16, border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Block>

        {/* Commissions */}
        {data.commissions.count > 0 && (
          <Block title={`Comissões de Representantes (${data.commissions.count})`} theme={theme}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total apurado", value: money(data.commissions.totalCents), color: theme.text },
                { label: "Pago", value: money(data.commissions.paidCents), color: "#16a34a" },
                { label: "Pendente", value: money(data.commissions.pendingCents), color: "#ea580c" },
              ].map((item) => (
                <div key={item.label} style={{ padding: 14, border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                  <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Representante", "Região", "Mês/Ano", "Faturamento", "% Comissão", "Comissão", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.commissions.list.map((c) => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "9px 10px", color: theme.text, fontWeight: 600 }}>{c.representativeName}</td>
                    <td style={{ padding: "9px 10px", color: muted }}>{c.regionName}</td>
                    <td style={{ padding: "9px 10px", color: muted, whiteSpace: "nowrap" }}>{monthLabel(c.month, c.year)}</td>
                    <td style={{ padding: "9px 10px", color: theme.text }}>{money(c.grossRevenueCents)}</td>
                    <td style={{ padding: "9px 10px", color: muted }}>{c.commissionPercent}%</td>
                    <td style={{ padding: "9px 10px", fontWeight: 700, color: "#d97706" }}>{money(c.commissionCents)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: c.status === "PAID" ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(249,115,22,0.14)" : "#fff7ed"), color: c.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                        {c.status === "PAID" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        )}

        {/* Formas de recebimento */}
        {data.byPaymentMethod.length > 0 && (
          <Block title="Receitas por Forma de Recebimento" theme={theme}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {data.byPaymentMethod.map((p) => (
                <div key={p.label} style={{ flex: "1 1 160px", padding: 16, border: `1px solid ${border}`, borderRadius: 12, background: subtle }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#16a34a" }}>{money(p.totalCents)}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{p.count} lançamento{p.count !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Full transactions table */}
        <Block title={`Todos os Lançamentos Financeiros (${data.transactions.length})`} theme={theme}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Data", "Tipo", "Categoria", "Descrição", "Região", "Forma", "Vencimento", "Status", "Valor"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: muted, fontWeight: 700, borderBottom: `1px solid ${border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td style={{ padding: "9px 10px", color: muted, whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: t.type === "INCOME" ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(239,68,68,0.15)" : "#fef2f2"), color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                        {t.type === "INCOME" ? "Receita" : "Despesa"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", color: muted }}>{t.categoryLabel}</td>
                    <td style={{ padding: "9px 10px", color: theme.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                    <td style={{ padding: "9px 10px", color: muted }}>{t.regionName ?? "Matriz"}</td>
                    <td style={{ padding: "9px 10px", color: muted }}>{t.paymentMethod ?? "—"}</td>
                    <td style={{ padding: "9px 10px", color: muted, whiteSpace: "nowrap" }}>{fmtDate(t.dueDate)}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: t.status === "PAID" ? (isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef") : (isDark ? "rgba(249,115,22,0.14)" : "#fff7ed"), color: t.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                        {t.status === "PAID" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px", fontWeight: 800, color: t.type === "INCOME" ? "#16a34a" : "#dc2626", textAlign: "right", whiteSpace: "nowrap" }}>
                      {t.type === "INCOME" ? "+" : "-"}{money(t.amountCents)}
                    </td>
                  </tr>
                ))}
                {data.transactions.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: "24px 10px", textAlign: "center", color: muted }}>
                      Nenhum lançamento no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Block>

        {/* Print footer */}
        <div style={{ marginTop: 8, fontSize: 12, color: muted, textAlign: "right" }}>
          Gerado em {new Date().toLocaleDateString("pt-BR")} — Sistema V2 CRM
        </div>
      </>)}
      </div>
    </>
  );
}
