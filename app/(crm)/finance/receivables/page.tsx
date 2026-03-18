"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type Installment = {
  id: string;
  installmentNumber: number;
  amountCents: number;
  dueDate: string;
  status: string;
  paidAt?: string | null;
  accountsReceivable: {
    installmentCount: number;
    paymentMethod: string;
    region?: {
      id: string;
      name: string;
    } | null;
    order: {
      number: number;
      client: {
        name: string;
      };
    };
  };
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString("pt-BR");
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getStatusLabel(item: Installment) {
  if (item.status === "PAID") return "Pago";

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(addDays(now, 7));
  const due = new Date(item.dueDate);

  if (due < todayStart) return "Vencido";
  if (due >= todayStart && due <= todayEnd) return "Vence hoje";
  if (due > todayEnd && due <= weekEnd) return "Vence na semana";

  return "A vencer";
}

function getStatusColor(label: string) {
  if (label === "Pago") return "#16a34a";
  if (label === "Vencido") return "#dc2626";
  if (label === "Vence hoje") return "#ea580c";
  if (label === "Vence na semana") return "#ca8a04";
  return "#2563eb";
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  theme,
  valueColor,
}: {
  title: string;
  value: string;
  theme: ThemeShape;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.20)"
          : "0 8px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: theme.subtext,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 24,
          fontWeight: 900,
          color: valueColor || theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  theme,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : theme.primary
    : hover
    ? theme.primary
    : theme.cardBg;

  const color = hover || primary ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: 10,
        border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
        background,
        color,
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

export default function ReceivablesPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("all");

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/finance/receivables");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error("Erro ao carregar contas a receber:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReceive(item: Installment) {
    const confirmed = window.confirm(
      `Confirmar recebimento da parcela ${item.installmentNumber}/${item.accountsReceivable.installmentCount}?`
    );

    if (!confirmed) return;

    try {
      const res = await fetch("/api/finance/receivables/receive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          installmentId: item.id,
          paymentMethod: item.accountsReceivable.paymentMethod,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json.error || "Erro ao receber parcela.");
        return;
      }

      await load();
      alert("Parcela recebida com sucesso.");
    } catch (error) {
      console.error("Erro ao receber parcela:", error);
      alert("Erro ao receber parcela.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of data) {
      const region = item.accountsReceivable?.region;
      if (region?.id) {
        map.set(region.id, region.name);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (regionFilter === "all") return data;

    return data.filter(
      (item) => item.accountsReceivable?.region?.id === regionFilter
    );
  }, [data, regionFilter]);

  const grouped = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(addDays(now, 7));

    const overdue = filteredData.filter((item) => {
      if (item.status === "PAID") return false;
      const due = new Date(item.dueDate);
      return due < todayStart;
    });

    const dueToday = filteredData.filter((item) => {
      if (item.status === "PAID") return false;
      const due = new Date(item.dueDate);
      return due >= todayStart && due <= todayEnd;
    });

    const dueThisWeek = filteredData.filter((item) => {
      if (item.status === "PAID") return false;
      const due = new Date(item.dueDate);
      return due > todayEnd && due <= weekEnd;
    });

    const future = filteredData.filter((item) => {
      if (item.status === "PAID") return false;
      const due = new Date(item.dueDate);
      return due > weekEnd;
    });

    return {
      overdue,
      dueToday,
      dueThisWeek,
      future,
    };
  }, [filteredData]);

  const totals = useMemo(() => {
    const sum = (items: Installment[]) =>
      items.reduce((acc, item) => acc + item.amountCents, 0);

    return {
      overdue: sum(grouped.overdue),
      dueToday: sum(grouped.dueToday),
      dueThisWeek: sum(grouped.dueThisWeek),
      future: sum(grouped.future),
    };
  }, [grouped]);

  if (loading) {
    return (
      <div
        style={{
          padding: 28,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 28,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Financeiro / Contas a receber
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Contas a Receber
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Parcelas separadas por vencimento e filtradas por região.
          </div>
        </div>

        <div style={{ minWidth: 240 }}>
          <label style={label(theme)}>Região</label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            style={input(theme, inputBg)}
          >
            <option value="all">Todas as regiões</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          title="Vence hoje"
          value={money(totals.dueToday)}
          theme={theme}
          valueColor="#ea580c"
        />

        <SummaryCard
          title="Vence na semana"
          value={money(totals.dueThisWeek)}
          theme={theme}
          valueColor="#ca8a04"
        />

        <SummaryCard
          title="A vencer"
          value={money(totals.future)}
          theme={theme}
          valueColor="#2563eb"
        />

        <SummaryCard
          title="Vencidos"
          value={money(totals.overdue)}
          theme={theme}
          valueColor="#dc2626"
        />
      </div>

      <Block
        title="Parcelas"
        theme={theme}
        right={
          <ActionButton
            label="Atualizar"
            theme={theme}
            onClick={load}
          />
        }
      >
        <div
          style={{
            overflowX: "auto",
            border: `1px solid ${theme.border}`,
            borderRadius: 14,
            background: subtleCard,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 980,
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                }}
              >
                <th style={th(theme, "left")}>Pedido</th>
                <th style={th(theme, "left")}>Cliente</th>
                <th style={th(theme, "left")}>Região</th>
                <th style={th(theme, "left")}>Parcela</th>
                <th style={th(theme, "left")}>Vencimento</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Situação</th>
                <th style={th(theme, "left")}>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item) => {
                const labelText = getStatusLabel(item);

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td style={td(theme)}>
                      {`PED-${String(
                        item.accountsReceivable.order.number
                      ).padStart(4, "0")}`}
                    </td>

                    <td style={td(theme)}>
                      {item.accountsReceivable.order.client.name}
                    </td>

                    <td style={td(theme)}>
                      {item.accountsReceivable.region?.name ?? "-"}
                    </td>

                    <td style={td(theme)}>
                      {item.installmentNumber}/
                      {item.accountsReceivable.installmentCount}
                    </td>

                    <td style={td(theme)}>{formatDate(item.dueDate)}</td>

                    <td style={{ ...td(theme), fontWeight: 700 }}>
                      {money(item.amountCents)}
                    </td>

                    <td
                      style={{
                        ...td(theme),
                        fontWeight: 700,
                        color: getStatusColor(labelText),
                      }}
                    >
                      {labelText}
                    </td>

                    <td style={td(theme)}>
                      {item.status === "PAID" ? (
                        <span
                          style={{
                            fontSize: 13,
                            color: theme.subtext,
                          }}
                        >
                          Recebido
                        </span>
                      ) : (
                        <ActionButton
                          label="Receber"
                          theme={theme}
                          onClick={() => handleReceive(item)}
                          primary
                        />
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhuma conta a receber encontrada.
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

function label(theme: ThemeShape): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: theme.text,
    fontSize: 14,
  };
}

function input(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };
}

function th(
  theme: ThemeShape,
  textAlign: "left" | "center" = "left"
): React.CSSProperties {
  return {
    padding: "12px 14px",
    textAlign,
    fontSize: 13,
    fontWeight: 800,
    color: theme.subtext,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
  };
}

function td(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "12px 14px",
    fontSize: 14,
    color: theme.text,
    verticalAlign: "middle",
  };
}