"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

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
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 700,
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function OrdersPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const res = await fetch("/api/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(data);
      setLoading(false);
    }

    loadOrders();
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Carregando pedidos...</div>;
  }

  const btnStyle = actionButtonStyle(theme);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/orders/new">Novo pedido</Link>
      </div>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Região</th>
            <th>Pagamento</th>
            <th>Financeiro</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => {
            const financialLabel = financialStatusLabel(order);

            return (
              <tr key={order.id}>
                <td>{formatDateBR(order.createdAt)}</td>

                <td>{formatOrderNumber(order.number, order.id)}</td>

                <td>{order.client?.name ?? "-"}</td>

                <td>{order.region?.name ?? order.client?.region?.name ?? "-"}</td>

                <td>{paymentMethodLabel(order.paymentMethod)}</td>

                <td
                  style={{
                    color: financialStatusColor(financialLabel),
                    fontWeight: 700,
                  }}
                >
                  {financialLabel}
                </td>

                <td>{formatMoneyBRFromCents(order.totalCents)}</td>

                <td>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      alignItems: "flex-start",
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
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}