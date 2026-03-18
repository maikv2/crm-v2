"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  PieChart,
  Users,
  Store,
  Package,
  Boxes,
  ShoppingCart,
  PlusCircle,
  DollarSign,
  FileText,
  Wallet,
  ArrowRightLeft,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";

type ThemeMode = "light" | "dark";

type FinanceCategory =
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

type Region = {
  id: string;
  name: string;
};

type FinanceTransaction = {
  id: string;
  scope: "MATRIX" | "REGION";
  type: "INCOME" | "EXPENSE";
  status: "PENDING" | "PAID" | "CANCELLED";
  category: FinanceCategory;
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

function getTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  return {
    mode,
    isDark,
    pageBg: isDark ? "#0b1220" : "#f3f6fb",
    sidebarBg: isDark ? "#0f172a" : "#ffffff",
    topbarBg: isDark ? "#0f172a" : "#ffffff",
    contentCard: isDark ? "#111c31" : "#ffffff",
    subtleCard: isDark ? "#0e1728" : "#f8fafc",
    border: isDark ? "#1f2a44" : "#e2e8f0",
    text: isDark ? "#e5edf9" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    sidebarText: isDark ? "#cbd5e1" : "#64748b",
    sidebarActiveBg: isDark ? "rgba(37,99,235,0.16)" : "#dbeafe",
    sidebarActiveText: "#2563eb",
    inputBg: isDark ? "#0b1324" : "#f8fafc",
    shadow: isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
    blue: "#2563eb",
    green: "#22c55e",
    orange: "#f97316",
    purple: "#7c3aed",
    iconBlueBg: isDark ? "rgba(37,99,235,0.15)" : "#eaf1ff",
    iconBlueFg: "#2563eb",
    iconGreenBg: isDark ? "rgba(34,197,94,0.14)" : "#eaf8ef",
    iconGreenFg: "#16a34a",
    iconOrangeBg: isDark ? "rgba(249,115,22,0.14)" : "#fff1e8",
    iconOrangeFg: "#ea580c",
    iconPurpleBg: isDark ? "rgba(124,58,237,0.14)" : "#f3ebff",
    iconPurpleFg: "#7c3aed",
  };
}

function formatMoneyBRFromCents(cents?: number | null) {
  const safe = cents ?? 0;
  return (safe / 100).toLocaleString("pt-BR", {
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

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function categoryLabel(category: FinanceCategory) {
  const map: Record<FinanceCategory, string> = {
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

function ThemeToggle({
  mode,
  onToggle,
}: {
  mode: "light" | "dark";
  onToggle: () => void;
}) {
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        height: 42,
        padding: "0 10px",
        borderRadius: 12,
        border: isDark ? "1px solid #1f2a44" : "1px solid #dbe3ef",
        background: isDark ? "#0b1324" : "#f3f6fb",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          fontSize: 14,
          color: isDark ? "#ffffff" : "#1e3a8a",
          lineHeight: 1,
        }}
      >
        ☾
      </span>

      <span
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: isDark ? "#243047" : "#d9dee7",
          position: "relative",
          display: "inline-block",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: isDark ? 18 : 2,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(15,23,42,0.18)",
            transition: "all 0.2s ease",
          }}
        />
      </span>

      <span
        style={{
          fontSize: 14,
          color: isDark ? "#ffffff" : "#1e3a8a",
          lineHeight: 1,
        }}
      >
        ☀
      </span>
    </button>
  );
}

