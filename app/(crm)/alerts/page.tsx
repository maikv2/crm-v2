"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type AlertSeverity = "critical" | "high" | "medium" | "low";
type AlertStatus = "pending" | "info" | "done";

type AlertItem = {
  id: string;
  kind: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  regionName: string | null;
  occurredAt: string;
  href: string;
};

type AlertsOverviewResponse = {
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    pendingAction: number;
    today: number;
  };
  alerts: AlertItem[];
  byKind: Array<{
    label: string;
    value: number;
  }>;
  byRegion: Array<{
    label: string;
    value: number;
  }>;
  generatedAt: string;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatKindLabel(kind: string) {
  const labels: Record<string, string> = {
    portal_order_request: "Solicitação do portal",
    receivable_overdue: "Recebível em atraso",
    receivable_due_today: "Recebível vence hoje",
    finance_overdue: "Financeiro em atraso",
    finance_due_today: "Financeiro vence hoje",
    cash_transfer_pending: "Repasse pendente",
    new_order: "Novo pedido",
    new_client: "Novo cliente",
    new_exhibitor: "Novo expositor",
    maintenance_recorded: "Manutenção",
    investor_distribution_pending: "Investidor pendente",
    representative_commission_pending: "Comissão pendente",
    representative_settlement_open: "Acerto semanal",
    receipt_registered: "Recebimento",
    visit_registered: "Visita registrada",
  };

  return labels[kind] ?? kind;
}

function severityLabel(severity: AlertSeverity) {
  if (severity === "critical") return "Crítico";
  if (severity === "high") return "Alta";
  if (severity === "medium") return "Média";
  return "Baixa";
}

function statusLabel(status: AlertStatus) {
  if (status === "pending") return "Pendente";
  if (status === "done") return "Concluído";
  return "Informativo";
}

