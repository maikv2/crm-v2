"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ShoppingCart, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepListPage from "@/app/components/mobile/mobile-rep-list-page";
import {
  MobileCard,
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
};

type RepOverviewResponse = {
  recentOrders: Array<{
    id: string;
    number: number;
    totalCents: number;
    createdAt: string;
    paymentStatus: string;
    clientId?: string | null;
    clientName: string;
  }>;
};

export default function MobileRepOrdersPage() {
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

        const authRes = await fetch("/api/mobile/rep/overview", {
          cache: "no-store",
        });

        const authJson = (await authRes.json().catch(() => null)) as
          | RepOverviewResponse
          | { error?: string }
          | null;

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/rep/orders");
          return;
        }

        if (authRes.status === 403) {
          router.push("/rep");
          return;
        }

        if (!authRes.ok) {
          throw new Error(
            (authJson as any)?.error || "Erro ao carregar pedidos do representante."
          );
        }

        const repOrders = (authJson as RepOverviewResponse).recentOrders.map((item) => ({
          id: item.id,
          number: item.number,
          totalCents: item.totalCents,
          createdAt: item.createdAt,
          paymentStatus: item.paymentStatus,
          client: {
            id: item.clientId || "",
            name: item.clientName,
          },
          region: null,
          status: "RECENTE",
        }));

        if (active) {
          setOrders(repOrders);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar pedidos do representante."
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
        String(item.client?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  return (
    <MobileRepListPage
      title="Pedidos"
      subtitle="Pedidos da sua região"
      desktopHref="/rep/orders"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por número ou cliente"
      createHref="/m/rep/orders/new"
      createLabel="Novo pedido"
    >
      {loading ? (
        <MobileCard>Carregando pedidos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum pedido encontrado.</MobileCard>
      ) : (
        filtered.map((order) => (
          <Link key={order.id} href="/rep/orders">
            <MobileCard style={{ padding: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
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
                        fontSize: 15,
                        fontWeight: 900,
                        color: colors.text,
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
                      {order.client?.name || "Cliente"}
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
                    {order.status || "Pedido"}
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
                    {order.paymentStatus || "Pagamento"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 6,
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
                    Pedido da sua região
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User2 size={14} />
                    {order.client?.name || "Sem cliente"}
                  </div>
                </div>
              </div>
            </MobileCard>
          </Link>
        ))
      )}
    </MobileRepListPage>
  );
}