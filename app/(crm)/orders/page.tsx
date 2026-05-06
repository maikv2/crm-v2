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
};

type AccountsReceivable = {
  id: string;
  status: string;
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

function financialStatusLabel(order: Order) {
  const receivable = order.accountsReceivables?.[0];

  if (receivable?.status === "PAID") return "Recebido";
  if (receivable?.status === "PARTIAL") return "Parcial";
  if (receivable?.status === "OVERDUE") return "Vencido";
  if (receivable?.status === "CANCELED") return "Cancelado";

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

        {loading ? (
          <div style={{ color: theme.subtext, fontWeight: 700 }}>
            Carregando pedidos...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div style={{ color: theme.subtext, fontWeight: 700 }}>
            Nenhum pedido encontrado.
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
                {sortedOrders.map((order) => {
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