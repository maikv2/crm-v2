"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Package,
  Wrench,
} from "lucide-react";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileAppear from "@/app/components/mobile/mobile-appear";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ShortcutProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function Shortcut({ href, icon, title, description }: ShortcutProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard
        style={{
          padding: 14,
          borderRadius: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111f39" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              {title}
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {description}
            </div>
          </div>

          <ArrowRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

export default function RepOperationsMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileRepPageFrame
      title="Operações"
      subtitle="Centro operacional da sua região"
      desktopHref="/rep"
    >
      <MobileAppear>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <MobileStatCard
            label="Área"
            value="Operações"
            helper="Centro operacional"
          />
          <MobileStatCard
            label="Modo"
            value="Regional"
            helper="Somente sua região"
          />
        </div>
      </MobileAppear>

      <MobileAppear delay={60}>
        <MobileCard
          style={{
            background: colors.isDark
              ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          }}
        >
          <MobileSectionTitle title="Fluxo operacional" />
          <div
            style={{
              fontSize: 13,
              color: colors.isDark
                ? "rgba(255,255,255,0.86)"
                : colors.subtext,
              lineHeight: 1.6,
            }}
          >
            Centralize solicitações, visitas, pedidos e demandas operacionais com
            o mesmo padrão visual do admin.
          </div>
        </MobileCard>
      </MobileAppear>

      <MobileAppear delay={110}>
        <div style={{ display: "grid", gap: 12 }}>
          <Shortcut
            href="/m/rep/visit"
            icon={<BriefcaseBusiness size={18} />}
            title="Registrar visita"
            description="Lançe visitas e acompanhe a agenda comercial."
          />

          <Shortcut
            href="/m/rep/orders/new"
            icon={<Package size={18} />}
            title="Novo pedido"
            description="Abra um novo pedido diretamente na versão mobile."
          />

          <Shortcut
            href="/m/rep"
            icon={<Wrench size={18} />}
            title="Abrir painel completo"
            description="Acessar a área completa do representante no desktop."
          />
        </div>
      </MobileAppear>
    </MobileRepPageFrame>
  );
}