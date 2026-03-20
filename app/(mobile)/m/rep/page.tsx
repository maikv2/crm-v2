"use client";

import Link from "next/link";
import { Package, DollarSign, Wallet } from "lucide-react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

export default function RepMobileHome() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  function Card({
    href,
    icon,
    title,
    description,
  }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
  }) {
    return (
      <Link
        href={href}
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 16,
          display: "block",
          textDecoration: "none",
          color: colors.text,
          background: colors.cardBg,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 8,
          }}
        >
          {icon}

          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: colors.subtext,
          }}
        >
          {description}
        </div>
      </Link>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        background: colors.pageBg,
        minHeight: "100vh",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 900,
          marginBottom: 20,
          color: colors.text,
        }}
      >
        Representante
      </h1>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <Card
          href="/m/rep/orders"
          icon={<Package size={20} />}
          title="Pedidos"
          description="Visualize pedidos da sua região"
        />

        <Card
          href="/m/rep/commissions"
          icon={<DollarSign size={20} />}
          title="Comissões"
          description="Acompanhe suas comissões"
        />

        <Card
          href="/m/rep/finance"
          icon={<Wallet size={20} />}
          title="Financeiro"
          description="Resumo financeiro da região"
        />
      </div>
    </div>
  );
}