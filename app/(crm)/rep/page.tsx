"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function RepHomePage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 12,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const action: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  function handleNewOrder() {
    router.push("/clients");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1000 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 20 }}>
          Painel do Representante
        </h1>

        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
            Ações rápidas
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button style={action} onClick={handleNewOrder}>
              Novo pedido
            </button>

            <button
              style={action}
              onClick={() => router.push("/rep/orders")}
            >
              Ver pedidos
            </button>

            <button
              style={action}
              onClick={() => router.push("/clients")}
            >
              Ver clientes
            </button>

            <button
              style={action}
              onClick={() => router.push("/exhibitors")}
            >
              Ver expositores
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}