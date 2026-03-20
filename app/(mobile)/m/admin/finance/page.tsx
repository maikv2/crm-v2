"use client";

import Link from "next/link";
import { Wallet, ArrowRightLeft } from "lucide-react";

import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

export default function AdminFinanceMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  function Card({
    href,
    icon,
    title,
  }: {
    href: string;
    icon: React.ReactNode;
    title: string;
  }) {
    return (
      <Link
        href={href}
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
          color: colors.text,
          background: colors.cardBg,
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
        Financeiro
      </h1>

      <div style={{ display: "grid", gap: 12 }}>
        <Card
          href="/m/admin/finance/receivables"
          icon={<Wallet size={20} />}
          title="Contas a receber"
        />

        <Card
          href="/m/admin/finance/transfers"
          icon={<ArrowRightLeft size={20} />}
          title="Transferências"
        />
      </div>
    </div>
  );
}