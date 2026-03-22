"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Order = {
  id: string;
  number: number;
  status: string;
  issuedAt: string;
  totalCents: number;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    case "OVERDUE":
      return "Vencido";
    default:
      return status;
  }
}

export default function MobileClientOrdersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const res = await fetch("/api/portal/orders", {
          cache: "no-store",
        });

        if (!res.ok) {
          router.push("/portal/login");
          return;
        }

        const data = await res.json();

        if (active) {
          setOrders(Array.isArray(data?.orders) ? data.orders : []);
        }
      } catch (error) {
        console.error(error);
        router.push("/portal/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [router]);

  const totalValue = useMemo(() => {
    return orders.reduce((sum, item) => sum + Number(item.totalCents || 0), 0);
  }, [orders]);

  return (
    <MobileClientPageFrame
      title="Meus pedidos"
      subtitle="Lista simplificada com PDF"
      desktopHref="/portal/orders"
    >
      {loading ? (
        <MobileCard>Carregando pedidos...</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard label="Pedidos" value={String(orders.length)} />
            <MobileStatCard label="Total" value={money(totalValue)} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Lista de pedidos" />

            {orders.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum pedido encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${colors.border}`,
                      background: colors.isDark ? "#111827" : "#f8fafc",
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: colors.text,
                      }}
                    >
                      Pedido #{order.number}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: colors.subtext,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div>{dateBR(order.issuedAt)}</div>
                      <div>{statusLabel(order.status)}</div>
                      <div>{money(order.totalCents)}</div>
                    </div>

                    <a
                      href={`/api/orders/${order.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginTop: 12,
                        textDecoration: "none",
                        display: "inline-flex",
                      }}
                    >
                      <div
                        style={{
                          minHeight: 40,
                          padding: "0 14px",
                          borderRadius: 12,
                          background: "#2563eb",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <Download size={14} />
                        Baixar PDF
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobileClientPageFrame>
  );
}