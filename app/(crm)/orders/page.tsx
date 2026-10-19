"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type AuthResponse = {
  user?: AuthUser | null;
};

type Installment = {
  id: string;
  status: string;
  amountCents: number;
  dueDate?: string | null;
};

type AccountsReceivable = {
  id: string;
  status: string;
  paymentMethod?: string | null;
  dueDate?: string | null;
  amountCents?: number | null;
  receivedCents?: number | null;
  installmentCount?: number | null;
  installments?: Installment[];
};

type Order = {
  id: string;
  number?: string | number | null;
  createdAt: string;
  totalCents?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
  client?: {
    name?: string | null;
    code?: string | number | null;
    region?: {
      name?: string | null;
    } | null;
  } | null;
  region?: {
    id?: string | null;
    name?: string | null;
  } | null;
  accountsReceivables?: AccountsReceivable[];
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

function formatOrderNumber(value?: string | number | null, fallbackId?: string) {
  if (value === null || value === undefined || value === "") {
    return fallbackId ?? "-";
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return `PED-${String(numeric).padStart(4, "0")}`;
  }

  return String(value);
}

function paymentMethodLabel(value?: string | null) {
  switch (value) {
    case "CASH":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "BOLETO":
      return "Boleto";
    case "CARD_DEBIT":
      return "Cartão débito";
    case "CARD_CREDIT":
      return "Cartão crédito";
    default:
      return value || "-";
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Considera vencido quando há parcela (ou título sem parcelas) em aberto
// com vencimento anterior a hoje, mesmo que o status ainda não tenha virado OVERDUE.
function hasOverdueOpenAmount(order: Order) {
  const today = startOfToday();
  const isPast = (value?: string | null) => {
    if (!value) return false;
    const t = new Date(value).getTime();
    return Number.isFinite(t) && t < today;
  };

  return (order.accountsReceivables ?? []).some((receivable) => {
    if (receivable.status === "PAID" || receivable.status === "CANCELED") {
      return false;
    }

    const installments = receivable.installments ?? [];

    if (installments.length > 0) {
      return installments.some(
        (inst) =>
          inst.status === "OVERDUE" ||
          (inst.status !== "PAID" &&
            inst.status !== "CANCELED" &&
            isPast(inst.dueDate))
      );
    }

    return isPast(receivable.dueDate);
  });
}

function financialStatusLabel(order: Order) {
  const receivable = order.accountsReceivables?.[0];

  if (receivable?.status === "PAID") return "Recebido";
  if (receivable?.status === "OVERDUE") return "Vencido";
  if (receivable?.status === "CANCELED") return "Cancelado";
  if (hasOverdueOpenAmount(order)) return "Vencido";
  if (receivable?.status === "PARTIAL") return "Parcial";

  if (order.paymentStatus === "PAID") return "Recebido";
  if (order.paymentStatus === "PARTIAL") return "Parcial";
  if (order.paymentStatus === "OVERDUE") return "Vencido";
  if (order.paymentStatus === "CANCELLED") return "Cancelado";

  return "Pendente";
}

function financialStatusColor(label: string) {
  if (label === "Recebido") return "#16a34a";
  if (label === "Parcial") return "#ca8a04";
  if (label === "Vencido") return "#dc2626";
  if (label === "Cancelado") return "#6b7280";
  return "#2563eb";
}

function normalizeText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Data no formato YYYY-MM-DD no fuso local, para comparar com <input type="date">.
function localDateKey(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function orderPaymentMethods(order: Order) {
  const methods = new Set<string>();
  if (order.paymentMethod) methods.add(order.paymentMethod);
  for (const receivable of order.accountsReceivables ?? []) {
    if (receivable.paymentMethod) methods.add(receivable.paymentMethod);
  }
  return methods;
}

function orderRegionName(order: Order) {
  return order.region?.name ?? order.client?.region?.name ?? "";
}

const PAYMENT_METHOD_OPTIONS = [
  "CASH",
  "PIX",
  "BOLETO",
  "CARD_DEBIT",
  "CARD_CREDIT",
] as const;

const FINANCIAL_STATUS_OPTIONS = [
  "Pendente",
  "Parcial",
  "Recebido",
  "Vencido",
  "Cancelado",
] as const;

function actionButtonStyle(theme: ThemeShape): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34,
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 800,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [authRes, ordersRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/orders", { cache: "no-store" }),
      ]);

      const authJson = (await authRes.json().catch(() => null)) as AuthResponse | null;
      const ordersJson = await ordersRes.json().catch(() => null);

      setUser(authJson?.user ?? null);
      setOrders(Array.isArray(ordersJson) ? ordersJson : []);
    } catch {
      setError("Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const an = Number(a.number ?? 0);
      const bn = Number(b.number ?? 0);

      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) {
        return bn - an;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [orders]);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [financialFilter, setFinancialFilter] = useState("");

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const order of orders) {
      if (order.client?.name) names.add(order.client.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [orders]);

  const regionOptions = useMemo(() => {
    const names = new Set<string>();
    for (const order of orders) {
      const name = orderRegionName(order);
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [orders]);

  const hasActiveFilters = Boolean(
    search ||
      dateFrom ||
      dateTo ||
      clientFilter ||
      regionFilter ||
      paymentFilter ||
      financialFilter
  );

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setClientFilter("");
    setRegionFilter("");
    setPaymentFilter("");
    setFinancialFilter("");
  }

  const filteredOrders = useMemo(() => {
    const term = normalizeText(search);

    return sortedOrders.filter((order) => {
      if (term) {
        const matchesNumber =
          normalizeText(formatOrderNumber(order.number, order.id)).includes(term) ||
          normalizeText(order.number).includes(term);
        const matchesClient =
          normalizeText(order.client?.name).includes(term) ||
          (order.client?.code !== null &&
            order.client?.code !== undefined &&
            normalizeText(order.client.code).includes(term));

        if (!matchesNumber && !matchesClient) return false;
      }

      if (dateFrom || dateTo) {
        const key = localDateKey(order.createdAt);
        if (!key) return false;
        if (dateFrom && key < dateFrom) return false;
        if (dateTo && key > dateTo) return false;
      }

      if (clientFilter && order.client?.name !== clientFilter) return false;
      if (regionFilter && orderRegionName(order) !== regionFilter) return false;
      if (paymentFilter && !orderPaymentMethods(order).has(paymentFilter)) {
        return false;
      }
      if (financialFilter && financialStatusLabel(order) !== financialFilter) {
        return false;
      }

      return true;
    });
  }, [
    sortedOrders,
    search,
    dateFrom,
    dateTo,
    clientFilter,
    regionFilter,
    paymentFilter,
    financialFilter,
  ]);

  const filteredTotalCents = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + (order.totalCents ?? 0), 0),
    [filteredOrders]
  );

  async function handleDelete(order: Order) {
    const number = formatOrderNumber(order.number, order.id);

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir definitivamente o pedido ${number}?\n\nEssa ação vai devolver o estoque e apagar financeiro, recebimentos, repasses e itens do pedido.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(order.id);
      setError(null);

      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao excluir pedido.");
      }

      setOrders((current) => current.filter((item) => item.id !== order.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir pedido.");
    } finally {
      setDeletingId(null);
    }
  }

  const btnStyle = actionButtonStyle(theme);
  const deleteBtnStyle: React.CSSProperties = {
    ...btnStyle,
    border: `1px solid ${theme.isDark ? "#7f1d1d" : "#fecaca"}`,
    background: theme.isDark ? "#3f1212" : "#fee2e2",
    color: theme.isDark ? "#fecaca" : "#b91c1c",
  };

  const filterLabelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: theme.subtext,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  const filterInputStyle: React.CSSProperties = {
    height: 38,
    padding: "0 10px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontSize: 14,
    fontWeight: 600,
    textTransform: "none",
    letterSpacing: 0,
    colorScheme: theme.isDark ? "dark" : "light",
  };

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
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
            🏠 / Pedidos
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              letterSpacing: -0.4,
            }}
          >
            Pedidos
          </div>

          <div
            style={{
              marginTop: 6,
              color: theme.subtext,
              fontSize: 14,
            }}
          >
            Consulte pedidos, baixe PDFs e gerencie vendas.
          </div>
        </div>

        <Link
          href="/orders/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 40,
            padding: "0 16px",
            borderRadius: 12,
            border: "none",
            background: theme.primary,
            color: "#ffffff",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 900,
            boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
          }}
        >
          Novo pedido
        </Link>
      </div>

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
        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${theme.isDark ? "#7f1d1d" : "#fecaca"}`,
              background: theme.isDark ? "#3f1212" : "#fee2e2",
              color: theme.isDark ? "#fecaca" : "#991b1b",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <label style={{ ...filterLabelStyle, gridColumn: "1 / -1" }}>
            Pesquisar
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nº do pedido (ex: 123 ou PED-0123) ou nome/código do cliente"
              style={filterInputStyle}
            />
          </label>

          <label style={filterLabelStyle}>
            Data inicial
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={filterInputStyle}
            />
          </label>

          <label style={filterLabelStyle}>
            Data final
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={filterInputStyle}
            />
          </label>

          <label style={filterLabelStyle}>
            Cliente
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">Todos</option>
              {clientOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label style={filterLabelStyle}>
            Região
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">Todas</option>
              {regionOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label style={filterLabelStyle}>
            Pagamento
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">Todos</option>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {paymentMethodLabel(method)}
                </option>
              ))}
            </select>
          </label>

          <label style={filterLabelStyle}>
            Financeiro
            <select
              value={financialFilter}
              onChange={(e) => setFinancialFilter(e.target.value)}
              style={filterInputStyle}
            >
              <option value="">Todos</option>
              {FINANCIAL_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
            color: theme.subtext,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>
            {filteredOrders.length} de {orders.length} pedido(s) · Total{" "}
            <span style={{ color: theme.text, fontWeight: 900 }}>
              {formatMoneyBRFromCents(filteredTotalCents)}
            </span>
          </span>

          {hasActiveFilters ? (
            <button type="button" onClick={clearFilters} style={btnStyle}>
              Limpar filtros
            </button>
          ) : null}
        </div>

        {loading ? (
          <div style={{ color: theme.subtext, fontWeight: 700 }}>
            Carregando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ color: theme.subtext, fontWeight: 700 }}>
            {hasActiveFilters
              ? "Nenhum pedido encontrado com esses filtros."
              : "Nenhum pedido encontrado."}
          </div>
        ) : (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                minWidth: 980,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Data",
                    "Pedido",
                    "Cliente",
                    "Região",
                    "Pagamento",
                    "Financeiro",
                    "Valor",
                    "Ações",
                  ].map((head) => (
                    <th
                      key={head}
                      style={{
                        textAlign: "left",
                        padding: "0 12px 14px",
                        color: theme.subtext,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${theme.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const financialLabel = financialStatusLabel(order);

                  return (
                    <tr key={order.id}>
                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDateBR(order.createdAt)}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatOrderNumber(order.number, order.id)}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontWeight: 800,
                          minWidth: 180,
                        }}
                      >
                        {order.client?.name ?? "-"}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          color: theme.subtext,
                          fontWeight: 700,
                          minWidth: 160,
                        }}
                      >
                        {order.region?.name ?? order.client?.region?.name ?? "-"}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {paymentMethodLabel(order.paymentMethod)}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          color: financialStatusColor(financialLabel),
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {financialLabel}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoneyBRFromCents(order.totalCents)}
                      </td>

                      <td
                        style={{
                          padding: "16px 12px",
                          borderBottom: `1px solid ${theme.border}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <Link href={`/orders/${order.id}`} style={btnStyle}>
                            Abrir
                          </Link>

                          <a
                            href={`/api/orders/${order.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            style={btnStyle}
                          >
                            Baixar PDF
                          </a>

                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(order)}
                              disabled={deletingId === order.id}
                              style={{
                                ...deleteBtnStyle,
                                opacity: deletingId === order.id ? 0.65 : 1,
                                cursor:
                                  deletingId === order.id
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {deletingId === order.id ? "Excluindo..." : "Excluir"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}