"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Map,
  Package,
  Route,
  Store,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import type { ReactNode } from "react";

function ActionCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
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

export default function MobileRepOperationsPage() {
  return (
    <MobileRepPageFrame
      title="Centro de operações"
      subtitle="Atalhos operacionais do representante"
      desktopHref="/rep/operations"
    >
      <MobileCard>
        <MobileSectionTitle title="Cadastros e prospecção" />

        <div style={{ display: "grid", gap: 12 }}>
          <ActionCard
            href="/m/rep/clients/new"
            title="Novo cliente"
            subtitle="Cadastrar um novo cliente da região"
            icon={<UserPlus size={18} />}
          />

          <ActionCard
            href="/m/rep/exhibitors/new"
            title="Novo expositor"
            subtitle="Cadastrar um novo expositor da região"
            icon={<Store size={18} />}
          />

          <ActionCard
            href="/m/rep/prospects"
            title="Prospectos"
            subtitle="Registrar e acompanhar prospecções"
            icon={<Target size={18} />}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Rotina comercial" />

        <div style={{ display: "grid", gap: 12 }}>
          <ActionCard
            href="/m/rep/orders/new"
            title="Novo pedido"
            subtitle="Abrir o fluxo mobile de pedido"
            icon={<Package size={18} />}
          />

          <ActionCard
            href="/m/rep/visit"
            title="Agenda"
            subtitle="Ver visitas do dia, atrasadas e próximas"
            icon={<CalendarDays size={18} />}
          />

          <ActionCard
            href="/m/rep/clients"
            title="Clientes"
            subtitle="Consultar carteira de clientes da região"
            icon={<Users size={18} />}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Consulta e apoio" />

        <div style={{ display: "grid", gap: 12 }}>
          <ActionCard
            href="/m/rep/map"
            title="Mapa"
            subtitle="Abrir o mapa comercial com clientes e prospectos geolocalizados"
            icon={<Map size={18} />}
          />

          <ActionCard
            href="/m/rep/routes"
            title="Rotas"
            subtitle="Abrir navegação e traçar rota até clientes e prospectos"
            icon={<Route size={18} />}
          />

          <ActionCard
            href="/m/rep/exhibitors"
            title="Expositores"
            subtitle="Consultar expositores instalados e agenda"
            icon={<Store size={18} />}
          />

          <ActionCard
            href="/m/rep/finance"
            title="Financeiro"
            subtitle="Comissões, cobranças e repasses"
            icon={<CircleDollarSign size={18} />}
          />
        </div>
      </MobileCard>
    </MobileRepPageFrame>
  );
}