"use client";

import Link from "next/link";
import { Home, Package, DollarSign, Wallet } from "lucide-react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

export default function MobileRepNavigation() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const itemStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    textDecoration: "none",
    color: colors.text,
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        borderTop: `1px solid ${colors.border}`,
        background: colors.cardBg,
        display: "flex",
        padding: "6px 6px",
        zIndex: 50,
      }}
    >
      <Link href="/m/rep" style={itemStyle}>
        <Home size={20} />
        Início
      </Link>

      <Link href="/m/rep/orders" style={itemStyle}>
        <Package size={20} />
        Pedidos
      </Link>

      <Link href="/m/rep/commissions" style={itemStyle}>
        <DollarSign size={20} />
        Comissões
      </Link>

      <Link href="/m/rep/finance" style={itemStyle}>
        <Wallet size={20} />
        Financeiro
      </Link>
    </div>
  );
}