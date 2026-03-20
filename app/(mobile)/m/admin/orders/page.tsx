"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ShoppingCart, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
import { MobileCard, formatDateTimeBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
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
          setError(err instanceof Error ? err.message : "Erro ao carregar pedidos.");
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

  return (
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
      {loading ? (
        <MobileCard>Carregando pedidos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum pedido encontrado.</MobileCard>
      ) : (
        filtered.map((order) => (
          <Link key={order.id} href="/orders">
            <MobileCard style={{ padding: 14 }}>
              <div
                style={{
                  display: "grid",
                  gap: 10,
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
                    {order.status || "Sem status"}
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
                    {order.region?.name || "Sem região"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User2 size={14} />
                    {order.seller?.name || "Sem vendedor"}
                  </div>
                </div>
              </div>
            </MobileCard>
          </Link>
        ))
      )}
    </MobileAdminListPage>
  );
}