function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        marginBottom: 10,
        marginTop: 8,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.1,
        textTransform: "uppercase",
        color,
        opacity: 0.58,
      }}
    >
      {children}
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  active,
  theme,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  theme: ReturnType<typeof getTheme>;
  badge?: number | string;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px 10px 16px",
        borderRadius: 12,
        background: active
          ? theme.sidebarActiveBg
          : hover
            ? theme.isDark
              ? "rgba(255,255,255,0.04)"
              : "#f8fafc"
            : "transparent",
        color: active
          ? theme.sidebarActiveText
          : hover
            ? theme.sidebarActiveText
            : theme.sidebarText,
        fontWeight: active ? 700 : 600,
        fontSize: 14,
        cursor: "pointer",
        marginBottom: 4,
        transition: "all 0.15s ease",
      }}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 6,
            bottom: 6,
            width: 4,
            borderRadius: 4,
            background: theme.blue,
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            color: active
              ? theme.sidebarActiveText
              : hover
                ? theme.sidebarActiveText
                : theme.sidebarText,
            opacity: active || hover ? 1 : 0.9,
            transition: "all 0.15s ease",
          }}
        >
          {icon}
        </span>

        <span>{label}</span>
      </div>

      {badge ? (
        <span
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 999,
            background: "#ef4444",
            color: "white",
            fontSize: 12,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 6px",
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function TopIconButton({
  children,
  theme,
  dot,
}: {
  children: React.ReactNode;
  theme: ReturnType<typeof getTheme>;
  dot?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        border: theme.isDark ? "1px solid #1f2a44" : "1px solid #dbe3ef",
        background: hover
          ? theme.isDark
            ? "rgba(255,255,255,0.06)"
            : "#eef2f7"
          : theme.isDark
            ? theme.sidebarBg
            : "#f3f6fb",
        color: theme.isDark ? "#ffffff" : "#1e3a8a",
        cursor: "pointer",
        position: "relative",
        fontSize: 16,
        transition: "all 0.15s ease",
      }}
    >
      {children}

      {dot && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#ef4444",
          }}
        />
      )}
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
  theme: ReturnType<typeof getTheme>;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.contentCard,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
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

