"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function formatDate(d: string) {
  return new Date(d).toLocaleString("pt-BR");
}

type ThemeShape = ReturnType<typeof getThemeColors>;

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
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
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
          fontSize: 18,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </div>

      {children}
    </div>
  );
}

export default function StockHistoryPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stock-history");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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
        Carregando histórico...
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
            🏠 / Estoque / Histórico
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Histórico de Estoque
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Acompanhe todas as movimentações registradas no estoque.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            label="Voltar"
            theme={theme}
            onClick={() => router.push("/stock")}
          />
        </div>
      </div>

      <Card title="Movimentações" theme={theme}>
        {data.length === 0 ? (
          <div style={{ color: theme.subtext }}>
            Nenhuma movimentação encontrada.
          </div>
        ) : (
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
                  minWidth: 920,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: theme.isDark ? "#0b1324" : "#f8fafc",
                    }}
                  >
                    <th style={th(theme, "left")}>Data</th>
                    <th style={th(theme, "left")}>Produto</th>
                    <th style={th(theme, "center")}>Local</th>
                    <th style={th(theme, "center")}>Tipo</th>
                    <th style={th(theme, "center")}>Qtd</th>
                    <th style={th(theme, "left")}>Obs</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderTop: `1px solid ${theme.border}`,
                        background: theme.cardBg,
                      }}
                    >
                      <td style={td(theme, "left")}>{formatDate(m.createdAt)}</td>

                      <td style={td(theme, "left", true)}>{m.productName}</td>

                      <td style={td(theme, "center")}>{m.locationName}</td>

                      <td style={td(theme, "center")}>{m.type}</td>

                      <td style={td(theme, "center", true)}>{m.quantity}</td>

                      <td style={td(theme, "left")}>{m.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function th(
  theme: ThemeShape,
  align: "left" | "center" = "left"
): React.CSSProperties {
  return {
    padding: "12px 14px",
    textAlign: align,
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
    padding: "12px 14px",
    textAlign: align,
    fontSize: 14,
    color: theme.text,
    fontWeight: bold ? 800 : 500,
    verticalAlign: "middle",
  };
}