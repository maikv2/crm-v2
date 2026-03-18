"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type RegionCashItem = {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  transferredAt?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
  receipt: {
    id: string;
    receivedAt: string;
    order?: {
      id: string;
      number: number;
    } | null;
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
  if (status === "PENDING") return "Aguardando repasse";
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

export default function RegionCashPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<RegionCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState("all");

  async function load() {
    setLoading(true);

    try {
      const res = await fetch("/api/finance/region-cash");
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (error) {
      console.error("Erro ao carregar caixa da região:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of data) {
      const region = item.region;
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
      {/* HEADER */}
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.subtext,
            marginBottom: 10,
          }}
        >
          🏠 / Financeiro / Caixa da Região
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: theme.text,
          }}
        >
          Caixa da Região
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            color: theme.subtext,
          }}
        >
          Valores recebidos em dinheiro nas regiões e controle de repasse para
          a matriz.
        </div>
      </div>

      {/* FILTRO */}
      <div style={{ marginBottom: 18, maxWidth: 260 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Região
        </label>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          style={{
            width: "100%",
            height: 44,
            padding: "0 12px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: inputBg,
            color: theme.text,
          }}
        >
          <option value="all">Todas as regiões</option>

          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name}
            </option>
          ))}
        </select>
      </div>

      {/* CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          title="Aguardando repasse"
          value={money(summary.pending)}
          color="#ea580c"
          theme={theme}
        />

        <SummaryCard
          title="Já repassado"
          value={money(summary.transferred)}
          color="#16a34a"
          theme={theme}
        />

        <SummaryCard
          title="Cancelado"
          value={money(summary.canceled)}
          color="#dc2626"
          theme={theme}
        />
      </div>

      {/* TABELA */}
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
              <th style={th(theme)}>Pedido</th>
              <th style={th(theme)}>Região</th>
              <th style={th(theme)}>Recebido em</th>
              <th style={th(theme)}>Valor</th>
              <th style={th(theme)}>Status</th>
              <th style={th(theme)}>Repassado em</th>
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
                <td style={td(theme)}>
                  {item.receipt.order?.number
                    ? `PED-${String(item.receipt.order.number).padStart(4, "0")}`
                    : "-"}
                </td>

                <td style={td(theme)}>{item.region?.name ?? "-"}</td>

                <td style={td(theme)}>
                  {formatDate(item.receipt.receivedAt)}
                </td>

                <td style={{ ...td(theme), fontWeight: 700 }}>
                  {money(item.amountCents)}
                </td>

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
              </tr>
            ))}

            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: theme.subtext,
                    background: theme.cardBg,
                  }}
                >
                  Nenhum valor encontrado no caixa da região.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
      }}
    >
      <div style={{ fontSize: 13, color: theme.subtext, fontWeight: 700 }}>
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

function th(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 13,
    fontWeight: 800,
    color: theme.subtext,
    borderBottom: `1px solid ${theme.border}`,
  };
}

function td(theme: ThemeShape): React.CSSProperties {
  return {
    padding: "12px 14px",
    fontSize: 14,
    color: theme.text,
  };
}