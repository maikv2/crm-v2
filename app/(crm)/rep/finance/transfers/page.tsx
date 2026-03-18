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
  return d.toLocaleDateString("pt-BR");
}

type TransferItem = {
  id: string;
  amountCents: number;
  transferredAt?: string | null;
  status?: string | null;
  notes?: string | null;
  receipt?: {
    id: string;
    amountCents?: number | null;
    receivedAt?: string | null;
  } | null;
};

type TransfersResponse = {
  region?: {
    id: string;
    name: string;
  } | null;
  items: TransferItem[];
};

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

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

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

      setData({
        region: json?.region ?? null,
        items: Array.isArray(json?.items) ? json.items : [],
      });
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

  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const numericAmount = Number(amount.replace(",", "."));

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Informe um valor de repasse válido.");
      }

      const payload = {
        amountCents: Math.round(numericAmount * 100),
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/rep/finance/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao registrar repasse.");
      }

      setAmount("");
      setNotes("");
      await loadData();
      alert("Repasse registrado com sucesso.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao registrar repasse.");
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const items = data?.items || [];

    return items.reduce(
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
      <div style={{ maxWidth: 1100 }}>
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
          <SummaryCard
            label="Total registrado"
            value={money(summary.total)}
            theme={theme}
          />
          <SummaryCard
            label="Transferido"
            value={money(summary.transferred)}
            theme={theme}
          />
          <SummaryCard
            label="Pendente"
            value={money(summary.pending)}
            theme={theme}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <form onSubmit={handleCreateTransfer} style={card}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
              Registrar novo repasse
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Valor do repasse
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={inputStyle}
                  placeholder="Ex: 1250,00"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: 110,
                    resize: "vertical",
                  }}
                  placeholder="Ex: repasse semanal da região"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...btnPrimary,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Registrando..." : "Registrar repasse"}
              </button>
            </div>
          </form>

          <div style={card}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
              Histórico de repasses
            </div>

            {!data?.items?.length ? (
              <div style={{ color: muted }}>Nenhum repasse registrado.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {data.items.map((item) => (
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
                        {money(item.amountCents ?? 0)}
                      </div>
                      <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                        Data: {formatDateBR(item.transferredAt)}
                      </div>
                      <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                        Status: {item.status || "-"}
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
                      {item.status === "TRANSFERRED"
                        ? "Transferido"
                        : item.status === "PENDING"
                        ? "Pendente"
                        : item.status || "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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