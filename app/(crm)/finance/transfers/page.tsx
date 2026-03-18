"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type Transfer = {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  transferredAt?: string | null;
  region?: {
    id?: string;
    name: string;
  };
  receipt: {
    order?: {
      number: number;
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

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  if (status === "PENDING") return "Pendente";
  if (status === "TRANSFERRED") return "Repassado";
  if (status === "CANCELED") return "Cancelado";
  return status;
}

function statusColor(status: string) {
  if (status === "PENDING") return "#ea580c";
  if (status === "TRANSFERRED") return "#16a34a";
  if (status === "CANCELED") return "#dc2626";
  return "#64748b";
}

function SummaryCard({
  title,
  value,
  color,
  theme,
}: {
  title: string;
  value: string;
  color: string;
  theme: ThemeShape;
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
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
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

export default function TransfersPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [data, setData] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/finance/transfers");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error("Erro ao carregar repasses:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmTransfer(id: string) {
    const confirmed = window.confirm("Confirmar repasse para matriz?");
    if (!confirmed) return;

    try {
      setSavingId(id);

      await fetch("/api/finance/transfers/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      await load();
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of data) {
      const regionId = item.region?.id;
      const regionName = item.region?.name;

      if (regionId && regionName) {
        map.set(regionId, regionName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [data]);

  const filteredData = useMemo(() => {
    if (regionFilter === "all") return data;
    return data.filter((item) => item.region?.id === regionFilter);
  }, [data, regionFilter]);

  const summary = useMemo(() => {
    const pending = filteredData
      .filter((item) => item.status === "PENDING")
      .reduce((acc, item) => acc + item.amountCents, 0);

    const transferred = filteredData
      .filter((item) => item.status === "TRANSFERRED")
      .reduce((acc, item) => acc + item.amountCents, 0);

    const canceled = filteredData
      .filter((item) => item.status === "CANCELED")
      .reduce((acc, item) => acc + item.amountCents, 0);

    return {
      pending,
      transferred,
      canceled,
    };
  }, [filteredData]);

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
            🏠 / Financeiro / Repasses → Matriz
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Repasses Região → Matriz
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Controle dos valores recebidos nas regiões e repassados para a
            matriz.
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
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          title="Pendentes de repasse"
          value={money(summary.pending)}
          color="#ea580c"
          theme={theme}
        />

        <SummaryCard
          title="Já repassados"
          value={money(summary.transferred)}
          color="#16a34a"
          theme={theme}
        />

        <SummaryCard
          title="Cancelados"
          value={money(summary.canceled)}
          color="#dc2626"
          theme={theme}
        />
      </div>

      <Block
        title="Lista de repasses"
        theme={theme}
        right={<ActionButton label="Atualizar" theme={theme} onClick={load} />}
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
              minWidth: 900,
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                }}
              >
                <th style={th(theme)}>Região</th>
                <th style={th(theme)}>Pedido</th>
                <th style={th(theme)}>Valor</th>
                <th style={th(theme)}>Recebido em</th>
                <th style={th(theme)}>Status</th>
                <th style={th(theme)}>Repassado em</th>
                <th style={th(theme)}>Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderTop: `1px solid ${theme.border}`,
                    background: theme.cardBg,
                  }}
                >
                  <td style={td(theme)}>{item.region?.name ?? "-"}</td>

                  <td style={td(theme)}>
                    {item.receipt.order?.number
                      ? `PED-${String(item.receipt.order.number).padStart(4, "0")}`
                      : "-"}
                  </td>

                  <td style={{ ...td(theme), fontWeight: 700 }}>
                    {money(item.amountCents)}
                  </td>

                  <td style={td(theme)}>{formatDate(item.createdAt)}</td>

                  <td
                    style={{
                      ...td(theme),
                      fontWeight: 700,
                      color: statusColor(item.status),
                    }}
                  >
                    {statusLabel(item.status)}
                  </td>

                  <td style={td(theme)}>{formatDate(item.transferredAt)}</td>

                  <td style={td(theme)}>
                    {item.status === "PENDING" ? (
                      <ActionButton
                        label={savingId === item.id ? "Salvando..." : "Marcar repasse"}
                        theme={theme}
                        onClick={() => confirmTransfer(item.id)}
                        disabled={savingId === item.id}
                        primary
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 13,
                          color: theme.subtext,
                        }}
                      >
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhum repasse pendente.
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

function th(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "12px 14px",
    textAlign: "left",
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