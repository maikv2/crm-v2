"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";
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

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonthYear(year: number, month: number): string {
  return `${MONTH_NAMES[month]} de ${year}`;
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
  theme,
}: {
  year: number;
  month: number;
  range: DateRange;
  onDayClick: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const isDark = theme.isDark;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const muted = isDark ? "#94a3b8" : "#64748b";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const calBg = isDark ? "#0f172a" : "#ffffff";
  const hoverBg = isDark ? "#1e293b" : "#eff6ff";

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div
      style={{
        background: calBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 20,
        width: 280,
        boxShadow: isDark
          ? "0 10px 30px rgba(2,6,23,0.45)"
          : "0 8px 24px rgba(15,23,42,0.10)",
      }}
    >
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
            color: muted,
            padding: 4,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <span
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: theme.text,
          }}
        >
          {formatMonthYear(year, month)}
        </span>

        <button
          onClick={onNext}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: muted,
            padding: 4,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronRight size={18} />
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
        {WEEKDAY_NAMES.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: muted,
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
          gap: 2,
        }}
      >
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} />;
          }

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
                    ? "rgba(37,99,235,0.18)"
                    : "#dbeafe"
                  : "transparent",
                color: isSelected ? "#ffffff" : theme.text,
                border: "none",
                borderRadius: isStart
                  ? "8px 0 0 8px"
                  : isEnd
                  ? "0 8px 8px 0"
                  : inRange
                  ? "0"
                  : 8,
                padding: "6px 0",
                cursor: "pointer",
                fontWeight: isSelected ? 800 : 500,
                fontSize: 13,
                textAlign: "center",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  (e.currentTarget as HTMLButtonElement).style.background = inRange
                    ? isDark
                      ? "rgba(37,99,235,0.18)"
                      : "#dbeafe"
                    : "transparent";
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  icon: Icon,
  iconBg,
  iconFg,
  title,
  description,
  items,
  onClick,
  theme,
}: {
  icon: any;
  iconBg: string;
  iconFg: string;
  title: string;
  description: string;
  items: string[];
  onClick: () => void;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const [hover, setHover] = useState(false);
  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const subtleCard = isDark ? "#0b1324" : "#f8fafc";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cardBg,
        border: `1px solid ${hover ? "#2563eb" : border}`,
        borderRadius: 18,
        padding: 24,
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: hover
          ? isDark
            ? "0 12px 36px rgba(37,99,235,0.22)"
            : "0 12px 36px rgba(37,99,235,0.10)"
          : isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
        transform: hover ? "translateY(-3px)" : "none",
      }}
    >
      {/* Icon + title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: iconBg,
            color: iconFg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={24} />
        </div>

        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: theme.text,
              marginBottom: 4,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 13, color: muted }}>{description}</div>
        </div>
      </div>

      {/* Sub-items */}
      <div
        style={{
          background: subtleCard,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        {items.map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 0",
              fontSize: 13,
              color: muted,
              borderBottom: `1px solid ${border}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: iconFg,
                flexShrink: 0,
              }}
            />
            {item}
          </div>
        )).reduce((acc: React.ReactNode[], el, idx, arr) => {
          const clone = idx === arr.length - 1
            ? { ...el, props: { ...el.props, style: { ...el.props.style, borderBottom: "none" } } }
            : el;
          acc.push(clone);
          return acc;
        }, [])}
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#2563eb",
          }}
        >
          Ver relatórios
        </span>
        <ArrowRight size={16} color="#2563eb" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const isDark = theme.isDark;
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const cardBg = isDark ? "#0f172a" : "#ffffff";

  // Period state
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Custom range state
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

  function handlePrevMonth() {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }

  function handlePrevSelectedMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function handleNextSelectedMonth() {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  function getPeriodLabel(): string {
    if (periodMode === "month") {
      return formatMonthYear(selectedYear, selectedMonth);
    }
    if (range.start && range.end) {
      return `${formatDate(range.start)} → ${formatDate(range.end)}`;
    }
    if (range.start) {
      return `${formatDate(range.start)} → ...`;
    }
    return "Selecione o período";
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

  const periodReady =
    periodMode === "month" || (range.start !== null && range.end !== null);

  function navigateTo(path: string) {
    if (!periodReady) return;
    router.push(`/reports/${path}${getQueryParams()}`);
  }

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: "24px",
      }}
    >
      {/* Breadcrumb + Title */}
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: muted,
            marginBottom: 10,
          }}
        >
          🏠 / Relatórios
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 6,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChart3 size={22} />
          </div>

          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
              Relatórios
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: muted }}>
              Selecione o período e o tipo de relatório desejado
            </div>
          </div>
        </div>
      </div>

      {/* Period Selector Block */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${border}`,
          borderRadius: 18,
          padding: 24,
          marginBottom: 28,
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
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CalendarDays size={18} color="#2563eb" />
          Período do Relatório
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "inline-flex",
            background: isDark ? "#0b1324" : "#f1f5f9",
            borderRadius: 10,
            padding: 4,
            marginBottom: 20,
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
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
                background:
                  periodMode === m
                    ? "#2563eb"
                    : "transparent",
                color:
                  periodMode === m
                    ? "#ffffff"
                    : muted,
                transition: "all 0.15s ease",
              }}
            >
              {m === "month" ? "Por Mês" : "Por Período"}
            </button>
          ))}
        </div>

        {/* Month selector */}
        {periodMode === "month" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handlePrevSelectedMonth}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div
              style={{
                padding: "8px 24px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: isDark ? "#0b1324" : "#f8fafc",
                fontWeight: 800,
                fontSize: 15,
                color: theme.text,
                minWidth: 200,
                textAlign: "center",
              }}
            >
              {formatMonthYear(selectedYear, selectedMonth)}
            </div>

            <button
              onClick={handleNextSelectedMonth}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Custom date range */}
        {periodMode === "custom" && (
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setShowCal(!showCal)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${showCal ? "#2563eb" : border}`,
                  background: isDark ? "#0b1324" : "#f8fafc",
                  color: theme.text,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 14,
                  transition: "all 0.15s ease",
                }}
              >
                <CalendarDays size={16} color="#2563eb" />
                {getPeriodLabel()}
              </button>

              {range.start && range.end && (
                <button
                  onClick={() => setRange({ start: null, end: null })}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    background: "transparent",
                    color: muted,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  Limpar
                </button>
              )}
            </div>

            {showCal && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  zIndex: 100,
                }}
              >
                <MiniCalendar
                  year={calYear}
                  month={calMonth}
                  range={range}
                  onDayClick={handleDayClick}
                  onPrev={handlePrevMonth}
                  onNext={handleNextMonth}
                  theme={theme}
                />
                {range.start && !range.end && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: muted,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    Agora clique na data final
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected summary */}
        {periodReady && (
          <div
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: isDark ? "rgba(37,99,235,0.14)" : "#eaf1ff",
              fontSize: 13,
              fontWeight: 700,
              color: "#2563eb",
            }}
          >
            ✓ Período selecionado: {getPeriodLabel()}
          </div>
        )}

        {!periodReady && periodMode === "custom" && (
          <div
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              background: isDark ? "rgba(249,115,22,0.12)" : "#fff7ed",
              fontSize: 13,
              fontWeight: 700,
              color: "#ea580c",
            }}
          >
            ⚠ Selecione as datas de início e fim para continuar
          </div>
        )}
      </div>

      {/* Report Categories */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          opacity: periodReady ? 1 : 0.45,
          pointerEvents: periodReady ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      >
        <ReportCard
          icon={Boxes}
          iconBg={isDark ? "rgba(124,58,237,0.18)" : "#f3ebff"}
          iconFg="#7c3aed"
          title="Estoque"
          description="Visão completa da movimentação e situação do estoque"
          items={[
            "Posição atual do estoque",
            "Entradas e saídas por período",
            "Transferências entre regiões",
            "Produtos com estoque crítico",
          ]}
          onClick={() => navigateTo("stock")}
          theme={theme}
        />

        <ReportCard
          icon={ShoppingCart}
          iconBg={isDark ? "rgba(34,197,94,0.15)" : "#eaf8ef"}
          iconFg="#16a34a"
          title="Vendas"
          description="Análise de pedidos, faturamento e desempenho comercial"
          items={[
            "Pedidos por período e status",
            "Faturamento por representante",
            "Top clientes e produtos",
            "Vendas por região",
          ]}
          onClick={() => navigateTo("sales")}
          theme={theme}
        />

        <ReportCard
          icon={DollarSign}
          iconBg={isDark ? "rgba(37,99,235,0.18)" : "#eaf1ff"}
          iconFg="#2563eb"
          title="Financeiro"
          description="Controle completo de receitas, despesas e fluxo de caixa"
          items={[
            "Fluxo de caixa no período",
            "Contas a receber e a pagar",
            "Repasses e transferências",
            "Resultado por conta financeira",
          ]}
          onClick={() => navigateTo("finance")}
          theme={theme}
        />
      </div>

      {/* Overlay hint when period not set */}
      {!periodReady && periodMode === "custom" && (
        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 14,
            color: muted,
            fontWeight: 600,
          }}
        >
          Defina o período acima para liberar os relatórios
        </div>
      )}
    </div>
  );
}
