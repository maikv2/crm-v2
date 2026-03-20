"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

export default function RepOrdersMobile() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/rep/orders");

    if (res.status === 401) {
      router.push("/login?redirect=/m/rep/orders");
      return;
    }

    const data = await res.json();
    setOrders(data.orders || []);
  }

  return (
    <div
      style={{
        padding: 20,
        minHeight: "100vh",
        background: colors.pageBg,
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        Pedidos
      </h1>

      <div style={{ display: "grid", gap: 10 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              padding: 14,
              background: colors.cardBg,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              Pedido #{order.number}
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              {order.client?.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}