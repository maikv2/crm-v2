"use client";

import { getThemeColors } from "@/lib/theme";

type ThemeShape = ReturnType<typeof getThemeColors>;

export type PaymentMethodValue =
  | "CASH"
  | "PIX"
  | "BOLETO"
  | "CARD_DEBIT"
  | "CARD_CREDIT";

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodValue; label: string }[] = [
  { value: "CASH", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CARD_DEBIT", label: "Cartão débito" },
  { value: "CARD_CREDIT", label: "Cartão crédito" },
];

function needsDueDate(method: PaymentMethodValue) {
  return method === "BOLETO" || method === "PIX" || method === "CARD_CREDIT";
}

export type PaymentSplitLine = {
  key: string;
  /** id de uma AccountsReceivable já existente (só em edição) */
  id?: string;
  paymentMethod: PaymentMethodValue;
  /** valor em texto (ex: "123,45") — mesmo padrão dos outros campos de moeda do sistema */
  amountValue: string;
  dueDate: string;
  installmentCount: number;
  installmentDates: string[];
  /** informativo (edição): quanto já foi recebido nessa divisão — trava remoção/redução */
  receivedCents?: number;
};

// ─── Moeda ──────────────────────────────────────────────────────────────────

export function centsFromCurrencyInput(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const sanitized = raw.replace(/[^\d.,-]/g, "");
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  let decimalSeparator = "";

  if (lastComma >= 0 && lastDot >= 0) {
    decimalSeparator = lastComma > lastDot ? "," : ".";
  } else {
    const separator = lastComma >= 0 ? "," : lastDot >= 0 ? "." : "";
    if (separator) {
      const decimals = sanitized.length - sanitized.lastIndexOf(separator) - 1;
      decimalSeparator = decimals === 1 || decimals === 2 ? separator : "";
    }
  }

  const normalized = decimalSeparator
    ? sanitized
        .replace(new RegExp(`\\${decimalSeparator === "," ? "." : ","}`, "g"), "")
        .replace(decimalSeparator, ".")
    : sanitized.replace(/[.,]/g, "");

  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

export function currencyInputFromCents(value?: number | null) {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function addMonthsToDateInput(value: string, months: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `split-${Date.now()}-${keyCounter}`;
}

/** Uma única divisão cobrindo o total inteiro, forma padrão "Dinheiro". */
export function makeDefaultSplits(totalCents: number): PaymentSplitLine[] {
  return [
    {
      key: newKey(),
      paymentMethod: "CASH",
      amountValue: currencyInputFromCents(totalCents),
      dueDate: "",
      installmentCount: 1,
      installmentDates: [""],
    },
  ];
}

/** Hidrata o editor a partir das AccountsReceivable de um pedido existente. */
export function splitsFromAccountsReceivables(
  receivables: Array<{
    id: string;
    paymentMethod: string;
    amountCents: number;
    receivedCents?: number | null;
    status?: string | null;
    installmentCount?: number | null;
    installments?: Array<{
      installmentNumber: number;
      dueDate: string;
      status?: string | null;
    }> | null;
  }>
): PaymentSplitLine[] {
  const active = receivables.filter((item) => item.status !== "CANCELED");
  if (!active.length) return makeDefaultSplits(0);

  return active.map((receivable) => {
    const openInstallments = (receivable.installments ?? [])
      .filter((item) => item.status !== "PAID")
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
    const dates = openInstallments.map((item) => (item.dueDate ? item.dueDate.slice(0, 10) : ""));

    return {
      key: newKey(),
      id: receivable.id,
      paymentMethod: (receivable.paymentMethod as PaymentMethodValue) ?? "CASH",
      amountValue: currencyInputFromCents(receivable.amountCents),
      dueDate: dates[0] || "",
      installmentCount: Math.max(1, dates.length || 1),
      installmentDates: dates.length ? dates : [""],
      receivedCents: receivable.receivedCents ?? 0,
    };
  });
}

/** Payload pronto para enviar em `payments` no POST/PATCH de pedidos. */
export function splitsToPayload(splits: PaymentSplitLine[]) {
  return splits.map((split) => ({
    id: split.id,
    paymentMethod: split.paymentMethod,
    amountCents: centsFromCurrencyInput(split.amountValue),
    dueDate: needsDueDate(split.paymentMethod) ? split.dueDate || undefined : undefined,
    installmentCount: needsDueDate(split.paymentMethod) ? split.installmentCount : 1,
    installmentDates: needsDueDate(split.paymentMethod) ? split.installmentDates : [],
  }));
}

export function splitsSumCents(splits: PaymentSplitLine[]) {
  return splits.reduce((sum, split) => sum + centsFromCurrencyInput(split.amountValue), 0);
}

/** Valida se cada divisão que precisa de vencimento tem todas as datas preenchidas. */
export function splitsMissingDates(splits: PaymentSplitLine[]) {
  return splits.some(
    (split) =>
      needsDueDate(split.paymentMethod) &&
      (!split.dueDate ||
        split.installmentDates.slice(0, split.installmentCount).some((date) => !date))
  );
}

type Props = {
  theme: ThemeShape;
  totalCents: number;
  value: PaymentSplitLine[];
  onChange: (next: PaymentSplitLine[]) => void;
};

export default function PaymentSplitsEditor({ theme, totalCents, value, onChange }: Props) {
  const sumCents = splitsSumCents(value);
  const matches = sumCents === totalCents;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };

  function updateSplit(key: string, patch: Partial<PaymentSplitLine>) {
    onChange(value.map((split) => (split.key === key ? { ...split, ...patch } : split)));
  }

  function setInstallmentCount(key: string, count: number) {
    const safeCount = Math.max(1, count);
    onChange(
      value.map((split) => {
        if (split.key !== key) return split;
        const dates = Array.from({ length: safeCount }, (_, index) => {
          if (split.installmentDates[index]) return split.installmentDates[index];
          return split.dueDate ? addMonthsToDateInput(split.dueDate, index) : "";
        });
        return { ...split, installmentCount: safeCount, installmentDates: dates };
      })
    );
  }

  function setInstallmentDate(key: string, index: number, date: string) {
    onChange(
      value.map((split) => {
        if (split.key !== key) return split;
        const dates = [...split.installmentDates];
        dates[index] = date;
        return { ...split, installmentDates: dates };
      })
    );
  }

  function addSplit() {
    const remaining = Math.max(0, totalCents - sumCents);
    onChange([
      ...value,
      {
        key: newKey(),
        paymentMethod: "CASH",
        amountValue: currencyInputFromCents(remaining),
        dueDate: "",
        installmentCount: 1,
        installmentDates: [""],
      },
    ]);
  }

  function removeSplit(key: string) {
    onChange(value.filter((split) => split.key !== key));
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {value.map((split) => {
        const locked = (split.receivedCents ?? 0) > 0;
        const showInstallments = needsDueDate(split.paymentMethod);

        return (
          <div
            key={split.key}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 14,
              padding: 12,
              display: "grid",
              gap: 10,
              background: theme.isDark ? "#0b1324" : "#f8fafc",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "center" }}>
              <select
                value={split.paymentMethod}
                onChange={(e) =>
                  updateSplit(split.key, { paymentMethod: e.target.value as PaymentMethodValue })
                }
                style={inputStyle}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                inputMode="decimal"
                value={split.amountValue}
                onChange={(e) => updateSplit(split.key, { amountValue: e.target.value })}
                placeholder="0,00"
                style={{ ...inputStyle, textAlign: "right" }}
              />

              {locked ? (
                <div
                  title={`Já recebido: ${money(split.receivedCents ?? 0)} — não pode ser removida`}
                  style={{ fontSize: 12, color: theme.subtext, fontWeight: 700, whiteSpace: "nowrap" }}
                >
                  🔒 recebido
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => removeSplit(split.key)}
                  disabled={value.length <= 1}
                  style={{
                    height: 44,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: `1px solid ${theme.border}`,
                    background: theme.cardBg,
                    color: value.length <= 1 ? theme.subtext : "#ef4444",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: value.length <= 1 ? "not-allowed" : "pointer",
                    opacity: value.length <= 1 ? 0.5 : 1,
                  }}
                >
                  Remover
                </button>
              )}
            </div>

            {locked && (
              <div style={{ fontSize: 12, color: theme.subtext }}>
                Já recebido nessa forma: {money(split.receivedCents ?? 0)}. O valor não pode ficar
                menor do que isso.
              </div>
            )}

            {showInstallments && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }}>
                  <input
                    type="date"
                    value={split.dueDate}
                    onChange={(e) => {
                      const nextDates = split.installmentDates.map((d, index) =>
                        d ? d : addMonthsToDateInput(e.target.value, index)
                      );
                      updateSplit(split.key, {
                        dueDate: e.target.value,
                        installmentDates: nextDates.length ? nextDates : [e.target.value],
                      });
                    }}
                    style={inputStyle}
                  />
                  <select
                    value={split.installmentCount}
                    onChange={(e) => setInstallmentCount(split.key, Number(e.target.value))}
                    style={inputStyle}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>
                        {count}x
                      </option>
                    ))}
                  </select>
                </div>

                {split.installmentCount > 1 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {Array.from({ length: split.installmentCount }, (_, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: theme.subtext }}>
                          {index + 1}ª parcela
                        </div>
                        <input
                          type="date"
                          value={split.installmentDates[index] ?? ""}
                          onChange={(e) => setInstallmentDate(split.key, index, e.target.value)}
                          style={{ ...inputStyle, height: 38 }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addSplit}
        style={{
          height: 42,
          borderRadius: 12,
          border: `1px dashed ${theme.border}`,
          background: "transparent",
          color: theme.primary,
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        + Adicionar forma de pagamento
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 700,
          color: matches ? "#16a34a" : "#ef4444",
        }}
      >
        <span>
          Total das formas de pagamento: {money(sumCents)} / {money(totalCents)}
        </span>
        {!matches && (
          <span>
            {sumCents > totalCents ? "excedeu" : "faltam"} {money(Math.abs(totalCents - sumCents))}
          </span>
        )}
      </div>
    </div>
  );
}
