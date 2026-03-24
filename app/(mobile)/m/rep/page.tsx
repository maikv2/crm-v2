"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  PlusCircle,
  Store,
  UserPlus,
  Wrench,
} from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111827" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

export default function RepMobileDashboardPage() {
  return (
    <MobileRepPageFrame
      title="Representante"
      subtitle="Acessos rápidos"
      desktopHref="/rep"
    >
      <Shortcut
        href="/m/rep/orders/new"
        title="Novo pedido"
        subtitle="Abrir pedido do representante"
        icon={<PlusCircle size={20} />}
      />

      <Shortcut
        href="/m/rep/clients"
        title="Clientes"
        subtitle="Ver clientes da sua região"
        icon={<Store size={20} />}
      />

      <Shortcut
        href="/m/rep/clients/new"
        title="Novo cliente"
        subtitle="Cadastrar novo cliente"
        icon={<UserPlus size={20} />}
      />

      <Shortcut
        href="/m/rep/exhibitors"
        title="Expositores"
        subtitle="Ver expositores"
        icon={<Wrench size={20} />}
      />

      <Shortcut
        href="/m/rep/visit"
        title="Visitas"
        subtitle="Registrar visita"
        icon={<CalendarDays size={20} />}
      />

      <Shortcut
        href="/m/rep/operations"
        title="Operações"
        subtitle="Acessos operacionais"
        icon={<Wrench size={20} />}
      />
    </MobileRepPageFrame>
  );
}