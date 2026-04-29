"use client";

import { useEffect, useMemo, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type TransferItem = {
  id: string;
  amountCents?: number | null;
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

type ResponseShape = {
  region?: {
    id: string;
    name: string;
  } | null;
  items?: TransferItem[];
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

function clientName(item: TransferItem) {
  return (
    item.receipt?.order?.client?.tradeName ||
    item.receipt?.order?.client?.name ||
    "Cliente não informado"
  );
}

function orderTitle(item: TransferItem) {
  const number = item.receipt?.order?.number;
  return number ? `Pedido #${number}` : "Pedido sem número";
}

export default function RepFinanceTransfersPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  async function load() {
    const res = await fetch("/api/rep/finance/transfers", {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as ResponseShape | null;

    if (!res.ok) {
      throw new Error((json as any)?.error || "Erro ao carregar repasses.");
    }

    const nextItems = Array.isArray(json?.items) ? json.items : [];
    setItems(nextItems);
    setSelectedIds((current) =>
      current.filter((id) =>
        nextItems.some((item) => item.id === id && isPendingStatus(item.status))
      )
    );
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar repasses."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const pendingItems = useMemo(
    () => items.filter((item) => isPendingStatus(item.status)),
    [items]
  );

  const historyItems = useMemo(
    () => items.filter((item) => !isPendingStatus(item.status)),
    [items]
  );

  const pendingTotalCents = useMemo(() => {
    return pendingItems.reduce(
      (sum, item) => sum + Number(item.amountCents || 0),
      0
    );
  }, [pendingItems]);

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
        setError("Selecione pelo menos um pedido para repassar.");
        return;
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
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao registrar repasse."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <MobileRepPageFrame
      title="Repasses"
      subtitle="Repassar pedidos recebidos em dinheiro"
      desktopHref="/rep/finance/transfers"
    >
      {loading ? (
        <MobileCard>Carregando repasses...</MobileCard>
      ) : (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <MobileSectionTitle title="Pendente de repasse" />
            <div
              style={{
                fontSize: "clamp(22px, 6vw, 30px)",
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.1,
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {formatMoneyBR(pendingTotalCents)}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              Soma dos pedidos em dinheiro ainda não repassados para a matriz.
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Selecionados para repasse" />
            <div style={{ display: "grid", gap: 10 }}>
              <MobileInfoRow
                title="Valor selecionado"
                subtitle={`${selectedIds.length} pedido(s) selecionado(s)`}
                right={formatMoneyBR(selectedTotalCents)}
              />

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observação opcional do repasse"
                rows={3}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  padding: 14,
                  outline: "none",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />

              {error ? (
                <div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div>
              ) : null}

              <button
                type="button"
                onClick={() => handleTransfer(selectedIds)}
                disabled={saving || selectedIds.length === 0}
                style={{
                  height: 46,
                  borderRadius: 14,
                  border: "none",
                  background: colors.primary,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  cursor:
                    saving || selectedIds.length === 0 ? "not-allowed" : "pointer",
                  opacity: saving || selectedIds.length === 0 ? 0.65 : 1,
                }}
              >
                {saving ? "Repassando..." : "Repassar selecionados"}
              </button>
            </div>
          </MobileCard>

          <MobileCard>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <MobileSectionTitle title="Pedidos pendentes" />
              {pendingItems.length ? (
                <button
                  type="button"
                  onClick={toggleAll}
                  style={{
                    border: `1px solid ${colors.border}`,
                    background: colors.cardBg,
                    color: colors.text,
                    borderRadius: 999,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {selectedIds.length === pendingItems.length
                    ? "Limpar"
                    : "Selecionar tudo"}
                </button>
              ) : null}
            </div>

            {pendingItems.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum pedido pendente de repasse.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pendingItems.map((item) => {
                  const checked = selectedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: `1px solid ${
                          checked ? colors.primary : colors.border
                        }`,
                        borderRadius: 16,
                        padding: 12,
                        background: checked
                          ? colors.isDark
                            ? "rgba(37,99,235,0.18)"
                            : "#eff6ff"
                          : colors.cardBg,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(item.id)}
                          style={{ marginTop: 4 }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 900,
                              color: colors.text,
                            }}
                          >
                            {orderTitle(item)}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 13,
                              color: colors.subtext,
                            }}
                          >
                            {clientName(item)}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: colors.subtext,
                            }}
                          >
                            Recebido em: {formatDateTimeBR(item.receipt?.receivedAt)}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 900,
                            color: colors.text,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatMoneyBR(item.amountCents ?? 0)}
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleTransfer([item.id])}
                        disabled={saving}
                        style={{
                          marginTop: 12,
                          width: "100%",
                          height: 42,
                          borderRadius: 14,
                          border: `1px solid ${colors.primary}`,
                          background: colors.primary,
                          color: "#fff",
                          fontWeight: 900,
                          fontSize: 13,
                          cursor: saving ? "not-allowed" : "pointer",
                          opacity: saving ? 0.7 : 1,
                        }}
                      >
                        Repassar este pedido
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Histórico" />

            {historyItems.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum repasse concluído.
              </div>
            ) : (
              historyItems.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${orderTitle(item)} • ${statusLabel(item.status)}`}
                  subtitle={`${clientName(item)} • ${formatDateTimeBR(
                    item.transferredAt
                  )}${item.notes ? ` • ${item.notes}` : ""}`}
                  right={formatMoneyBR(item.amountCents ?? 0)}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}
