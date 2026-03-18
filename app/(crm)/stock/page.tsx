"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

function qty(n: number) {
  return n?.toLocaleString("pt-BR") ?? "0";
}

type ThemeShape = ReturnType<typeof getThemeColors>;

type StockColumn = {
  id: string;
  label: string;
  kind: "MATRIX" | "REGION" | "EXHIBITORS";
};

type StockProduct = {
  id: string;
  name: string;
  stock: Record<string, number>;
  total?: number;
};

type StockResponse = {
  locations?: Array<{ id: string; name: string }>;
  regions?: Array<{ id: string; name: string; stockLocationId?: string | null }>;
  columns?: StockColumn[];
  exhibitorsStock?: Record<string, number>;
  products?: StockProduct[];
  error?: string;
  details?: string;
};

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: hover ? theme.primary : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function Card({
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

function SummaryTile({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 18,
        minWidth: 180,
        flex: 1,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.22)"
          : "0 8px 24px rgba(15,23,42,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: theme.subtext,
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: theme.text,
        }}
      >
        {qty(value)}
      </div>
    </div>
  );
}

export default function StockPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/stock", { cache: "no-store" });
        const json: StockResponse = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar estoque");
        }

        setData(json);
      } catch (e: any) {
        setError(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const columns = Array.isArray(data?.columns) ? data!.columns : [];
  const products = Array.isArray(data?.products) ? data!.products : [];

  const summary = useMemo(() => {
    let matrixTotal = 0;
    let exhibitorsTotal = 0;
    let regionsTotal = 0;
    let companyTotal = 0;

    for (const product of products) {
      for (const column of columns) {
        const value = product.stock?.[column.id] ?? 0;

        if (column.kind === "MATRIX") matrixTotal += value;
        if (column.kind === "REGION") regionsTotal += value;
        if (column.kind === "EXHIBITORS") exhibitorsTotal += value;
      }

      companyTotal +=
        typeof product.total === "number"
          ? product.total
          : columns.reduce(
              (sum, column) => sum + (product.stock?.[column.id] ?? 0),
              0
            );
    }

    return {
      matrixTotal,
      regionsTotal,
      exhibitorsTotal,
      companyTotal,
    };
  }, [columns, products]);

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
        Carregando estoque...
      </div>
    );
  }

  if (error) {
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
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            Erro ao carregar estoque
          </div>

          <div
            style={{
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            {error}
          </div>
        </div>
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
          alignItems: "flex-start",
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
            🏠 / Estoque
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Estoque
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Visualize o saldo por produto em Matriz, Regiões e Expositores.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="+ Entrada de estoque"
            theme={theme}
            onClick={() => router.push("/stock/new")}
          />

          <ActionButton
            label="+ Transferência"
            theme={theme}
            onClick={() => router.push("/stock/transfer")}
          />

          <ActionButton
            label="Histórico"
            theme={theme}
            onClick={() => router.push("/stock/history")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <SummaryTile label="Matriz" value={summary.matrixTotal} theme={theme} />
        <SummaryTile
          label="Regiões"
          value={summary.regionsTotal}
          theme={theme}
        />
        <SummaryTile
          label="Expositores"
          value={summary.exhibitorsTotal}
          theme={theme}
        />
        <SummaryTile
          label="Total Empresa"
          value={summary.companyTotal}
          theme={theme}
        />
      </div>

      <Card title="Posição de estoque" theme={theme}>
        <div
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 14,
            overflow: "hidden",
            background: subtleCard,
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 880,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: theme.isDark ? "#0b1324" : "#f8fafc",
                  }}
                >
                  <th style={th(theme, "left")}>Produto</th>

                  {columns.map((column) => (
                    <th key={column.id} style={th(theme, "center")}>
                      {column.label}
                    </th>
                  ))}

                  <th style={th(theme, "center")}>Total Empresa</th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td
                      colSpan={columns.length + 2}
                      style={td(theme, "center")}
                    >
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const total =
                      typeof p.total === "number"
                        ? p.total
                        : columns.reduce(
                            (sum, column) => sum + (p.stock?.[column.id] ?? 0),
                            0
                          );

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderTop: `1px solid ${theme.border}`,
                          background: theme.cardBg,
                        }}
                      >
                        <td style={td(theme, "left", true)}>{p.name}</td>

                        {columns.map((column) => {
                          const value = p.stock?.[column.id] ?? 0;

                          return (
                            <td key={column.id} style={td(theme, "center")}>
                              {qty(value)}
                            </td>
                          );
                        })}

                        <td style={td(theme, "center", true)}>{qty(total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

function th(
  theme: ThemeShape,
  align: "left" | "center" = "left"
): React.CSSProperties {
  return {
    textAlign: align,
    padding: "12px 14px",
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 13,
    fontWeight: 800,
    color: theme.subtext,
    whiteSpace: "nowrap",
  };
}

function td(
  theme: ThemeShape,
  align: "left" | "center" = "left",
  bold = false
): React.CSSProperties {
  return {
    textAlign: align,
    padding: "12px 14px",
    fontSize: 14,
    color: theme.text,
    fontWeight: bold ? 800 : 500,
    whiteSpace: "nowrap",
  };
}