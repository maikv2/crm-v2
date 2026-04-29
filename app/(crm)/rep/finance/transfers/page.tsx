"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type TransferItem = {
  id: string;
  amountCents: number;
  transferredAt?: string | null;
  status?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  receipt?: {
    id: string;
    amountCents?: number | null;
    receivedAt?: string | null;
    paymentMethod?: string | null;
    order?: {
      id: string;
      number?: number | null;
      issuedAt?: string | null;
      totalCents?: number | null;
      paymentMethod?: string | null;
      paymentStatus?: string | null;
      client?: {
        id: string;
        name?: string | null;
        tradeName?: string | null;
      } | null;
    } | null;
  } | null;
};

type TransfersResponse = {
  region?: {
    id: string;
    name: string;
  } | null;
  items: TransferItem[];
};

function isPendingStatus(status?: string | null) {
  return String(status ?? "").trim().toUpperCase() === "PENDING";
}

function statusLabel(status?: string | null) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "TRANSFERRED") return "Repassado";
  if (normalized === "PENDING") return "Pendente";
  return status || "Sem status";
}

function orderTitle(item: TransferItem) {
  const number = item.receipt?.order?.number;
  return number ? `Pedido #${number}` : "Pedido sem número";
}

function clientName(item: TransferItem) {
  return (
    item.receipt?.order?.client?.tradeName ||
    item.receipt?.order?.client?.name ||
    "Cliente não informado"
  );
}

export default function RepFinanceTransfersPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<TransfersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/finance/transfers", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar repasses.");
      }

      const items = Array.isArray(json?.items) ? json.items : [];

      setData({
        region: json?.region ?? null,
        items,
      });

      setSelectedIds((current) =>
        current.filter((id) =>
          items.some((item: TransferItem) => item.id === id && isPendingStatus(item.status))
        )
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar repasses.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const pendingItems = useMemo(() => {
    return (data?.items || []).filter((item) => isPendingStatus(item.status));
  }, [data]);

  const historyItems = useMemo(() => {
    return (data?.items || []).filter((item) => !isPendingStatus(item.status));
  }, [data]);

  const summary = useMemo(() => {
    return (data?.items || []).reduce(
      (acc, item) => {
        acc.total += item.amountCents ?? 0;

        if (item.status === "TRANSFERRED") {
          acc.transferred += item.amountCents ?? 0;
        }

        if (item.status === "PENDING") {
          acc.pending += item.amountCents ?? 0;
        }

        return acc;
      },
      {
        total: 0,
        transferred: 0,
        pending: 0,
      }
    );
  }, [data]);

  const selectedTotalCents = useMemo(() => {
    return pendingItems.reduce((sum, item) => {
      if (selectedIds.includes(item.id)) {
        return sum + Number(item.amountCents || 0);
      }
      return sum;
    }, 0);
  }, [pendingItems, selectedIds]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAll() {
    if (selectedIds.length === pendingItems.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(pendingItems.map((item) => item.id));
  }

  async function handleTransfer(transferIds: string[]) {
    try {
      setSaving(true);
      setError(null);

      if (!transferIds.length) {
        throw new Error("Selecione pelo menos um pedido para repassar.");
      }

      const res = await fetch("/api/rep/finance/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transferIds,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao registrar repasse.");
      }

      setNotes("");
      setSelectedIds([]);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao registrar repasse.");
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando repasses...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1180 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Repasses para Matriz
          </h1>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Região: {data?.region?.name || "-"}
        </div>

        {error ? (
          <div
            style={{
              ...card,
              border: "1px solid #ef4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <SummaryCard label="Total registrado" value={money(summary.total)} theme={theme} />
          <SummaryCard label="Transferido" value={money(summary.transferred)} theme={theme} />
          <SummaryCard label="Pendente" value={money(summary.pending)} theme={theme} />
        </div>

        <div style={{ ...card, marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                Pedidos pendentes de repasse
              </div>
              <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>
                Selecione um ou mais pedidos. O valor é somado automaticamente, sem digitação manual.
              </div>
            </div>

            <button
              type="button"
              onClick={toggleAll}
              disabled={!pendingItems.length}
              style={{
                ...btnSecondary,
                opacity: pendingItems.length ? 1 : 0.65,
              }}
            >
              {selectedIds.length === pendingItems.length && pendingItems.length
                ? "Limpar seleção"
                : "Selecionar todos"}
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 220px 220px",
              gap: 12,
              alignItems: "end",
              marginBottom: 14,
            }}
          >
            <div>
              <label style={{ fontSize: 13, color: muted, fontWeight: 700 }}>
                Observação opcional
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...inputStyle, marginTop: 6 }}
                placeholder="Ex: dinheiro recebido hoje"
              />
            </div>

            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 12,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 12, color: muted }}>Selecionado</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>
                {money(selectedTotalCents)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleTransfer(selectedIds)}
              disabled={saving || selectedIds.length === 0}
              style={{
                ...btnPrimary,
                minHeight: 44,
                opacity: saving || selectedIds.length === 0 ? 0.65 : 1,
                cursor:
                  saving || selectedIds.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Repassando..." : "Repassar selecionados"}
            </button>
          </div>

          {!pendingItems.length ? (
            <div style={{ color: muted }}>Nenhum pedido pendente de repasse.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th(theme)}></th>
                    <th style={th(theme)}>Pedido</th>
                    <th style={th(theme)}>Cliente</th>
                    <th style={th(theme)}>Recebido em</th>
                    <th style={th(theme)}>Valor</th>
                    <th style={th(theme)}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item) => {
                    const checked = selectedIds.includes(item.id);

                    return (
                      <tr key={item.id}>
                        <td style={td(theme)}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(item.id)}
                          />
                        </td>
                        <td style={td(theme)}>{orderTitle(item)}</td>
                        <td style={td(theme)}>{clientName(item)}</td>
                        <td style={td(theme)}>{formatDateBR(item.receipt?.receivedAt)}</td>
                        <td style={td(theme)}>{money(item.amountCents ?? 0)}</td>
                        <td style={td(theme)}>
                          <button
                            type="button"
                            onClick={() => handleTransfer([item.id])}
                            disabled={saving}
                            style={{
                              ...btnPrimary,
                              padding: "8px 10px",
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            Repassar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Histórico de repasses
          </div>

          {!historyItems.length ? (
            <div style={{ color: muted }}>Nenhum repasse concluído.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {orderTitle(item)} • {money(item.amountCents ?? 0)}
                    </div>
                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Cliente: {clientName(item)}
                    </div>
                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                      Repassado em: {formatDateBR(item.transferredAt)}
                    </div>
                    {item.notes ? (
                      <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                        Obs: {item.notes}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      fontWeight: 800,
                      color:
                        item.status === "TRANSFERRED"
                          ? "#22c55e"
                          : item.status === "PENDING"
                          ? "#f59e0b"
                          : theme.text,
                    }}
                  >
                    {statusLabel(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: any;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ fontSize: 13, color: theme.subtext }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function th(theme: any): React.CSSProperties {
  return {
    textAlign: "left",
    padding: "10px 8px",
    fontSize: 12,
    color: theme.subtext,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
  };
}

function td(theme: any): React.CSSProperties {
  return {
    padding: "12px 8px",
    borderBottom: `1px solid ${theme.border}`,
    fontSize: 14,
    color: theme.text,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };
}