export default function NewFinanceLaunchPage() {
  const router = useRouter();
  const today = new Date();

  const [mode, setMode] = useState<ThemeMode>("light");
  const theme = getTheme(mode);

  const [regions, setRegions] = useState<Region[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [scope, setScope] = useState<"MATRIX" | "REGION">("REGION");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [category, setCategory] = useState<FinanceCategory>("LOGISTICS");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [regionId, setRegionId] = useState("");
  const [dueDate, setDueDate] = useState(toLocalDateInputValue(today));
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");

  async function loadRegions() {
    try {
      setLoadingRegions(true);

      const res = await fetch("/api/regions", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (data && typeof data === "object" && "error" in data
            ? String((data as { error?: unknown }).error)
            : null) || "Erro ao carregar regiões."
        );
      }

      const normalizedRegions = normalizeRegionsPayload(data);
      setRegions(normalizedRegions);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoadingRegions(false);
    }
  }

  async function loadTransactions() {
    try {
      setLoadingTransactions(true);
      const res = await fetch("/api/finance", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar lançamentos.");
      }

      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function loadAll() {
    try {
      setPageError(null);
      await Promise.all([loadRegions(), loadTransactions()]);
    } catch (err: any) {
      console.error(err);
      setPageError(err?.message || "Erro ao carregar a página.");
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

  const latestTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8);
  }, [transactions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

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
      setSuccess("Lançamento salvo com sucesso.");

      await loadTransactions();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.pageBg,
        color: theme.text,
      }}
    >
      <aside
        style={{
          width: 264,
          background: theme.sidebarBg,
          borderRight: `1px solid ${theme.border}`,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <Image
              src={theme.isDark ? "/logo_branca.svg" : "/logo.svg"}
              alt="Logo V2"
              width={42}
              height={42}
              style={{ objectFit: "contain" }}
            />

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              V2 CRM
            </div>
          </div>

          <SectionLabel color={theme.muted}>Principal</SectionLabel>
          <SidebarItem
            label="Dashboard"
            theme={theme}
            icon={<LayoutDashboard size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/dashboard")}
          />
          <SidebarItem
            label="Painel de Vendas"
            theme={theme}
            icon={<PieChart size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/dashboard")}
          />

          <SectionLabel color={theme.muted}>Cadastros</SectionLabel>
          <SidebarItem
            label="Clientes"
            theme={theme}
            icon={<Users size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/clients")}
          />
          <SidebarItem
            label="Expositores"
            theme={theme}
            icon={<Store size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/exhibitors")}
          />
          <SidebarItem
            label="Produtos"
            theme={theme}
            icon={<Package size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/products")}
          />

          <SectionLabel color={theme.muted}>Operações</SectionLabel>
          <SidebarItem
            label="Estoque"
            theme={theme}
            icon={<Boxes size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/stock")}
          />
          <SidebarItem
            label="Pedidos"
            badge={8}
            theme={theme}
            icon={<ShoppingCart size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/orders")}
          />
          <SidebarItem
            label="Novo Pedido"
            theme={theme}
            icon={<PlusCircle size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/orders/new")}
          />

          <SectionLabel color={theme.muted}>Financeiro</SectionLabel>
          <SidebarItem
            label="Financeiro"
            theme={theme}
            icon={<DollarSign size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/finance")}
          />
          <SidebarItem
            label="Contas a Receber"
            theme={theme}
            icon={<FileText size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/finance/receivables")}
          />
          <SidebarItem
            label="Caixa da Região"
            theme={theme}
            icon={<Wallet size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/finance/region-cash")}
          />
          <SidebarItem
            label="Repasses → Matriz"
            theme={theme}
            icon={<ArrowRightLeft size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/finance/transfers")}
          />

          <SectionLabel color={theme.muted}>Relatórios</SectionLabel>
          <SidebarItem
            label="Relatórios"
            theme={theme}
            icon={<BarChart3 size={17} strokeWidth={2.2} />}
            onClick={() => router.push("/dashboard")}
          />
        </div>

        <div
          style={{
            borderTop: `1px solid ${theme.border}`,
            paddingTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: theme.blue,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
            }}
          >
            AD
          </div>

          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: theme.text,
              }}
            >
              Administrador
            </div>
            <div
              style={{
                fontSize: 12,
                color: theme.muted,
              }}
            >
              Chapecó • SC
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 72,
            background: theme.topbarBg,
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: theme.text,
            }}
          >
            Novo Lançamento teste
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 264,
                height: 42,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 14px",
                color: theme.muted,
              }}
            >
              <span style={{ fontSize: 15 }}>⌕</span>
              <span style={{ fontSize: 15 }}>Buscar clientes, pedidos...</span>
            </div>

            <ThemeToggle
              mode={mode}
              onToggle={() =>
                setMode((prev) => (prev === "light" ? "dark" : "light"))
              }
            />

            <TopIconButton theme={theme} dot>
              🔔
            </TopIconButton>

            <TopIconButton theme={theme}>⚙️</TopIconButton>

            <div
              style={{
                height: 42,
                padding: "0 12px 0 10px",
                borderRadius: 12,
                border: theme.isDark ? "1px solid #1f2a44" : "1px solid #dbe3ef",
                background: theme.isDark ? theme.sidebarBg : "#f3f6fb",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: theme.blue,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                AD
              </div>

              <div
                style={{
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Admin
              </div>
            </div>
          </div>
        </header>

        <main style={{ padding: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.muted,
                  marginBottom: 10,
                }}
              >
                🏠 / Financeiro / Novo lançamento
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                Lançamento Financeiro
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: theme.muted,
                }}
              >
                Cadastre uma entrada ou saída manual sem vínculo com pedido.
              </div>
            </div>
          </div>

          {pageError ? (
            <div
              style={{
                marginBottom: 18,
                border: "1px solid #fca5a5",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 14,
                padding: 14,
                fontSize: 14,
              }}
            >
              {pageError}
            </div>
          ) : null}

          <div style={{ marginBottom: 24 }}>
            <Card title="Formulário de lançamento" theme={theme}>
              <form onSubmit={handleSubmit}>
                {error ? (
                  <div
                    style={{
                      marginBottom: 16,
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#b91c1c",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div
                    style={{
                      marginBottom: 16,
                      border: "1px solid #86efac",
                      background: "#f0fdf4",
                      color: "#15803d",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                    }}
                  >
                    {success}
                  </div>
                ) : null}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Escopo
                    </label>
                    <select
                      value={scope}
                      onChange={(e) =>
                        setScope(e.target.value as "MATRIX" | "REGION")
                      }
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    >
                      <option value="REGION">Região</option>
                      <option value="MATRIX">Matriz</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Tipo
                    </label>
                    <select
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as "INCOME" | "EXPENSE")
                      }
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    >
                      <option value="INCOME">Entrada</option>
                      <option value="EXPENSE">Saída</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as FinanceCategory)
                      }
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
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
                      <option value="INVESTOR_DISTRIBUTION">
                        Distribuição investidor
                      </option>
                      <option value="OTHER">Outros</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Região
                    </label>
                    <select
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value)}
                      disabled={scope === "MATRIX" || loadingRegions}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background:
                          scope === "MATRIX" || loadingRegions
                            ? theme.subtleCard
                            : theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    >
                      <option value="">
                        {loadingRegions
                          ? "Carregando regiões..."
                          : regions.length === 0
                            ? "Nenhuma região encontrada"
                            : "Selecione"}
                      </option>

                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex.: Combustível visita região sul"
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Valor
                    </label>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex.: 150,00"
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Vencimento
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        width: "100%",
                        height: 44,
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "0 12px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: "span 4" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 8,
                        fontSize: 14,
                        color: theme.text,
                      }}
                    >
                      Observações
                    </label>
                    <textarea
                      rows={5}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      style={{
                        width: "100%",
                        borderRadius: 10,
                        border: `1px solid ${theme.border}`,
                        background: theme.inputBg,
                        color: theme.text,
                        padding: "12px",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>

                {scope === "REGION" && !loadingRegions && regions.length === 0 ? (
                  <div
                    style={{
                      marginTop: 16,
                      border: "1px solid #fcd34d",
                      background: "#fffbeb",
                      color: "#92400e",
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 14,
                    }}
                  >
                    Nenhuma região foi carregada em <strong>/api/regions</strong>.
                  </div>
                ) : null}

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 18,
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

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 20,
                  }}
                >
                  <button
                    type="submit"
                    disabled={
                      saving || (scope === "REGION" && !loadingRegions && regions.length === 0)
                    }
                    style={{
                      height: 42,
                      padding: "0 18px",
                      borderRadius: 10,
                      border: "none",
                      background: theme.blue,
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      opacity:
                        saving || (scope === "REGION" && !loadingRegions && regions.length === 0)
                          ? 0.7
                          : 1,
                    }}
                  >
                    {saving ? "Salvando..." : "Salvar lançamento"}
                  </button>

                  <Link
                    href="/finance"
                    style={{
                      height: 42,
                      padding: "0 18px",
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: theme.topbarBg,
                      color: theme.text,
                      fontWeight: 700,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Cancelar
                  </Link>
                </div>
              </form>
            </Card>
          </div>

          <Card
            title="Últimos lançamentos"
            theme={theme}
            right={
              <Link
                href="/finance"
                style={{
                  fontSize: 13,
                  color: theme.blue,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Ver painel financeiro
              </Link>
            }
          >
            {loadingTransactions ? (
              <div style={{ color: theme.muted }}>Carregando lançamentos...</div>
            ) : latestTransactions.length === 0 ? (
              <div style={{ color: theme.muted }}>
                Nenhum lançamento encontrado ainda.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                }}
              >
                {latestTransactions.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      background: theme.subtleCard,
                      padding: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          color: theme.text,
                          marginBottom: 4,
                        }}
                      >
                        {item.description}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: theme.muted,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{item.scope === "MATRIX" ? "Matriz" : "Região"}</span>
                        <span>{item.region?.name || "Matriz"}</span>
                        <span>{categoryLabel(item.category)}</span>
                        <span>{formatDateBR(item.createdAt)}</span>
                        <span>{statusLabel(item.status)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontWeight: 800,
                        color: item.type === "INCOME" ? theme.green : "#ef4444",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.type === "INCOME" ? "+" : "-"}{" "}
                      {formatMoneyBRFromCents(item.amountCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}