"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ShoppingCart,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type PeriodMode = "month" | "custom";

type DateRange = {
  start: Date | null;
  end: Date | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAY_NAMES = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const d = date.getTime();
  return d >= start.getTime() && d <= end.getTime();
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({
  year,
  month,
  range,
  onDayClick,
  onPrev,
  onNext,
  colors,
}: {
  year: number;
  month: number;
  range: DateRange;
  onDayClick: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  colors: ReturnType<typeof getThemeColors>;
}) {
  const isDark = colors.isDark;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <MobileCard style={{ padding: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <button
          onClick={onPrev}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: colors.subtext,
            padding: 6,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <span style={{ fontWeight: 800, fontSize: 15, color: colors.text }}>
          {formatMonthYear(year, month)}
        </span>

        <button
          onClick={onNext}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: colors.subtext,
            padding: 6,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 6,
        }}
      >
        {WEEKDAY_NAMES.map((d, i) => (
          <div
            key={`wd-${i}`}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: colors.subtext,
              padding: "2px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}
      >
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

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
                background: isSelected
                  ? "#2563eb"
                  : inRange
                  ? isDark
                    ? "rgba(37,99,235,0.20)"
                    : "#dbeafe"
                  : "transparent",
                color: isSelected ? "#ffffff" : colors.text,
                border: "none",
                borderRadius: isStart
                  ? "8px 0 0 8px"
                  : isEnd
                  ? "0 8px 8px 0"
                  : inRange
                  ? "0"
                  : 8,
                padding: "8px 0",
                cursor: "pointer",
                fontWeight: isSelected ? 800 : 500,
                fontSize: 13,
                textAlign: "center",
                minHeight: 36,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {range.start && !range.end && (
        <div
          style={{
            marginTop: 12,
            textAlign: "center",
            fontSize: 12,
            fontWeight: 600,
            color: colors.subtext,
          }}
        >
          Agora selecione a data final
        </div>
      )}
    </MobileCard>
  );
}

// ─── Report Item ──────────────────────────────────────────────────────────────

function ReportItem({
  icon: Icon,
  iconBg,
  iconFg,
  title,
  description,
  onClick,
  disabled,
  colors,
}: {
  icon: any;
  iconBg: string;
  iconFg: string;
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  colors: ReturnType<typeof getThemeColors>;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "flex",
        alignItems: "center",
        gap: 14,
        boxShadow: colors.isDark
          ? "0 10px 24px rgba(2,6,23,0.28)"
          : "0 10px 24px rgba(15,23,42,0.06)",
        textAlign: "left",
        transition: "opacity 0.2s ease",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: iconBg,
          color: iconFg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: colors.text,
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: colors.subtext,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>

      <ArrowRight size={18} color={colors.subtext} />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminReportsMobile() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [showCal, setShowCal] = useState(false);

  function handleDayClick(date: Date) {
    if (!range.start || (range.start && range.end)) {
      setRange({ start: date, end: null });
    } else {
      if (date < range.start) {
        setRange({ start: date, end: range.start });
      } else {
        setRange({ start: range.start, end: date });
      }
      setShowCal(false);
    }
  }

  function handlePrevCal() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }

  function handleNextCal() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  function handlePrevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  }

  function handleNextMonth() {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  }

  function getQueryParams(): string {
    if (periodMode === "month") {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return `?from=${start.toISOString().split("T")[0]}&to=${end.toISOString().split("T")[0]}`;
    }
    if (range.start && range.end) {
      return `?from=${range.start.toISOString().split("T")[0]}&to=${range.end.toISOString().split("T")[0]}`;
    }
    return "";
  }

  function getPeriodLabel(): string {
    if (periodMode === "month") return formatMonthYear(selectedYear, selectedMonth);
    if (range.start && range.end) return `${formatDate(range.start)} → ${formatDate(range.end)}`;
    if (range.start) return `${formatDate(range.start)} → ...`;
    return "Selecione o período";
  }

  const periodReady =
    periodMode === "month" || (range.start !== null && range.end !== null);

  function navigateTo(path: string) {
    if (!periodReady) return;
    router.push(`/m/admin/reports/${path}${getQueryParams()}`);
  }

  const isDark = colors.isDark;

  return (
    <MobilePageFrame
      title="Relatórios"
      subtitle="Selecione o período e o relatório"
      desktopHref="/reports"
    >
      {/* Period Card */}
      <MobileCard>
        <MobileSectionTitle
          title="Período"
          action={
            <div
              style={{
                display: "inline-flex",
                background: isDark ? "#0b1324" : "#f1f5f9",
                borderRadius: 10,
                padding: 3,
              }}
            >
              {(["month", "custom"] as PeriodMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPeriodMode(m);
                    setShowCal(false);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 12,
                    background: periodMode === m ? "#2563eb" : "transparent",
                    color: periodMode === m ? "#ffffff" : colors.subtext,
                    transition: "all 0.15s ease",
                  }}
                >
                  {m === "month" ? "Por Mês" : "Por Período"}
                </button>
              ))}
            </div>
          }
        />

        {/* Month mode */}
        {periodMode === "month" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handlePrevMonth}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <div
              style={{
                flex: 1,
                textAlign: "center",
                fontWeight: 800,
                fontSize: 15,
                color: colors.text,
                padding: "10px 0",
                borderRadius: 12,
                background: isDark ? "#0b1324" : "#f8fafc",
                border: `1px solid ${colors.border}`,
              }}
            >
              {formatMonthYear(selectedYear, selectedMonth)}
            </div>

            <button
              onClick={handleNextMonth}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${colors.border}`,
                background: "transparent",
                color: colors.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Custom mode */}
        {periodMode === "custom" && (
          <div>
            <button
              onClick={() => setShowCal(!showCal)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 14,
                border: `1px solid ${showCal ? "#2563eb" : colors.border}`,
                background: isDark ? "#0b1324" : "#f8fafc",
                color: colors.text,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                marginBottom: range.start && !range.end ? 8 : 0,
              }}
            >
              <CalendarDays size={17} color="#2563eb" />
              <span style={{ flex: 1, textAlign: "left" }}>{getPeriodLabel()}</span>
              {range.start && range.end && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setRange({ start: null, end: null });
                  }}
                  style={{
                    fontSize: 12,
                    color: colors.subtext,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  Limpar
                </span>
              )}
            </button>
          </div>
        )}

        {/* Period ready badge */}
        {periodReady && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 12px",
              borderRadius: 10,
              background: isDark ? "rgba(37,99,235,0.14)" : "#eaf1ff",
              fontSize: 12,
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            <CalendarDays size={14} />
            {getPeriodLabel()}
          </div>
        )}

        {!periodReady && periodMode === "custom" && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: isDark ? "rgba(249,115,22,0.12)" : "#fff7ed",
              fontSize: 12,
              fontWeight: 700,
              color: "#ea580c",
            }}
          >
            ⚠ Selecione início e fim para continuar
          </div>
        )}
      </MobileCard>

      {/* Calendar (shown inline when custom + showCal) */}
      {periodMode === "custom" && showCal && (
        <MiniCalendar
          year={calYear}
          month={calMonth}
          range={range}
          onDayClick={handleDayClick}
          onPrev={handlePrevCal}
          onNext={handleNextCal}
          colors={colors}
        />
      )}

      {/* Report items */}
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: colors.subtext,
            letterSpacing: 0.5,
            marginBottom: 10,
            paddingLeft: 4,
          }}
        >
          CATEGORIAS
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <ReportItem
            icon={Boxes}
            iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"}
            iconFg="#7c3aed"
            title="Estoque"
            description="Posição, entradas, saídas e transferências"
            onClick={() => navigateTo("stock")}
            disabled={!periodReady}
            colors={colors}
          />

          <ReportItem
            icon={ShoppingCart}
            iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"}
            iconFg="#16a34a"
            title="Vendas"
            description="Pedidos, faturamento e desempenho comercial"
            onClick={() => navigateTo("sales")}
            disabled={!periodReady}
            colors={colors}
          />

          <ReportItem
            icon={DollarSign}
            iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"}
            iconFg="#2563eb"
            title="Financeiro"
            description="Fluxo de caixa, recebíveis e repasses"
            onClick={() => navigateTo("finance")}
            disabled={!periodReady}
            colors={colors}
          />
        </div>
      </div>
    </MobilePageFrame>
  );
}
