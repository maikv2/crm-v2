"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  amountCents: number;
  dueDate: string;
  status: string;
};

type RegionCashItem = {
  id: string;
  amountCents: number;
  status: string;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
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

function statusLabel(status: FinanceTransaction["status"]) {
  if (status === "PAID") return "Pago";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendente";
}

function statusColors(status: FinanceTransaction["status"]) {
  if (status === "PAID") {
    return {
      bg: "rgba(34,197,94,0.14)",
      color: "#16a34a",
      border: "rgba(34,197,94,0.24)",
    };
  }

  if (status === "CANCELLED") {
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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function DashboardCard({
  title,
  value,
  valueColor,
  theme,
}: {
  title: string;
  value: string;
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
    </div>
  );
}

function SummaryPanel({
  title,
  income,
  expense,
  balance,
  theme,
}: {
  title: string;
  income: number;
  expense: number;
  balance: number;
  theme: ThemeShape;
}) {
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

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
          fontSize: 14,
          fontWeight: 800,
          color: theme.text,
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          background: subtleCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: theme.subtext }}>Entradas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>
            {formatMoneyBRFromCents(income)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: theme.subtext }}>Saídas</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>
            {formatMoneyBRFromCents(expense)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: theme.subtext }}>Saldo</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: balance >= 0 ? "#2563eb" : "#dc2626",
            }}
          >
            {formatMoneyBRFromCents(balance)}
          </div>
        </div>
      </div>
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
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 36,
        padding: "0 14px",
        borderRadius: 10,
        border: primary ? `1px solid ${theme.primary}` : `1px solid ${theme.border}`,
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

function NavCard({
  href,
  title,
  subtitle,
  theme,
}: {
  href: string;
  title: string;
  subtitle: string;
  theme: ThemeShape;
}) {
  const [hover, setHover] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "block",
        textDecoration: "none",
        background: hover ? (theme.isDark ? "#172036" : "#eff6ff") : theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 18,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.20)"
          : "0 8px 24px rgba(15,23,42,0.05)",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: theme.text,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 13,
          color: theme.subtext,
        }}
      >
        {subtitle}
      </div>
    </Link>
  );
}

