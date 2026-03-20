"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  DollarSign,
  Package,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type QuickCardProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function QuickCard({ href, icon, title, description }: QuickCardProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard
        style={{
          padding: 14,
          borderRadius: 18,
          height: "100%",
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
            marginBottom: 12,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 14,
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
      </MobileCard>
    </Link>
  );
}

type LineLinkProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function LineLink({ href, icon, title, description }: LineLinkProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 0",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            background: colors.isDark ? "#111827" : "#f8fafc",
            border: `1px solid ${colors.border}`,
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
              fontSize: 14,
              fontWeight: 800,
              color: colors.text,
              lineHeight: 1.25,
            }}
          >
            {title}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: colors.subtext,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        </div>

        <ArrowRight size={16} color={colors.subtext} />
      </div>
    </Link>
  );
}

export default function RepMobileHome() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileRepPageFrame
      title="Representante"
      subtitle="Operação mobile da sua região"
    >
      <MobileCard
        style={{
          background: colors.isDark
            ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
            : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          borderRadius: 22,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: colors.text,
            lineHeight: 1.1,
            marginBottom: 8,
            letterSpacing: -0.4,
          }}
        >
          Visão rápida da sua operação
        </div>

        <div
          style={{
            fontSize: 13,
            color: colors.isDark ? "rgba(255,255,255,0.86)" : colors.subtext,
            lineHeight: 1.55,
            marginBottom: 16,
          }}
        >
          Consulte pedidos, clientes, comissões, financeiro e ações operacionais
          da sua região com navegação simplificada.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
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
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.subtext,
                marginBottom: 4,
              }}
            >
              Perfil
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Representante
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 12,
              background: colors.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
              border: `1px solid ${
                colors.isDark ? "rgba(255,255,255,0.08)" : "#bfdbfe"
              }`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: colors.subtext,
                marginBottom: 4,
              }}
            >
              Modo
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Região ativa
            </div>
          </div>
        </div>
      </MobileCard>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 12,
        }}
      >
        <QuickCard
          href="/m/rep/orders"
          icon={<Package size={18} />}
          title="Pedidos"
          description="Visualize e acompanhe os pedidos da sua região."
        />
        <QuickCard
          href="/m/rep/clients"
          icon={<Users size={18} />}
          title="Clientes"
          description="Acesse a base de clientes vinculada à sua área."
        />
        <QuickCard
          href="/m/rep/commissions"
          icon={<DollarSign size={18} />}
          title="Comissões"
          description="Consulte valores e acompanhamento comercial."
        />
        <QuickCard
          href="/m/rep/finance"
          icon={<Wallet size={18} />}
          title="Financeiro"
          description="Resumo financeiro e resultados da operação."
        />
      </div>

      <MobileCard>
        <MobileSectionTitle title="Operação do dia" />
        <div style={{ display: "grid" }}>
          <LineLink
            href="/m/rep/operations"
            icon={<Wrench size={18} />}
            title="Centro operacional"
            description="Solicitações, atendimentos e demandas da região."
          />
          <LineLink
            href="/m/rep/visit"
            icon={<BriefcaseBusiness size={18} />}
            title="Registrar visita"
            description="Lançe visitas e acompanhe a agenda comercial."
          />
          <LineLink
            href="/m/rep/orders/new"
            icon={<Package size={18} />}
            title="Novo pedido"
            description="Abra um novo pedido direto pela versão mobile."
          />
        </div>
      </MobileCard>
    </MobileRepPageFrame>
  );
}