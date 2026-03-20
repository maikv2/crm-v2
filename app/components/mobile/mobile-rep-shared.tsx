"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  DollarSign,
  Home,
  Package,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

export type RepMobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const repMobileNavItems: RepMobileNavItem[] = [
  { label: "Início", href: "/m/rep", icon: Home },
  { label: "Clientes", href: "/m/rep/clients", icon: Users },
  { label: "Pedidos", href: "/m/rep/orders", icon: Package },
  { label: "Comissões", href: "/m/rep/commissions", icon: DollarSign },
  { label: "Financeiro", href: "/m/rep/finance", icon: Wallet },
  { label: "Operações", href: "/m/rep/operations", icon: Wrench },
];

export const repOperationLinks = {
  clients: "/m/rep/clients",
  orders: "/m/rep/orders",
  commissions: "/m/rep/commissions",
  finance: "/m/rep/finance",
  operations: "/m/rep/operations",
  visit: "/m/rep/visit",
  exhibitors: "/m/rep/operations",
  prospects: "/m/rep/operations",
  maintenance: "/m/rep/operations",
};

export default function MobileRepNavigation() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderTop: `1px solid ${colors.border}`,
        background: colors.cardBg,
        padding: "6px 8px calc(6px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: 4,
        }}
      >
        {repMobileNavItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                minHeight: 56,
                borderRadius: 14,
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                color: active ? colors.primary : colors.text,
                background: active
                  ? colors.isDark
                    ? "rgba(37,99,235,0.18)"
                    : "#dbeafe"
                  : "transparent",
                border: active
                  ? `1px solid ${
                      colors.isDark ? "rgba(37,99,235,0.42)" : "#bfdbfe"
                    }`
                  : "1px solid transparent",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}