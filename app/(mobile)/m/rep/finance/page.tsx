"use client";

import Link from "next/link";
import {
  ArrowRight,
  DollarSign,
  Wallet,
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

type FinanceShortcutProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FinanceShortcut({
  href,
  icon,
  title,
  description,
}: FinanceShortcutProps) {
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

export default function RepFinanceMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileRepPageFrame
      title="Financeiro"
      subtitle="Resultados da sua região"
      desktopHref="/rep/finance"
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
            value="Financeiro"
            helper="Operação do representante"
          />
          <MobileStatCard
            label="Acesso"
            value="Mobile"
            helper="Mesmo padrão do admin"
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
          <MobileSectionTitle title="Resumo financeiro" />
          <div
            style={{
              fontSize: 13,
              color: colors.isDark
                ? "rgba(255,255,255,0.86)"
                : colors.subtext,
              lineHeight: 1.6,
            }}
          >
            Consulte comissões, resultados e visão financeira da sua região com o
            mesmo acabamento visual da área administrativa.
          </div>
        </MobileCard>
      </MobileAppear>

      <MobileAppear delay={110}>
        <div style={{ display: "grid", gap: 12 }}>
          <FinanceShortcut
            href="/m/rep/commissions"
            icon={<DollarSign size={18} />}
            title="Comissões"
            description="Consulte valores, histórico e acompanhamento comercial."
          />

          <FinanceShortcut
  href="/m/rep/finance"
  icon={<Wallet size={18} />}
  title="Visão completa"
  description="Abrir a área completa do financeiro do representante."
/>
        </div>
      </MobileAppear>
    </MobileRepPageFrame>
  );
}