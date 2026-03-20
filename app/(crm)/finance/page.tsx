"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type FinanceTransaction = {
  id: string;
  scope: "MATRIX" | "REGION";
  type: "INCOME" | "EXPENSE";
  status: "PENDING" | "PAID" | "CANCELLED";
  category:
    | "SALES"
    | "INVESTMENT"
    | "STOCK_PURCHASE"
    | "LOGISTICS"
    | "COMMISSION"
    | "TAX"
    | "ADMINISTRATIVE"
    | "PAYROLL"
    | "RENT"
    | "EXHIBITOR"
    | "UNIFORM"
    | "MARKETING"
    | "ACCOUNTING"
    | "INVESTOR_DISTRIBUTION"
    | "OTHER";
  description: string;
  amountCents: number;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  region?: {
    id: string;
    name: string;
  } | null;
};

type Region = {
  id: string;
  name: string;
};

type ReceivableInstallment = {
  id: string;
  installmentNumber: number;
  amountCents: number;
  dueDate: string;
  paidAt?: string | null;
  status: string;
  accountsReceivable?: {
    id: string;
    paymentMethod?: string | null;
    installmentCount?: number | null;
    region?: {
      id: string;
      name: string;
    } | null;
    order?: {
      id: string;
      number?: number | null;
      client?: {
        id: string;
        name?: string | null;
      } | null;
    } | null;
  } | null;
};