function severityColors(severity: AlertSeverity, theme: ThemeShape) {
  if (severity === "critical") {
    return {
      bg: theme.isDark ? "rgba(239,68,68,0.14)" : "#fee2e2",
      fg: "#dc2626",
      border: theme.isDark ? "rgba(239,68,68,0.25)" : "#fecaca",
    };
  }

  if (severity === "high") {
    return {
      bg: theme.isDark ? "rgba(245,158,11,0.14)" : "#fef3c7",
      fg: "#d97706",
      border: theme.isDark ? "rgba(245,158,11,0.25)" : "#fde68a",
    };
  }

  if (severity === "medium") {
    return {
      bg: theme.isDark ? "rgba(37,99,235,0.14)" : "#dbeafe",
      fg: "#2563eb",
      border: theme.isDark ? "rgba(37,99,235,0.25)" : "#bfdbfe",
    };
  }

  return {
    bg: theme.isDark ? "rgba(34,197,94,0.14)" : "#dcfce7",
    fg: "#16a34a",
    border: theme.isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0",
  };
}

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

  const buttonBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const buttonBorder = theme.isDark ? "#1e293b" : theme.border;
  const buttonText = theme.isDark ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${buttonBorder}`,
        background: hover ? "#2563eb" : buttonBg,
        color: hover ? "#ffffff" : buttonText,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        boxShadow: theme.isDark ? "0 4px 14px rgba(2,6,23,0.28)" : "none",
      }}
    >
      {label}
    </button>
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
  const blockBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const blockBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: blockBg,
        border: `1px solid ${blockBorder}`,
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
  label,
  value,
  helper,
  theme,
}: {
  label: string;
  value: number;
  helper: string;
  theme: ThemeShape;
}) {
  const cardBg = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: muted,
          marginBottom: 10,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: theme.text,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 13,
          color: muted,
        }}
      >
        {helper}
      </div>
    </div>
  );
}

function FilterButton({
  label,
  active,
  theme,
  onClick,
}: {
  label: string;
  active: boolean;
  theme: ThemeShape;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 14px",
        borderRadius: 999,
        border: `1px solid ${active ? "#2563eb" : theme.isDark ? "#1e293b" : theme.border}`,
        background: active
          ? "#2563eb"
          : theme.isDark
          ? "#0b1324"
          : "#ffffff",
        color: active ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function AlertCard({
  item,
  theme,
  onOpen,
}: {
  item: AlertItem;
  theme: ThemeShape;
  onOpen: () => void;
}) {
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const severity = severityColors(item.severity, theme);

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        background: subtleCard,
        padding: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: severity.bg,
                color: severity.fg,
                border: `1px solid ${severity.border}`,
              }}
            >
              {severityLabel(item.severity)}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
                background: theme.isDark ? "#111827" : "#ffffff",
                color: theme.text,
                border: `1px solid ${border}`,
              }}
            >
              {statusLabel(item.status)}
            </span>

            <span
              style={{
                fontSize: 12,
                color: muted,
                fontWeight: 700,
              }}
            >
              {formatKindLabel(item.kind)}
            </span>
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: theme.text,
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          style={{
            height: 38,
            padding: "0 14px",
            borderRadius: 12,
            border: `1px solid ${border}`,
            background: theme.isDark ? "#111827" : "#ffffff",
            color: theme.text,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Abrir
        </button>
      </div>

      <div
        style={{
          fontSize: 14,
          color: muted,
          lineHeight: 1.55,
        }}
      >
        {item.description}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          paddingTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            color: muted,
            fontSize: 13,
          }}
        >
          <span>
            <strong style={{ color: theme.text }}>Região:</strong>{" "}
            {item.regionName ?? "Sem região"}
          </span>

          <span>
            <strong style={{ color: theme.text }}>Data:</strong>{" "}
            {formatDateTime(item.occurredAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";

  const [data, setData] = useState<AlertsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<
    "all" | AlertSeverity
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AlertStatus>("all");
  const [search, setSearch] = useState("");

  async function loadAlerts() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/alerts/overview", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Falha ao carregar central de avisos");
      }

      const json: AlertsOverviewResponse = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar a central de avisos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = useMemo(() => {
    const all = data?.alerts ?? [];
    const normalizedSearch = search.trim().toLowerCase();

    return all.filter((item) => {
      const matchesSeverity =
        severityFilter === "all" ? true : item.severity === severityFilter;

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      const haystack = [
        item.title,
        item.description,
        item.regionName ?? "",
        formatKindLabel(item.kind),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = normalizedSearch
        ? haystack.includes(normalizedSearch)
        : true;

      return matchesSeverity && matchesStatus && matchesSearch;
    });
  }, [data, search, severityFilter, statusFilter]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
        }}
      >
        Carregando central de avisos...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontWeight: 700,
        }}
      >
        {error}
      </div>
    );
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
              color: muted,
              marginBottom: 10,
            }}
          >
            🔔 / Central de Avisos
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Central de Avisos do Admin
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Aqui você acompanha o que está acontecendo no sistema sem precisar
            entrar em cada área separadamente.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton label="Atualizar" theme={theme} onClick={loadAlerts} />
          <ActionButton
            label="Dashboard"
            theme={theme}
            onClick={() => router.push("/dashboard")}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <SummaryCard
          label="Total de avisos"
          value={data?.summary.total ?? 0}
          helper="Quantidade consolidada carregada agora"
          theme={theme}
        />
        <SummaryCard
          label="Pendentes de ação"
          value={data?.summary.pendingAction ?? 0}
          helper="Itens que exigem atenção do admin"
          theme={theme}
        />
        <SummaryCard
          label="Críticos"
          value={data?.summary.critical ?? 0}
          helper="Atrasos e pontos mais urgentes"
          theme={theme}
        />
        <SummaryCard
          label="Hoje"
          value={data?.summary.today ?? 0}
          helper="Eventos gerados hoje no sistema"
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <Block title="Filtros" theme={theme}>
          <div
            style={{
              display: "grid",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: muted,
                  marginBottom: 10,
                }}
              >
                Buscar
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, descrição, região..."
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 12,
                  border: `1px solid ${border}`,
                  background: theme.isDark ? "#0b1324" : "#ffffff",
                  color: theme.text,
                  padding: "0 14px",
                  outline: "none",
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: muted,
                  marginBottom: 10,
                }}
              >
                Severidade
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterButton
                  label="Todas"
                  active={severityFilter === "all"}
                  theme={theme}
                  onClick={() => setSeverityFilter("all")}
                />
                <FilterButton
                  label="Crítico"
                  active={severityFilter === "critical"}
                  theme={theme}
                  onClick={() => setSeverityFilter("critical")}
                />
                <FilterButton
                  label="Alta"
                  active={severityFilter === "high"}
                  theme={theme}
                  onClick={() => setSeverityFilter("high")}
                />
                <FilterButton
                  label="Média"
                  active={severityFilter === "medium"}
                  theme={theme}
                  onClick={() => setSeverityFilter("medium")}
                />
                <FilterButton
                  label="Baixa"
                  active={severityFilter === "low"}
                  theme={theme}
                  onClick={() => setSeverityFilter("low")}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: muted,
                  marginBottom: 10,
                }}
              >
                Status
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FilterButton
                  label="Todos"
                  active={statusFilter === "all"}
                  theme={theme}
                  onClick={() => setStatusFilter("all")}
                />
                <FilterButton
                  label="Pendentes"
                  active={statusFilter === "pending"}
                  theme={theme}
                  onClick={() => setStatusFilter("pending")}
                />
                <FilterButton
                  label="Informativos"
                  active={statusFilter === "info"}
                  theme={theme}
                  onClick={() => setStatusFilter("info")}
                />
                <FilterButton
                  label="Concluídos"
                  active={statusFilter === "done"}
                  theme={theme}
                  onClick={() => setStatusFilter("done")}
                />
              </div>
            </div>
          </div>
        </Block>

        <Block title="Resumo rápido" theme={theme}>
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 14,
                background: subtleCard,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: muted,
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Alta prioridade
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                {(data?.summary.critical ?? 0) + (data?.summary.high ?? 0)}
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 14,
                background: subtleCard,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: muted,
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Média prioridade
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                {data?.summary.medium ?? 0}
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 14,
                background: subtleCard,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: muted,
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Baixa prioridade
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                {data?.summary.low ?? 0}
              </div>
            </div>
          </div>
        </Block>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <Block
          title={`Avisos (${filteredAlerts.length})`}
          theme={theme}
          right={
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: muted,
              }}
            >
              Atualizado em {data?.generatedAt ? formatDateTime(data.generatedAt) : "-"}
            </div>
          }
        >
          <div
            style={{
              display: "grid",
              gap: 12,
              maxHeight: 820,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {filteredAlerts.length === 0 ? (
              <div
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: 16,
                  background: subtleCard,
                  padding: 24,
                  textAlign: "center",
                  color: muted,
                  fontWeight: 700,
                }}
              >
                Nenhum aviso encontrado com os filtros atuais.
              </div>
            ) : (
              filteredAlerts.map((item) => (
                <AlertCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  onOpen={() => router.push(item.href)}
                />
              ))
            )}
          </div>
        </Block>

        <div
          style={{
            display: "grid",
            gap: 18,
          }}
        >
          <Block title="Tipos de aviso" theme={theme}>
            <div style={{ display: "grid", gap: 10 }}>
              {(data?.byKind ?? []).slice(0, 10).map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    background: subtleCard,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: theme.text,
                    }}
                  >
                    {formatKindLabel(item.label)}
                  </div>

                  <div
                    style={{
                      minWidth: 34,
                      height: 34,
                      borderRadius: 999,
                      background: theme.isDark ? "#111827" : "#ffffff",
                      border: `1px solid ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: theme.text,
                      padding: "0 10px",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Regiões com mais avisos" theme={theme}>
            <div style={{ display: "grid", gap: 10 }}>
              {(data?.byRegion ?? []).slice(0, 10).map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    background: subtleCard,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: theme.text,
                    }}
                  >
                    {item.label}
                  </div>

                  <div
                    style={{
                      minWidth: 34,
                      height: 34,
                      borderRadius: 999,
                      background: theme.isDark ? "#111827" : "#ffffff",
                      border: `1px solid ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: theme.text,
                      padding: "0 10px",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}