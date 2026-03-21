"use client";

import Link from "next/link";
import { DollarSign, Package } from "lucide-react";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function RepFinancePage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  function Card({ href, title, desc, icon }: any) {
    return (
      <Link href={href} style={{ textDecoration: "none" }}>
        <MobileCard style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: colors.isDark ? "#111827" : "#e8f0ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.primary,
              }}
            >
              {icon}
            </div>

            <div>
              <div style={{ fontWeight: 900 }}>{title}</div>
              <div style={{ fontSize: 12, color: colors.subtext }}>{desc}</div>
            </div>
          </div>
        </MobileCard>
      </Link>
    );
  }

  return (
    <MobileRepPageFrame
      title="Financeiro"
      subtitle="Financeiro da região"
      desktopHref="/rep/finance"
    >
      <div style={{ display: "grid", gap: 12 }}>

        <Card
          href="/m/rep/finance/commissions"
          title="Comissões"
          desc="Acompanhar comissões"
          icon={<DollarSign size={18} />}
        />

        <Card
          href="/m/rep/orders"
          title="Pedidos"
          desc="Ver pedidos da região"
          icon={<Package size={18} />}
        />

      </div>
    </MobileRepPageFrame>
  );
}