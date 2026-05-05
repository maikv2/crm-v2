"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  HandCoins,
  Landmark,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";

import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
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

export default function AdminFinanceMobile() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobilePageFrame
      title="Financeiro"
      subtitle="Atalhos mobile do financeiro"
      desktopHref="/finance"
    >
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
          helper="Fluxo administrativo"
        />
        <MobileStatCard
          label="Navegação"
          value="Completa"
          helper="Desktop e mobile"
        />
      </div>

      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
        }}
      >
        <MobileSectionTitle title="Visão rápida" />
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background: colors.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
              border: `1px solid ${
                colors.isDark ? "rgba(255,255,255,0.08)" : "#bfdbfe"
              }`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                background: colors.isDark ? "#111f39" : "#e8f0ff",
                color: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Landmark size={18} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: colors.subtext,
                  marginBottom: 2,
                }}
              >
                Operação financeira
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: colors.text,
                  lineHeight: 1.35,
                }}
              >
                Acesse recebíveis, pagamentos, caixa, repasses, relatórios e investidores no mobile
              </div>
            </div>
          </div>
        </div>
      </MobileCard>

      <div style={{ display: "grid", gap: 12 }}>
        <FinanceShortcut
          href="/m/admin/finance/receivables"
          icon={<Wallet size={18} />}
          title="Contas a receber"
          description="Consulte recebimentos, pendências e títulos em aberto."
        />

        <FinanceShortcut
          href="/m/admin/finance/payables"
          icon={<Receipt size={18} />}
          title="Contas a pagar"
          description="Acompanhe despesas, vencimentos e pagamentos lançados."
        />

        <FinanceShortcut
          href="/m/admin/finance/region-cash"
          icon={<Landmark size={18} />}
          title="Caixa da região"
          description="Controle valores recebidos pelas regiões e pendências de repasse."
        />

        <FinanceShortcut
          href="/m/admin/finance/transfers"
          icon={<ArrowRightLeft size={18} />}
          title="Repasse da matriz"
          description="Acompanhe movimentações e repasses lançados no sistema."
        />

        <FinanceShortcut
          href="/m/admin/finance/reports"
          icon={<BarChart3 size={18} />}
          title="Relatórios financeiros"
          description="Resumo financeiro com atalhos para relatórios e indicadores."
        />

        <FinanceShortcut
          href="/m/admin/finance/investors"
          icon={<Users size={18} />}
          title="Investidores"
          description="Consulte investidores, cotistas e cotas sem gerar cadastro."
        />

        <FinanceShortcut
          href="/m/admin/finance/investor-distributions"
          icon={<HandCoins size={18} />}
          title="Repasses para investidores"
          description="Controle prévias, histórico e distribuição de repasses."
        />
      </div>
    </MobilePageFrame>
  );
}