type CashTransferItem = {
  id: string;
  amountCents: number;
  status: string;
  transferredAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
  receipt?: {
    id: string;
    order?: {
      id: string;
      number?: number | null;
    } | null;
  } | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatMoneyBRFromCents(cents?: number | null) {
  const safe = cents ?? 0;
  return (safe / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthInput(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  return { year, month };
}

function categoryLabel(category: FinanceTransaction["category"]) {
  const map: Record<FinanceTransaction["category"], string> = {
    SALES: "Vendas",
    INVESTMENT: "Investimento",
    STOCK_PURCHASE: "Compra de estoque",
    LOGISTICS: "Logística",
    COMMISSION: "Comissão",
    TAX: "Impostos",
    ADMINISTRATIVE: "Administrativo",
    PAYROLL: "Folha",
    RENT: "Aluguel",
    EXHIBITOR: "Expositor",
    UNIFORM: "Uniforme",
    MARKETING: "Marketing",
    ACCOUNTING: "Contabilidade",
    INVESTOR_DISTRIBUTION: "Distribuição investidor",
    OTHER: "Outros",
  };

  return map[category] ?? category;
}

function statusLabel(status: string) {
  if (status === "PAID") return "Pago";
  if (status === "CANCELLED" || status === "CANCELED") return "Cancelado";
  if (status === "OVERDUE") return "Vencido";
  if (status === "PARTIAL") return "Parcial";
  if (status === "TRANSFERRED") return "Transferido";
  return "Pendente";
}

function statusColors(status: string) {
  if (status === "PAID" || status === "TRANSFERRED") {
    return {
      bg: "rgba(34,197,94,0.14)",
      color: "#16a34a",
      border: "rgba(34,197,94,0.24)",
    };
  }

  if (status === "CANCELLED" || status === "CANCELED") {
    return {
      bg: "rgba(239,68,68,0.14)",
      color: "#dc2626",
      border: "rgba(239,68,68,0.24)",
    };
  }

  if (status === "OVERDUE") {
    return {
      bg: "rgba(239,68,68,0.14)",
      color: "#dc2626",
      border: "rgba(239,68,68,0.24)",
    };
  }

  return {
    bg: "rgba(245,158,11,0.14)",
    color: "#d97706",
    border: "rgba(245,158,11,0.24)",
  };
}

function normalizeRegionsPayload(data: unknown): Region[] {
  if (Array.isArray(data)) {
    return data
      .filter(
        (item): item is Region =>
          !!item &&
          typeof item === "object" &&
          "id" in item &&
          "name" in item &&
          typeof (item as Region).id === "string" &&
          typeof (item as Region).name === "string"
      )
      .map((item) => ({
        id: item.id,
        name: item.name,
      }));
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const typed = data as {
    regions?: unknown;
    items?: unknown;
    data?: unknown;
  };

  if (Array.isArray(typed.regions)) {
    return normalizeRegionsPayload(typed.regions);
  }

  if (Array.isArray(typed.items)) {
    return normalizeRegionsPayload(typed.items);
  }

  if (Array.isArray(typed.data)) {
    return normalizeRegionsPayload(typed.data);
  }

  return [];
}

function monthMatches(dateValue: string | null | undefined, monthValue: string) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return toMonthInputValue(date) === monthValue;
}

function orderNumberLabel(value?: number | null) {
  if (!value) return "-";
  return `PED-${String(value).padStart(4, "0")}`;
}

function daysLate(dueDate: string) {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return 0;

  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diff = startToday.getTime() - startDue.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function DashboardCard({
  title,
  value,
  subtitle,
  valueColor,
  theme,
}: {
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
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
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
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
          color: valueColor || theme.text,
        }}
      >
        {value}
      </div>

      {subtitle ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: theme.subtext,
            lineHeight: 1.45,
          }}
        >
          {subtitle}
        </div>
      ) : null}
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
  type = "button",
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  type?: "button" | "submit";
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
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: 10,
        border: primary
          ? `1px solid ${theme.primary}`
          : `1px solid ${theme.border}`,
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

function StatusBadge({
  status,
  theme,
}: {
  status: string;
  theme: ThemeShape;
}) {
  const badge = statusColors(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.border}`,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function FinancePage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const today = new Date();

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [receivables, setReceivables] = useState<ReceivableInstallment[]>([]);
  const [cashTransfers, setCashTransfers] = useState<CashTransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    toMonthInputValue(today)
  );

  const [scope, setScope] = useState<"MATRIX" | "REGION">("REGION");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [category, setCategory] =
    useState<FinanceTransaction["category"]>("LOGISTICS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [regionId, setRegionId] = useState("");
  const [dueDate, setDueDate] = useState(toLocalDateInputValue(today));
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  async function loadTransactions() {
    const res = await fetch("/api/finance", { cache: "no-store" });
    if (!res.ok) throw new Error("Erro ao carregar lançamentos");
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
  }

  async function loadRegions() {
    const res = await fetch("/api/regions", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        (data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : null) || "Erro ao carregar regiões"
      );
    }

    setRegions(normalizeRegionsPayload(data));
  }

  async function loadReceivables() {
    const res = await fetch("/api/finance/receivables", { cache: "no-store" });
    if (!res.ok) throw new Error("Erro ao carregar contas a receber");
    const data = await res.json();
    setReceivables(Array.isArray(data) ? data : []);
  }

  async function loadCashTransfers() {
    const res = await fetch("/api/finance/transfers", { cache: "no-store" });
    if (!res.ok) throw new Error("Erro ao carregar repasses");
    const data = await res.json();
    setCashTransfers(Array.isArray(data) ? data : []);
  }

  async function loadAll() {
    try {
      setPageError(null);

      await Promise.all([
        loadTransactions(),
        loadRegions(),
        loadReceivables(),
        loadCashTransfers(),
      ]);
    } catch (err: any) {
      console.error(err);
      setTransactions([]);
      setRegions([]);
      setReceivables([]);
      setCashTransfers([]);
      setPageError(err?.message || "Erro ao carregar dados do financeiro.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (scope === "MATRIX") {
      setRegionId("");
    }
  }, [scope]);

  const monthlyExpenseTransactions = useMemo(() => {
    return transactions
      .filter((item) => item.status !== "CANCELLED")
      .filter((item) => item.type === "EXPENSE")
      .filter((item) => {
        const referenceDate = item.paidAt || item.createdAt;
        return monthMatches(referenceDate, selectedMonth);
      })
      .sort((a, b) => {
        const dateA = new Date(a.paidAt || a.createdAt).getTime();
        const dateB = new Date(b.paidAt || b.createdAt).getTime();
        return dateB - dateA;
      });
  }, [transactions, selectedMonth]);

  const paidInstallmentsInMonth = useMemo(() => {
    return receivables.filter((item) => {
      if (item.status !== "PAID") return false;
      return monthMatches(item.paidAt || item.dueDate, selectedMonth);
    });
  }, [receivables, selectedMonth]);

  const paidBoletoInstallments = useMemo(() => {
    return paidInstallmentsInMonth.filter(
      (item) => item.accountsReceivable?.paymentMethod === "BOLETO"
    );
  }, [paidInstallmentsInMonth]);

  const paidPixInstallments = useMemo(() => {
    return paidInstallmentsInMonth.filter(
      (item) => item.accountsReceivable?.paymentMethod === "PIX"
    );
  }, [paidInstallmentsInMonth]);

  const monthlyRevenueExpense = useMemo(() => {
    const revenueCents = paidInstallmentsInMonth.reduce(
      (acc, item) => acc + (item.amountCents ?? 0),
      0
    );

    const expenseCents = monthlyExpenseTransactions.reduce(
      (acc, item) => acc + (item.amountCents ?? 0),
      0
    );

    return {
      revenueCents,
      expenseCents,
      balanceCents: revenueCents - expenseCents,
    };
  }, [paidInstallmentsInMonth, monthlyExpenseTransactions]);

  const cashBoxSummary = useMemo(() => {
    const pendingTransfers = cashTransfers.filter(
      (item) => item.status === "PENDING"
    );
    const transferredTransfers = cashTransfers.filter(
      (item) => item.status === "TRANSFERRED"
    );

    const matrixCashCents = transferredTransfers.reduce(
      (acc, item) => acc + (item.amountCents ?? 0),
      0
    );

    const regionsMap = new Map<
      string,
      {
        regionId: string;
        regionName: string;
        pendingCents: number;
        transferredCents: number;
        totalCents: number;
      }
    >();

    for (const region of regions) {
      regionsMap.set(region.id, {
        regionId: region.id,
        regionName: region.name,
        pendingCents: 0,
        transferredCents: 0,
        totalCents: 0,
      });
    }

    for (const transfer of cashTransfers) {
      const regionIdValue = transfer.region?.id;
      const regionNameValue = transfer.region?.name || "Sem região";
      const amount = transfer.amountCents ?? 0;

      if (!regionIdValue) continue;

      const current = regionsMap.get(regionIdValue) || {
        regionId: regionIdValue,
        regionName: regionNameValue,
        pendingCents: 0,
        transferredCents: 0,
        totalCents: 0,
      };

      if (transfer.status === "PENDING") {
        current.pendingCents += amount;
      }

      if (transfer.status === "TRANSFERRED") {
        current.transferredCents += amount;
      }

      current.totalCents += amount;
      regionsMap.set(regionIdValue, current);
    }

    const regionBoxes = Array.from(regionsMap.values()).sort((a, b) =>
      a.regionName.localeCompare(b.regionName, "pt-BR")
    );

    const regionalPendingCents = regionBoxes.reduce(
      (acc, item) => acc + item.pendingCents,
      0
    );

    return {
      matrixCashCents,
      regionalPendingCents,
      totalCashCents: matrixCashCents + regionalPendingCents,
      regionBoxes,
      pendingTransfers,
    };
  }, [cashTransfers, regions]);

  const overdueBoletos = useMemo(() => {
    const todayStart = startOfToday();

    return receivables
      .filter((item) => item.accountsReceivable?.paymentMethod === "BOLETO")
      .filter((item) => item.status !== "PAID")
      .filter((item) => {
        const due = new Date(item.dueDate);
        if (Number.isNaN(due.getTime())) return false;
        return due < todayStart;
      })
      .sort((a, b) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [receivables]);

  const pendingTransfers = useMemo(() => {
    return cashTransfers
      .filter((item) => item.status === "PENDING")
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || "").getTime();
        const dateB = new Date(b.createdAt || "").getTime();
        return dateB - dateA;
      });
  }, [cashTransfers]);

  const launchReport = useMemo(() => {
    return [...transactions]
      .filter((item) => item.status !== "CANCELLED")
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [transactions]);

  const totalPaidBoletosCents = useMemo(() => {
    return paidBoletoInstallments.reduce(
      (acc, item) => acc + (item.amountCents ?? 0),
      0
    );
  }, [paidBoletoInstallments]);

  const totalPaidPixCents = useMemo(() => {
    return paidPixInstallments.reduce(
      (acc, item) => acc + (item.amountCents ?? 0),
      0
    );
  }, [paidPixInstallments]);

  const totalBoxesCents = useMemo(() => {
    return (
      cashBoxSummary.totalCashCents + totalPaidBoletosCents + totalPaidPixCents
    );
  }, [cashBoxSummary.totalCashCents, totalPaidBoletosCents, totalPaidPixCents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const normalizedAmount = Number(
        amount.replaceAll(".", "").replace(",", ".")
      );

      if (!description.trim()) {
        throw new Error("Informe a descrição.");
      }

      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        throw new Error("Informe um valor válido.");
      }

      if (scope === "REGION" && !regionId) {
        throw new Error("Selecione uma região para lançamento regional.");
      }

      const amountCents = Math.round(normalizedAmount * 100);

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          type,
          category,
          description: description.trim(),
          amountCents,
          regionId: scope === "REGION" ? regionId : null,
          dueDate: dueDate || null,
          paidAt: paid ? new Date().toISOString() : null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar lançamento.");
      }

      setDescription("");
      setAmount("");
      setNotes("");
      setPaid(false);
      setScope("REGION");
      setType("EXPENSE");
      setCategory("LOGISTICS");
      setRegionId("");
      setDueDate(toLocalDateInputValue(new Date()));

      await loadAll();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  }

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
        Carregando financeiro...
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
          flexDirection: "column",
          gap: 8,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: theme.subtext,
          }}
        >
          🏠 / Financeiro
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              Financeiro
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: theme.subtext,
              }}
            >
              Painel de caixas, boletos, repasses, despesas e receitas do mês.
            </div>
          </div>

          <ActionButton
            label="Atualizar painel"
            theme={theme}
            onClick={loadAll}
          />
        </div>
      </div>

      {pageError ? (
        <div
          style={{
            marginBottom: 18,
            borderRadius: 12,
            padding: 12,
            fontSize: 14,
            background: theme.isDark ? "rgba(127,29,29,0.25)" : "#fef2f2",
            border: theme.isDark
              ? "1px solid rgba(248,113,113,0.35)"
              : "1px solid #fecaca",
            color: theme.isDark ? "#fecaca" : "#b91c1c",
          }}
        >
          {pageError}
        </div>
      ) : null}

      <Block title="Novo lançamento" theme={theme}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          {error ? (
            <div
              style={{
                borderRadius: 12,
                padding: 12,
                fontSize: 14,
                background: theme.isDark ? "rgba(127,29,29,0.25)" : "#fef2f2",
                border: theme.isDark
                  ? "1px solid rgba(248,113,113,0.35)"
                  : "1px solid #fecaca",
                color: theme.isDark ? "#fecaca" : "#b91c1c",
              }}
            >
              {error}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            }}
          >
            <div>
              <label style={label(theme)}>Escopo</label>
              <select
                style={input(theme, inputBg)}
                value={scope}
                onChange={(e) => setScope(e.target.value as "MATRIX" | "REGION")}
              >
                <option value="REGION">Região</option>
                <option value="MATRIX">Matriz</option>
              </select>
            </div>

            <div>
              <label style={label(theme)}>Tipo</label>
              <select
                style={input(theme, inputBg)}
                value={type}
                onChange={(e) => setType(e.target.value as "INCOME" | "EXPENSE")}
              >
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saída</option>
              </select>
            </div>

            <div>
              <label style={label(theme)}>Categoria</label>
              <select
                style={input(theme, inputBg)}
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as FinanceTransaction["category"])
                }
              >
                <option value="SALES">Vendas</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="STOCK_PURCHASE">Compra de estoque</option>
                <option value="LOGISTICS">Logística</option>
                <option value="COMMISSION">Comissão</option>
                <option value="TAX">Impostos</option>
                <option value="ADMINISTRATIVE">Administrativo</option>
                <option value="PAYROLL">Folha</option>
                <option value="RENT">Aluguel</option>
                <option value="EXHIBITOR">Expositor</option>
                <option value="UNIFORM">Uniforme</option>
                <option value="MARKETING">Marketing</option>
                <option value="ACCOUNTING">Contabilidade</option>
                <option value="INVESTOR_DISTRIBUTION">Distribuição investidor</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>

            <div>
              <label style={label(theme)}>Região</label>
              <select
                style={{
                  ...input(theme, inputBg),
                  opacity: scope === "MATRIX" ? 0.7 : 1,
                }}
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                disabled={scope === "MATRIX"}
              >
                <option value="">
                  {regions.length === 0 ? "Nenhuma região encontrada" : "Selecione"}
                </option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <label style={label(theme)}>Descrição</label>
              <input
                type="text"
                style={input(theme, inputBg)}
                placeholder="Ex.: combustível, aluguel, pagamento fornecedor..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={label(theme)}>Valor</label>
              <input
                type="text"
                style={input(theme, inputBg)}
                placeholder="Ex.: 150,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label style={label(theme)}>Vencimento</label>
              <input
                type="date"
                style={input(theme, inputBg)}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "span 4" }}>
              <label style={label(theme)}>Observações</label>
              <textarea
                style={textarea(theme, inputBg)}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: theme.text,
            }}
          >
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />
            Marcar como pago no lançamento
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            <ActionButton
              label={saving ? "Salvando..." : "Salvar lançamento"}
              theme={theme}
              primary
              disabled={saving}
              type="submit"
            />
          </div>
        </form>
      </Block>

      <div style={{ height: 18 }} />

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          marginBottom: 18,
        }}
      >
        <DashboardCard
          title="Caixa dinheiro"
          value={formatMoneyBRFromCents(cashBoxSummary.totalCashCents)}
          valueColor="#2563eb"
          subtitle={`Matriz: ${formatMoneyBRFromCents(
            cashBoxSummary.matrixCashCents
          )} · Regiões aguardando repasse: ${formatMoneyBRFromCents(
            cashBoxSummary.regionalPendingCents
          )}`}
          theme={theme}
        />

        <DashboardCard
          title="Caixa boletos"
          value={formatMoneyBRFromCents(totalPaidBoletosCents)}
          valueColor="#16a34a"
          subtitle={`Boletos pagos no mês ${selectedMonth}`}
          theme={theme}
        />

        <DashboardCard
          title="Caixa Pix"
          value={formatMoneyBRFromCents(totalPaidPixCents)}
          valueColor="#16a34a"
          subtitle={`Pix recebidos no mês ${selectedMonth}`}
          theme={theme}
        />

        <DashboardCard
          title="Total em caixas"
          value={formatMoneyBRFromCents(totalBoxesCents)}
          valueColor="#111827"
          subtitle="Soma de dinheiro, boletos pagos e pix"
          theme={theme}
        />
      </div>

      <Block title="Caixa dinheiro por local" theme={theme}>
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
        >
          <DashboardCard
            title="Matriz"
            value={formatMoneyBRFromCents(cashBoxSummary.matrixCashCents)}
            valueColor="#16a34a"
            subtitle="Valor já repassado da região para a matriz"
            theme={theme}
          />

          {cashBoxSummary.regionBoxes.map((item) => (
            <DashboardCard
              key={item.regionId}
              title={item.regionName}
              value={formatMoneyBRFromCents(item.pendingCents)}
              valueColor={item.pendingCents > 0 ? "#ca8a04" : "#2563eb"}
              subtitle={`Aguardando repasse: ${formatMoneyBRFromCents(
                item.pendingCents
              )} · Já repassado: ${formatMoneyBRFromCents(item.transferredCents)}`}
              theme={theme}
            />
          ))}
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block
        title="Receitas x despesas do mês"
        theme={theme}
        right={
          <div style={{ minWidth: 170 }}>
            <label style={label(theme)}>Mês</label>
            <input
              type="month"
              style={input(theme, inputBg)}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        }
      >
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          <DashboardCard
            title="Receitas do mês"
            value={formatMoneyBRFromCents(monthlyRevenueExpense.revenueCents)}
            valueColor="#16a34a"
            subtitle="Recebimentos pagos no mês selecionado"
            theme={theme}
          />

          <DashboardCard
            title="Despesas do mês"
            value={formatMoneyBRFromCents(monthlyRevenueExpense.expenseCents)}
            valueColor="#dc2626"
            subtitle="Saídas lançadas no mês selecionado"
            theme={theme}
          />

          <DashboardCard
            title="Saldo do mês"
            value={formatMoneyBRFromCents(monthlyRevenueExpense.balanceCents)}
            valueColor={
              monthlyRevenueExpense.balanceCents >= 0 ? "#2563eb" : "#dc2626"
            }
            subtitle="Receita menos despesa do mês selecionado"
            theme={theme}
          />
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Boletos em atraso" theme={theme}>
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
              minWidth: 960,
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                }}
              >
                <th style={th(theme, "left")}>Cliente</th>
                <th style={th(theme, "left")}>Pedido</th>
                <th style={th(theme, "left")}>Parcela</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Vencimento</th>
                <th style={th(theme, "left")}>Dias em atraso</th>
                <th style={th(theme, "left")}>Acesso rápido</th>
              </tr>
            </thead>

            <tbody>
              {overdueBoletos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhum boleto em atraso encontrado.
                  </td>
                </tr>
              ) : (
                overdueBoletos.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td style={td(theme)}>
                      {item.accountsReceivable?.order?.client?.name || "-"}
                    </td>
                    <td style={td(theme)}>
                      {orderNumberLabel(item.accountsReceivable?.order?.number)}
                    </td>
                    <td style={td(theme)}>
                      {item.installmentNumber}/
                      {item.accountsReceivable?.installmentCount || 1}
                    </td>
                    <td style={{ ...td(theme), fontWeight: 700 }}>
                      {formatMoneyBRFromCents(item.amountCents)}
                    </td>
                    <td style={td(theme)}>{formatDateBR(item.dueDate)}</td>
                    <td style={{ ...td(theme), color: "#dc2626", fontWeight: 800 }}>
                      {daysLate(item.dueDate)} dias
                    </td>
                    <td style={td(theme)}>
                      <ActionButton
                        label="Abrir boleto"
                        theme={theme}
                        onClick={() =>
                          alert("Botão do boleto ainda não está ativo.")
                        }
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Transferências pendentes da região para a matriz" theme={theme}>
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
                <th style={th(theme, "left")}>Região</th>
                <th style={th(theme, "left")}>Pedido</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Status</th>
                <th style={th(theme, "left")}>Observações</th>
              </tr>
            </thead>

            <tbody>
              {pendingTransfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhuma transferência pendente encontrada.
                  </td>
                </tr>
              ) : (
                pendingTransfers.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td style={td(theme)}>
                      {formatDateTimeBR(item.createdAt || item.transferredAt)}
                    </td>
                    <td style={td(theme)}>{item.region?.name || "-"}</td>
                    <td style={td(theme)}>
                      {orderNumberLabel(item.receipt?.order?.number)}
                    </td>
                    <td style={{ ...td(theme), fontWeight: 700 }}>
                      {formatMoneyBRFromCents(item.amountCents)}
                    </td>
                    <td style={td(theme)}>
                      <StatusBadge status={item.status} theme={theme} />
                    </td>
                    <td style={td(theme)}>{item.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Histórico de pagamentos e saídas" theme={theme}>
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
              minWidth: 1100,
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                }}
              >
                <th style={th(theme, "left")}>Data</th>
                <th style={th(theme, "left")}>Escopo</th>
                <th style={th(theme, "left")}>Região</th>
                <th style={th(theme, "left")}>Categoria</th>
                <th style={th(theme, "left")}>Descrição</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Status</th>
              </tr>
            </thead>

            <tbody>
              {monthlyExpenseTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhuma despesa encontrada para o mês selecionado.
                  </td>
                </tr>
              ) : (
                monthlyExpenseTransactions.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td style={td(theme)}>
                      {formatDateTimeBR(item.paidAt || item.createdAt)}
                    </td>
                    <td style={td(theme)}>
                      {item.scope === "MATRIX" ? "Matriz" : "Região"}
                    </td>
                    <td style={td(theme)}>{item.region?.name || "Matriz"}</td>
                    <td style={td(theme)}>{categoryLabel(item.category)}</td>
                    <td style={td(theme)}>{item.description}</td>
                    <td style={{ ...td(theme), color: "#dc2626", fontWeight: 800 }}>
                      {formatMoneyBRFromCents(item.amountCents)}
                    </td>
                    <td style={td(theme)}>
                      <StatusBadge status={item.status} theme={theme} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Relatório de lançamentos" theme={theme}>
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
              minWidth: 1160,
            }}
          >
            <thead>
              <tr
                style={{
                  background: theme.isDark ? "#0b1324" : "#f8fafc",
                }}
              >
                <th style={th(theme, "left")}>Data</th>
                <th style={th(theme, "left")}>Escopo</th>
                <th style={th(theme, "left")}>Região</th>
                <th style={th(theme, "left")}>Tipo</th>
                <th style={th(theme, "left")}>Categoria</th>
                <th style={th(theme, "left")}>Descrição</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Status</th>
                <th style={th(theme, "left")}>Vencimento</th>
              </tr>
            </thead>

            <tbody>
              {launchReport.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      padding: 16,
                      textAlign: "center",
                      color: theme.subtext,
                      background: theme.cardBg,
                    }}
                  >
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                launchReport.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      background: theme.cardBg,
                    }}
                  >
                    <td style={td(theme)}>{formatDateTimeBR(item.createdAt)}</td>
                    <td style={td(theme)}>
                      {item.scope === "MATRIX" ? "Matriz" : "Região"}
                    </td>
                    <td style={td(theme)}>{item.region?.name || "Matriz"}</td>
                    <td
                      style={{
                        ...td(theme),
                        fontWeight: 700,
                        color: item.type === "INCOME" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {item.type === "INCOME" ? "Entrada" : "Saída"}
                    </td>
                    <td style={td(theme)}>{categoryLabel(item.category)}</td>
                    <td style={td(theme)}>{item.description}</td>
                    <td style={{ ...td(theme), fontWeight: 700 }}>
                      {formatMoneyBRFromCents(item.amountCents)}
                    </td>
                    <td style={td(theme)}>
                      <StatusBadge status={item.status} theme={theme} />
                    </td>
                    <td style={td(theme)}>{formatDateBR(item.dueDate)}</td>
                  </tr>
                ))
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

function textarea(theme: ThemeShape, inputBg: string): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 100,
    padding: 12,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
    resize: "vertical",
  };
}

function th(
  theme: ThemeShape,
  textAlign: "left" | "center" = "left"
): React.CSSProperties {
  return {
    padding: "12px 14px",
    textAlign,
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