export default function FinancePage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [receivables, setReceivables] = useState<ReceivableInstallment[]>([]);
  const [regionCash, setRegionCash] = useState<RegionCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startDate, setStartDate] = useState(toLocalDateInputValue(firstDayOfMonth));
  const [endDate, setEndDate] = useState(toLocalDateInputValue(lastDayOfMonth));
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");

  const [scope, setScope] = useState<"MATRIX" | "REGION">("REGION");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [category, setCategory] = useState<FinanceTransaction["category"]>("LOGISTICS");
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

  async function loadRegionCash() {
    const res = await fetch("/api/finance/region-cash", { cache: "no-store" });
    if (!res.ok) throw new Error("Erro ao carregar caixa da região");
    const data = await res.json();
    setRegionCash(Array.isArray(data) ? data : []);
  }

  async function loadAll() {
    try {
      setPageError(null);

      await Promise.all([
        loadTransactions(),
        loadRegions(),
        loadReceivables(),
        loadRegionCash(),
      ]);
    } catch (err: any) {
      console.error(err);
      setTransactions([]);
      setRegions([]);
      setReceivables([]);
      setRegionCash([]);
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

  const activeTransactions = useMemo(() => {
    return transactions.filter((item) => item.status !== "CANCELLED");
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transactions
      .filter((item) => {
        const itemDate = toLocalDateInputValue(new Date(item.createdAt));

        const matchesDate =
          (!startDate || itemDate >= startDate) &&
          (!endDate || itemDate <= endDate);

        const regionName = item.region?.name?.trim() || "Matriz";
        const matchesRegion = !regionFilter || regionName === regionFilter;
        const matchesType = !typeFilter || item.type === typeFilter;
        const matchesScope = !scopeFilter || item.scope === scopeFilter;

        const haystack = [
          item.description,
          item.region?.name,
          categoryLabel(item.category),
          item.status,
          statusLabel(item.status),
          item.scope === "MATRIX" ? "matriz" : "região",
          item.type === "INCOME" ? "entrada" : "saída",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !normalizedSearch || haystack.includes(normalizedSearch);

        return matchesDate && matchesRegion && matchesType && matchesScope && matchesSearch;
      })
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [transactions, startDate, endDate, regionFilter, typeFilter, scopeFilter, search]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const item of filteredTransactions) {
      if (item.status === "CANCELLED") continue;
      if (item.type === "INCOME") income += item.amountCents ?? 0;
      if (item.type === "EXPENSE") expense += item.amountCents ?? 0;
    }

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [filteredTransactions]);

  const availableRegions = useMemo(() => {
    const names = new Set<string>();

    for (const item of transactions) {
      const regionName = item.region?.name?.trim() || "Matriz";
      names.add(regionName);
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [transactions]);

  const financialPanels = useMemo(() => {
    function calculateForRegion(regionName: string) {
      const relevant = activeTransactions.filter((item) => {
        const currentRegion = item.region?.name?.trim() || "Matriz";
        return currentRegion === regionName;
      });

      const income = relevant
        .filter((item) => item.type === "INCOME")
        .reduce((acc, item) => acc + item.amountCents, 0);

      const expense = relevant
        .filter((item) => item.type === "EXPENSE")
        .reduce((acc, item) => acc + item.amountCents, 0);

      return {
        income,
        expense,
        balance: income - expense,
      };
    }

    const totalIncome = activeTransactions
      .filter((item) => item.type === "INCOME")
      .reduce((acc, item) => acc + item.amountCents, 0);

    const totalExpense = activeTransactions
      .filter((item) => item.type === "EXPENSE")
      .reduce((acc, item) => acc + item.amountCents, 0);

    const regionPanels = availableRegions.map((regionName) => ({
      regionName,
      ...calculateForRegion(regionName),
    }));

    return {
      total: {
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
      },
      regionPanels,
    };
  }, [activeTransactions, availableRegions]);

  const executiveCards = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const overdue = receivables
      .filter((item) => {
        if (item.status === "PAID") return false;
        const due = new Date(item.dueDate);
        return due < todayStart;
      })
      .reduce((acc, item) => acc + item.amountCents, 0);

    const dueToday = receivables
      .filter((item) => {
        if (item.status === "PAID") return false;
        const due = new Date(item.dueDate);
        return due >= todayStart && due <= todayEnd;
      })
      .reduce((acc, item) => acc + item.amountCents, 0);

    const pendingTransfers = regionCash
      .filter((item) => item.status === "PENDING")
      .reduce((acc, item) => acc + item.amountCents, 0);

    const regionalCashTotal = regionCash.reduce(
      (acc, item) => acc + item.amountCents,
      0
    );

    return {
      overdue,
      dueToday,
      pendingTransfers,
      regionalCashTotal,
    };
  }, [receivables, regionCash]);

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

      await loadTransactions();
      await loadReceivables();
      await loadRegionCash();
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
              Financeiro - Lançamentos
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: theme.subtext,
              }}
            >
              Controle geral de entradas, saídas, vencimentos e repasses.
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

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          marginBottom: 18,
        }}
      >
        <DashboardCard
          title="Vencidos"
          value={formatMoneyBRFromCents(executiveCards.overdue)}
          valueColor="#dc2626"
          theme={theme}
        />

        <DashboardCard
          title="Vence hoje"
          value={formatMoneyBRFromCents(executiveCards.dueToday)}
          valueColor="#ea580c"
          theme={theme}
        />

        <DashboardCard
          title="Repasses pendentes"
          value={formatMoneyBRFromCents(executiveCards.pendingTransfers)}
          valueColor="#ca8a04"
          theme={theme}
        />

        <DashboardCard
          title="Caixa regional total"
          value={formatMoneyBRFromCents(executiveCards.regionalCashTotal)}
          valueColor="#2563eb"
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          marginBottom: 18,
        }}
      >
        <SummaryPanel
          title="Total geral"
          income={financialPanels.total.income}
          expense={financialPanels.total.expense}
          balance={financialPanels.total.balance}
          theme={theme}
        />

        {financialPanels.regionPanels.slice(0, 3).map((panel) => (
          <SummaryPanel
            key={panel.regionName}
            title={panel.regionName}
            income={panel.income}
            expense={panel.expense}
            balance={panel.balance}
            theme={theme}
          />
        ))}
      </div>

      {financialPanels.regionPanels.length > 3 ? (
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            marginBottom: 18,
          }}
        >
          {financialPanels.regionPanels.slice(3).map((panel) => (
            <SummaryPanel
              key={panel.regionName}
              title={panel.regionName}
              income={panel.income}
              expense={panel.expense}
              balance={panel.balance}
              theme={theme}
            />
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          marginBottom: 18,
        }}
      >
        <NavCard
          href="/finance/receivables"
          title="Contas a Receber"
          subtitle="Parcelas, vencidos e próximos vencimentos"
          theme={theme}
        />

        <NavCard
          href="/finance/region-cash"
          title="Caixa da Região"
          subtitle="Valores recebidos em dinheiro nas regiões"
          theme={theme}
        />

        <NavCard
          href="/finance/transfers"
          title="Repasses para Matriz"
          subtitle="Controle do dinheiro que saiu da região para a matriz"
          theme={theme}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          marginBottom: 18,
        }}
      >
        <DashboardCard
          title="Entradas no filtro"
          value={formatMoneyBRFromCents(totals.income)}
          valueColor="#16a34a"
          theme={theme}
        />

        <DashboardCard
          title="Saídas no filtro"
          value={formatMoneyBRFromCents(totals.expense)}
          valueColor="#dc2626"
          theme={theme}
        />

        <DashboardCard
          title="Saldo filtrado"
          value={formatMoneyBRFromCents(totals.balance)}
          valueColor={totals.balance >= 0 ? "#2563eb" : "#dc2626"}
          theme={theme}
        />

        <DashboardCard
          title="Qtd. lançamentos filtrados"
          value={String(filteredTransactions.length)}
          theme={theme}
        />
      </div>

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
                placeholder="Ex.: Combustível visita região sul"
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
              onClick={() => {}}
              primary
              disabled={saving}
            />
          </div>
        </form>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Filtros" theme={theme}>
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          }}
        >
          <div>
            <label style={label(theme)}>De</label>
            <input
              type="date"
              style={input(theme, inputBg)}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label style={label(theme)}>Até</label>
            <input
              type="date"
              style={input(theme, inputBg)}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label style={label(theme)}>Pesquisar</label>
            <input
              type="text"
              placeholder="Descrição, categoria ou região"
              style={input(theme, inputBg)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label style={label(theme)}>Região</label>
            <select
              style={input(theme, inputBg)}
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {availableRegions.map((regionName) => (
                <option key={regionName} value={regionName}>
                  {regionName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label(theme)}>Tipo</label>
            <select
              style={input(theme, inputBg)}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="INCOME">Entrada</option>
              <option value="EXPENSE">Saída</option>
            </select>
          </div>

          <div>
            <label style={label(theme)}>Escopo</label>
            <select
              style={input(theme, inputBg)}
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="REGION">Região</option>
              <option value="MATRIX">Matriz</option>
            </select>
          </div>
        </div>
      </Block>

      <div style={{ height: 18 }} />

      <Block title="Lançamentos" theme={theme}>
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
                <th style={th(theme, "left")}>Tipo</th>
                <th style={th(theme, "left")}>Categoria</th>
                <th style={th(theme, "left")}>Descrição</th>
                <th style={th(theme, "left")}>Valor</th>
                <th style={th(theme, "left")}>Status</th>
                <th style={th(theme, "left")}>Vencimento</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length === 0 ? (
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
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((item) => {
                  const badge = statusColors(item.status);

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderTop: `1px solid ${theme.border}`,
                        background: theme.cardBg,
                      }}
                    >
                      <td style={td(theme)}>{formatDateBR(item.createdAt)}</td>

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
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td style={td(theme)}>{formatDateBR(item.dueDate)}</td>
                    </tr>
                  );
                })
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