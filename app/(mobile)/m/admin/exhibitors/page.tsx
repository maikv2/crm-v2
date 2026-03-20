"use client";

import Link from "next/link";
import { Building2, ChevronRight, Package } from "lucide-react";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";

import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function AdminMobileExhibitorsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobilePageFrame
      title="Expositores"
      subtitle="Gestão mobile dos expositores"
      desktopHref="/exhibitors"
    >
      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
        }}
      >
        <MobileSectionTitle title="Controle de expositores" />

        <div
          style={{
            fontSize: 13,
            color: colors.subtext,
            lineHeight: 1.6,
          }}
        >
          Acompanhe expositores instalados, manutenção e histórico de uso
          diretamente pelo mobile.
        </div>
      </MobileCard>

      <Link href="/exhibitors" style={{ textDecoration: "none" }}>
        <MobileCard
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Building2 size={18} color={colors.primary} />

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Ver expositores
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              Lista completa da operação
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </MobileCard>
      </Link>

      <Link href="/m/admin/exhibitors/new" style={{ textDecoration: "none" }}>
        <MobileCard
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Package size={18} color={colors.primary} />

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Novo expositor
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              Registrar novo equipamento
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </MobileCard>
      </Link>
    </MobilePageFrame>
  );
}