"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ShoppingCart,
  User2,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
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

type OrderItem = {
  id: string;
  number?: number | null;
  totalCents?: number | null;
  status?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
  seller?: {
    id: string;
    name: string;
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

export default function MobileAdminOrdersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/orders");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/orders", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar pedidos.");
        }

        const items = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setOrders(items);
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

    loadOrders();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((item) => {
      if (!q) return true;

      return (
        String(item.number ?? "").toLowerCase().includes(q) ||
        String(item.client?.name ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q) ||
        String(item.seller?.name ?? "").toLowerCase().includes(q)
      );
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
      <MobileAdminListPage
        title="Pedidos"
        subtitle="Lista mobile de pedidos"
        desktopHref="/orders"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por número, cliente, região ou vendedor"
        createHref="/m/admin/orders/new"
        createLabel="Novo pedido"
      >
        <MobileAppear>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Pedidos encontrados"
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

        <MobileAppear delay={60}>
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
              <Link href="/orders" style={{ textDecoration: "none" }}>
                <MobileCard style={{ padding: 14 }}>
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                    }}
                  >
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

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
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
                        {formatDateTimeBR(order.createdAt)}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <ShoppingCart size={14} />
                        {order.region?.name || "Sem região"}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <User2 size={14} />
                        {order.seller?.name || "Sem vendedor"}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Wallet size={14} />
                        Abrir visão completa
                      </div>

                      <ChevronRight size={16} />
                    </div>
                  </div>
                </MobileCard>
              </Link>
            </MobileAppear>
          ))
        )}
      </MobileAdminListPage>

      <MobileFab href="/m/admin/orders/new" label="Novo" />
    </>
  );
}