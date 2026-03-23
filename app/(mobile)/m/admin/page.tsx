"use client";

import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChartColumn,
  ChevronRight,
  Map,
  Package,
  PlusCircle,
  ShoppingCart,
  Store,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import MobileShell, {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
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

export default function AdminMobileHome() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <MobileShell
      title="Admin Mobile"
      subtitle="Painel mobile do CRM V2"
      navItems={adminMobileNavItems}
      showBrand
      brandHref="/m/admin"
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
          Controle rápido da operação
        </div>

        <div
          style={{
            fontSize: 13,
            color: colors.isDark ? "rgba(255,255,255,0.86)" : colors.subtext,
            lineHeight: 1.55,
            marginBottom: 16,
          }}
        >
          Acesse clientes, pedidos, financeiro, representantes e cadastros com
          navegação pensada para mobile.
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
              Administrador
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
              Experiência
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Mobile nativo
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Atalhos principais" />

        <div style={{ display: "grid", gap: 12 }}>
          <Shortcut
            href="/m/admin/orders/new"
            title="Novo pedido"
            subtitle="Abrir o fluxo mobile para lançar um pedido"
            icon={<PlusCircle size={18} />}
          />

          <Shortcut
            href="/m/admin/clients/new"
            title="Novo cliente"
            subtitle="Cadastrar um novo cliente rapidamente"
            icon={<UserPlus size={18} />}
          />

          <Shortcut
            href="/m/admin/exhibitors/new"
            title="Novo expositor"
            subtitle="Cadastrar um novo expositor pelo mobile"
            icon={<Store size={18} />}
          />
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
          href="/m/admin/clients"
          icon={<Users size={18} />}
          title="Clientes"
          description="Lista, busca e acesso rápido aos cadastros."
        />
        <QuickCard
          href="/m/admin/orders"
          icon={<ShoppingCart size={18} />}
          title="Pedidos"
          description="Acompanhe pedidos e abra novos lançamentos."
        />
        <QuickCard
          href="/m/admin/finance"
          icon={<Wallet size={18} />}
          title="Financeiro"
          description="Recebíveis, transferências e visão resumida."
        />
        <QuickCard
          href="/m/admin/regions"
          icon={<Map size={18} />}
          title="Regiões"
          description="Controle das regiões e estrutura comercial."
        />
      </div>

      <MobileCard>
        <MobileSectionTitle title="Acesso rápido" />
        <div style={{ display: "grid" }}>
          <LineLink
            href="/m/admin/exhibitors"
            icon={<Package size={18} />}
            title="Expositores"
            description="Gestão de expositores e acompanhamento."
          />
          <LineLink
            href="/m/admin/representatives"
            icon={<UserCog size={18} />}
            title="Representantes"
            description="Equipe comercial por região."
          />
          <LineLink
            href="/m/admin/prospects"
            icon={<BriefcaseBusiness size={18} />}
            title="Prospectos"
            description="Leads e oportunidades comerciais."
          />
          <LineLink
            href="/m/admin/sales"
            icon={<ChartColumn size={18} />}
            title="Vendas"
            description="Resumo comercial em tela mobile."
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Cadastros e ajustes" />
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/m/admin/cadastros" style={{ textDecoration: "none" }}>
            <div
              style={{
                borderRadius: 16,
                padding: 14,
                background: colors.isDark ? "#111827" : "#f8fafc",
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Abrir central de cadastros
            </div>
          </Link>

          <Link href="/m/admin/more" style={{ textDecoration: "none" }}>
            <div
              style={{
                borderRadius: 16,
                padding: 14,
                background: colors.isDark ? "#111827" : "#f8fafc",
                border: `1px solid ${colors.border}`,
                color: colors.text,
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Ver mais opções do sistema
            </div>
          </Link>
        </div>
      </MobileCard>
    </MobileShell>
  );
}