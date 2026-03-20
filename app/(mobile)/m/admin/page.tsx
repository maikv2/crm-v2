"use client";

import Link from "next/link";
import {
  Users,
  Package,
  Map,
  ShoppingCart,
  Wallet,
  UserCog,
} from "lucide-react";

import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

export default function AdminMobileHome() {
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
        Admin Mobile
      </h1>

      <div
        style={{
          display: "grid",
          gap: 14,
        }}
      >
        <Card
          href="/m/admin/clients"
          icon={<Users size={20} />}
          title="Clientes"
          description="Lista de clientes"
        />

        <Card
          href="/m/admin/orders"
          icon={<ShoppingCart size={20} />}
          title="Pedidos"
          description="Pedidos do sistema"
        />

        <Card
          href="/m/admin/exhibitors"
          icon={<Package size={20} />}
          title="Expositores"
          description="Gestão de expositores"
        />

        <Card
          href="/m/admin/regions"
          icon={<Map size={20} />}
          title="Regiões"
          description="Gerenciar regiões"
        />

        <Card
          href="/m/admin/finance"
          icon={<Wallet size={20} />}
          title="Financeiro"
          description="Contas e transferências"
        />

        <Card
          href="/m/admin/representatives"
          icon={<UserCog size={20} />}
          title="Representantes"
          description="Gestão de representantes"
        />
      </div>
    </div>
  );
}