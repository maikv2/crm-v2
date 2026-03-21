"use client";

import Link from "next/link";
import { Package, Users, DollarSign, Wallet, Wrench, Briefcase } from "lucide-react";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function Card({ href, icon, title, desc }: any) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

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

export default function RepMobileHome() {
  return (
    <MobileRepPageFrame title="Representante" subtitle="Painel da sua região">
      <div style={{ display: "grid", gap: 12 }}>

        <Card
          href="/m/rep/orders"
          icon={<Package size={18} />}
          title="Pedidos"
          desc="Pedidos da sua região"
        />

        <Card
          href="/m/rep/clients"
          icon={<Users size={18} />}
          title="Clientes"
          desc="Base de clientes"
        />

        <Card
          href="/m/rep/finance"
          icon={<Wallet size={18} />}
          title="Financeiro"
          desc="Resultados e comissões"
        />

        <Card
          href="/m/rep/finance/commissions"
          icon={<DollarSign size={18} />}
          title="Comissões"
          desc="Controle de comissões"
        />

        <Card
          href="/m/rep/operations"
          icon={<Wrench size={18} />}
          title="Operações"
          desc="Central operacional"
        />

        <Card
          href="/m/rep/visit"
          icon={<Briefcase size={18} />}
          title="Visitas"
          desc="Registrar visita"
        />

      </div>
    </MobileRepPageFrame>
  );
}