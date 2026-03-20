"use client";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";

import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function RepFinanceMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileRepPageFrame
      title="Financeiro"
      subtitle="Resultados da sua região"
      desktopHref="/rep/finance"
    >
      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
        }}
      >
        <MobileSectionTitle title="Resumo financeiro" />

        <div
          style={{
            fontSize: 13,
            color: colors.subtext,
            lineHeight: 1.6,
          }}
        >
          Consulte comissões, vendas e resultados financeiros da sua região
          diretamente no mobile.
        </div>
      </MobileCard>
    </MobileRepPageFrame>
  );
}