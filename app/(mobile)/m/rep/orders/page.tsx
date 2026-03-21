"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Package,
  Store,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileAppear from "@/app/components/mobile/mobile-appear";
import MobileFab from "@/app/components/mobile/mobile-fab";
import MobileSkeletonCard from "@/app/components/mobile/mobile-skeleton-card";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepOrderItem = {
  id: string;
  number?: number | null;
  status?: string | null;
  type?: string | null;
  totalCents?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  totalItems?: number | null;
  client?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
  exhibitor?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
};

function getStatusLabel(value?: string | null) {
  if (!value) return "Sem status";

  const map: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    DRAFT: "Rascunho",
  };

  return map[value] || value;
}

function getPaymentStatusLabel(value?: string | null) {
  if (!value) return "Pagamento";

  const map: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PARTIAL: "Parcial",
    CANCELLED: "Cancelado",
    OVERDUE: "Vencido",
  };

  return map[value] || value;
}

export default function RepOrdersMobile() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<RepOrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/orders", { cache: "no-store" });

        if (res.status === 401) {
          router.push("/login?redirect=/m/rep/orders");
          return;
        }

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar pedidos.");
        }

        if (active) {
          setOrders(
            Array.isArray(data?.items)
              ? data.items
              : Array.isArray(data?.orders)
              ? data.orders
              : []
          );
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar pedidos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((item) => {
      if (!q) return true;

      return [
        String(item.number ?? ""),
        item.client?.name,
        item.client?.city,
        item.exhibitor?.name,
        item.exhibitor?.code,
        item.status,
        item.paymentStatus,
        item.paymentMethod,
        item.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, search]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        acc.total += 1;
        acc.totalValue += item.totalCents ?? 0;
        if (item.paymentStatus === "PENDING") acc.pending += 1;
        if (item.paymentStatus === "PAID") acc.paid += 1;
        return acc;
      },
      {
        total: 0,
        totalValue: 0,
        pending: 0,
        paid: 0,
      }
    );
  }, [filtered]);

  return (
    <>
      <MobileRepPageFrame
        title="Pedidos"
        subtitle="Acompanhe os pedidos da sua região"
        desktopHref="/rep/orders"
      >
        <MobileAppear>
          <MobileCard>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, cliente, expositor ou status"
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.inputBg,
                  color: colors.text,
                  padding: "0 14px",
                  outline: "none",
                  fontSize: 14,
                }}
              />

              <Link href="/m/rep/orders/new" style={{ textDecoration: "none" }}>
                <div
                  style={{
                    minHeight: 46,
                    borderRadius: 14,
                    border: "none",
                    background: colors.primary,
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                >
                  <Package size={16} />
                  Novo pedido
                </div>
              </Link>
            </div>
          </MobileCard>
        </MobileAppear>

        <MobileAppear delay={50}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Pedidos"
              value={String(summary.total)}
              helper="Resultado do filtro atual"
            />
            <MobileStatCard
              label="Valor total"
              value={formatMoneyBR(summary.totalValue)}
              helper="Soma dos pedidos visíveis"
            />
          </div>
        </MobileAppear>

        <MobileAppear delay={90}>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <MobileSectionTitle title="Resumo rápido" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: colors.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                  border: `1px solid ${
                    colors.isDark ? "rgba(255,255,255,0.08)" : "#bfdbfe"
                  }`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.subtext,
                    marginBottom: 4,
                  }}
                >
                  Pendentes
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: colors.text,
                  }}
                >
                  {summary.pending}
                </div>
              </div>

              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  background: colors.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                  border: `1px solid ${
                    colors.isDark ? "rgba(255,255,255,0.08)" : "#bfdbfe"
                  }`,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.subtext,
                    marginBottom: 4,
                  }}
                >
                  Pagos
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: colors.text,
                  }}
                >
                  {summary.paid}
                </div>
              </div>
            </div>
          </MobileCard>
        </MobileAppear>

        {loading ? (
          <MobileAppear delay={120}>
            <div style={{ display: "grid", gap: 12 }}>
              <MobileSkeletonCard />
              <MobileSkeletonCard />
              <MobileSkeletonCard />
            </div>
          </MobileAppear>
        ) : error ? (
          <MobileCard>{error}</MobileCard>
        ) : filtered.length === 0 ? (
          <MobileCard>Nenhum pedido encontrado.</MobileCard>
        ) : (
          filtered.map((order, index) => (
            <MobileAppear key={order.id} delay={Math.min(index * 35, 180)}>
              <Link href="/m/rep/orders" style={{ textDecoration: "none" }}>
                <MobileCard style={{ padding: 14 }}>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 900,
                            color: colors.text,
                            lineHeight: 1.2,
                          }}
                        >
                          Pedido #{order.number ?? "-"}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {order.client?.name || "Cliente não informado"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: colors.primary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoneyBR(order.totalCents ?? 0)}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          background: colors.isDark ? "#111f39" : "#e8f0ff",
                          color: colors.primary,
                        }}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                      <span
                        style={{
                          borderRadius: 999,
                          padding: "6px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                          background: colors.isDark ? "#111827" : "#f8fafc",
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <CalendarDays size={14} />
                        {formatDateTimeBR(order.createdAt || order.issuedAt)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Store size={14} />
                        {order.exhibitor?.name ||
                          order.exhibitor?.code ||
                          "Sem expositor"}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Wallet size={14} />
                        {order.paymentMethod || "Pagamento não informado"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 4,
                        borderTop: `1px solid ${colors.border}`,
                        color: colors.subtext,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      <div>
                        {order.totalItems
                          ? `${order.totalItems} item(ns)`
                          : "Abrir pedido"}
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </MobileCard>
              </Link>
            </MobileAppear>
          ))
        )}
      </MobileRepPageFrame>

      <MobileFab href="/m/rep/orders/new" label="Novo" />
    </>
  );
}