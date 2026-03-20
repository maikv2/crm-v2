"use client";

import Link from "next/link";
import { ChevronRight, Map } from "lucide-react";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";

import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function AdminRegionsMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobilePageFrame
      title="Regiões"
      subtitle="Controle das regiões comerciais"
      desktopHref="/regions"
    >
      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
        }}
      >
        <MobileSectionTitle title="Gestão de regiões" />

        <div
          style={{
            fontSize: 13,
            color: colors.subtext,
          }}
        >
          Defina territórios, representantes responsáveis e estrutura comercial
          de cada região.
        </div>
      </MobileCard>

      <Link href="/regions" style={{ textDecoration: "none" }}>
        <MobileCard
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Map size={18} color={colors.primary} />

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 14,
                color: colors.text,
              }}
            >
              Ver regiões
            </div>

            <div
              style={{
                fontSize: 12,
                color: colors.subtext,
              }}
            >
              Estrutura territorial
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </MobileCard>
      </Link>
    </MobilePageFrame>
  );
}