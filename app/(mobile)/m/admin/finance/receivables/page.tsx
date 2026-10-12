"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatDateBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Installment = {
  id: string;
  amountCents: number;
  receivedCents: number;
  dueDate?: string | null;
  status: string;
  installmentNumber?: number | null;
  accountsReceivable: {
    id: string;
    installmentCount?: number | null;
    paymentMethod?: string | null;
    order?: {
      number: number;
      client?: { id: string; name: string } | null;
    } | null;
    region?: { id: string; name: string } | null;
  };
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "CARD_DEBIT", label: "Débito" },
  { value: "CARD_CREDIT", label: "Crédito" },
  { value: "BOLETO", label: "Boleto" },
];

function openAmount(amountCents: number, receivedCents: number) {
  return Math.max(0, amountCents - receivedCents);
}

export default function MobileAdminReceivablesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Installment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [paying, setPaying] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const authRes = await fetch("/api/auth/me", { cache: "no-store" });
      const authJson = await authRes.json().catch(() => null);

      if (authRes.status === 401) {
        router.push("/login?redirect=/m/admin/finance/receivables");
        return;
      }

      if (!["ADMIN", "ADMINISTRATIVE"].includes(authJson?.user?.role)) {
        router.push("/m/admin");
        return;
      }

      const res = await fetch("/api/finance/receivables", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || "Erro ao carregar contas a receber.");

      setItems(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contas a receber.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    load().then(() => { if (!active) return; });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useMemo(() => {
    return items.filter((item) =>
      ["PENDING", "PARTIAL", "OVERDUE"].includes(item.status)
    );
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return open;
    return open.filter((item) => {
      const clientName = item.accountsReceivable.order?.client?.name ?? "";
      const regionName = item.accountsReceivable.region?.name ?? "";
      const orderNum = String(item.accountsReceivable.order?.number ?? "");
      return (
        clientName.toLowerCase().includes(q) ||
        regionName.toLowerCase().includes(q) ||
        orderNum.includes(q)
      );
    });
  }, [open, search]);

  const summary = useMemo(() => {
    const overdue = open.filter((i) => i.status === "OVERDUE");
    return {
      overdueCount: overdue.length,
      overdueValue: overdue.reduce((s, i) => s + openAmount(i.amountCents, i.receivedCents), 0),
      openValue: open.reduce((s, i) => s + openAmount(i.amountCents, i.receivedCents), 0),
    };
  }, [open]);

  async function handleMarkPaid(installmentId: string) {
    const method = paymentMethod[installmentId] || "PIX";
    try {
      setSavingId(installmentId);
      const res = await fetch("/api/finance/receivables/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId, paymentMethod: method }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao registrar pagamento.");
      setSuccessId(installmentId);
      setPaying(null);
      setTimeout(() => {
        setSuccessId(null);
        setItems((prev) =>
          prev.map((item) =>
            item.id === installmentId
              ? { ...item, status: "PAID", receivedCents: item.amountCents }
              : item
          )
        );
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar pagamento.");
    } finally {
      setSavingId(null);
    }
  }

  // Mantém selecionado só o que continua na lista (ao buscar ou após baixa).
  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filtered.some((item) => item.id === id))
    );
  }, [filtered]);

  const selectedTotalCents = useMemo(() => {
    return filtered.reduce((sum, item) => {
      return selectedIds.includes(item.id)
        ? sum + openAmount(item.amountCents, item.receivedCents)
        : sum;
    }, 0);
  }, [filtered, selectedIds]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : filtered.map((item) => item.id));
  }

  async function handleMarkSelectedPaid() {
    const selected = filtered.filter((item) => selectedIds.includes(item.id));
    if (!selected.length) return;

    const confirmed = window.confirm(
      `Confirmar recebimento de ${selected.length} título(s) • ${formatMoneyBR(selectedTotalCents)}?`
    );
    if (!confirmed) return;

    const paidIds: string[] = [];
    const failures: string[] = [];

    try {
      setBulkSaving(true);
      setBulkMessage(null);

      // Um título por vez, na mesma rota da baixa individual, usando a forma
      // de pagamento do próprio pedido.
      for (const item of selected) {
        try {
          const res = await fetch("/api/finance/receivables/receive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              installmentId: item.id,
              paymentMethod: item.accountsReceivable.paymentMethod || "PIX",
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok) throw new Error(json?.error || "erro ao receber");
          paidIds.push(item.id);
        } catch (err) {
          const orderNum = item.accountsReceivable.order?.number;
          failures.push(
            `${orderNum ? `Pedido #${orderNum}` : "Título"}: ${
              err instanceof Error ? err.message : "erro ao receber"
            }`
          );
        }
      }

      setItems((prev) =>
        prev.map((item) =>
          paidIds.includes(item.id)
            ? { ...item, status: "PAID", receivedCents: item.amountCents }
            : item
        )
      );
      setSelectedIds([]);

      setBulkMessage(
        failures.length
          ? `${paidIds.length} título(s) recebido(s). Não foi possível receber: ${failures.join("; ")}`
          : `${paidIds.length} título(s) recebido(s) com sucesso.`
      );
    } finally {
      setBulkSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 13,
  };

  return (
    <MobilePageFrame
      title="Contas a receber"
      subtitle="Títulos em aberto"
      desktopHref="/finance/receivables"
    >
      <MobileCard>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: colors.subtext,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, região ou pedido"
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px 0 38px",
              outline: "none",
              fontSize: 14,
            }}
          />
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando contas a receber...</MobileCard>
      ) : error ? (
        <MobileCard>
          <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{error}</div>
        </MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>Em atraso</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: "#ef4444" }}>
                {formatMoneyBR(summary.overdueValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                {summary.overdueCount} título{summary.overdueCount !== 1 ? "s" : ""}
              </div>
            </MobileCard>

            <MobileCard style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 700 }}>Em aberto</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: colors.primary }}>
                {formatMoneyBR(summary.openValue)}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: colors.subtext }}>
                {open.length} título{open.length !== 1 ? "s" : ""}
              </div>
            </MobileCard>
          </div>

          <MobileCard>
            <MobileSectionTitle title="Títulos" />

            {filtered.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.isDark ? "#0e1728" : "#f8fafc",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    color: colors.text,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={bulkSaving}
                    style={{ width: 18, height: 18 }}
                  />
                  {selectedIds.length
                    ? `${selectedIds.length} selecionado(s) • ${formatMoneyBR(selectedTotalCents)}`
                    : "Selecionar todos"}
                </label>

                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkSelectedPaid}
                    disabled={bulkSaving}
                    style={{
                      height: 40,
                      borderRadius: 12,
                      border: "none",
                      background: bulkSaving ? "#86efac" : "#16a34a",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: bulkSaving ? "not-allowed" : "pointer",
                      width: "100%",
                    }}
                  >
                    {bulkSaving ? "Recebendo..." : "Receber selecionados"}
                  </button>
                )}
              </div>
            )}

            {bulkMessage && (
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  color: bulkMessage.includes("Não foi possível") ? "#dc2626" : "#16a34a",
                }}
              >
                {bulkMessage}
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum título em aberto.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((item) => {
                  const openCents = openAmount(item.amountCents, item.receivedCents);
                  const isOverdue = item.status === "OVERDUE";
                  const clientName = item.accountsReceivable.order?.client?.name || "Cliente";
                  const orderNum = item.accountsReceivable.order?.number;
                  const isPaying = paying === item.id;
                  const isSaving = savingId === item.id;
                  const isSuccess = successId === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${isOverdue ? "#fca5a5" : colors.border}`,
                        background: isSuccess
                          ? (colors.isDark ? "#052e16" : "#f0fdf4")
                          : colors.isDark
                          ? "#111827"
                          : "#f8fafc",
                        padding: 14,
                        display: "grid",
                        gap: 10,
                        transition: "background 0.3s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          disabled={bulkSaving}
                          style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, lineHeight: 1.3 }}>
                            {clientName}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: colors.subtext }}>
                            {orderNum ? `Pedido #${orderNum}` : ""}
                            {item.installmentNumber && item.accountsReceivable.installmentCount
                              ? ` • Parcela ${item.installmentNumber}/${item.accountsReceivable.installmentCount}`
                              : ""}
                            {item.accountsReceivable.paymentMethod
                              ? ` • ${
                                  PAYMENT_METHODS.find(
                                    (m) => m.value === item.accountsReceivable.paymentMethod
                                  )?.label || item.accountsReceivable.paymentMethod
                                }`
                              : ""}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: isOverdue ? "#ef4444" : colors.text }}>
                            {formatMoneyBR(openCents)}
                          </div>
                          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                            {isOverdue ? <AlertTriangle size={12} color="#ef4444" /> : <CalendarDays size={12} color={colors.subtext} />}
                            <span style={{ fontSize: 11, color: isOverdue ? "#ef4444" : colors.subtext }}>
                              {formatDateBR(item.dueDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSuccess ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 800, fontSize: 13 }}>
                          <CheckCircle2 size={16} />
                          Pagamento registrado!
                        </div>
                      ) : isPaying ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          <select
                            value={paymentMethod[item.id] || "PIX"}
                            onChange={(e) =>
                              setPaymentMethod((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            style={inputStyle}
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => setPaying(null)}
                              style={{
                                height: 40,
                                borderRadius: 12,
                                border: `1px solid ${colors.border}`,
                                background: colors.cardBg,
                                color: colors.text,
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(item.id)}
                              disabled={isSaving}
                              style={{
                                height: 40,
                                borderRadius: 12,
                                border: "none",
                                background: isSaving ? "#86efac" : "#16a34a",
                                color: "#ffffff",
                                fontSize: 13,
                                fontWeight: 900,
                                cursor: isSaving ? "not-allowed" : "pointer",
                              }}
                            >
                              {isSaving ? "Salvando..." : "Confirmar"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPaying(item.id);
                            setPaymentMethod((prev) => ({
                              ...prev,
                              [item.id]: item.accountsReceivable.paymentMethod || "PIX",
                            }));
                          }}
                          style={{
                            height: 40,
                            borderRadius: 12,
                            border: "none",
                            background: colors.primary,
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 900,
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Marcar pagamento
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}
