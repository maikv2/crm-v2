"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChartColumn,
  Map,
  Package,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

import MobileShell, {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AdminOverviewResponse = {
  summary: {
    salesTodayCents: number;
    salesTodayCount: number;
    salesMonthCents: number;
    salesMonthCount: number;
    overdueReceivablesCents: number;
    dueTodayReceivablesCents: number;
    pendingPortalRequests: number;
    pendingCashTransfersCount: number;
    overdueFinanceCount: number;
    clientsCount: number;
    exhibitorsCount: number;
    prospectsCount: number;
    representativesCount: number;
    visitsTodayCount: number;
  };
};

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

export default function AdminMobileHome() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/mobile/admin/overview", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/login?redirect=/m/admin");
          return;
        }

        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar resumo do admin.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar resumo do admin."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <MobileShell
      title="Admin Mobile"
      subtitle="Painel mobile do CRM V2"
      navItems={adminMobileNavItems}
      showBrand
      brandHref="/m/admin"
    >
      {loading ? (
        <MobileCard>Carregando...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : data ? (
        <>
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
                color: colors.isDark
                  ? "rgba(255,255,255,0.86)"
                  : colors.subtext,
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              Agora com resumo real de clientes, vendas, equipe e financeiro
              direto no mobile.
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
                  background: colors.isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#ffffff",
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
                  background: colors.isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#ffffff",
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
                  Vendas no mês
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: colors.text,
                  }}
                >
                  {formatMoneyBR(data.summary.salesMonthCents)}
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
            <MobileStatCard
              label="Clientes"
              value={String(data.summary.clientsCount)}
            />
            <MobileStatCard
              label="Vendas hoje"
              value={formatMoneyBR(data.summary.salesTodayCents)}
              helper={`${data.summary.salesTodayCount} pedidos`}
            />
            <MobileStatCard
              label="Representantes"
              value={String(data.summary.representativesCount)}
            />
            <MobileStatCard
              label="Receber hoje"
              value={formatMoneyBR(data.summary.dueTodayReceivablesCents)}
            />
          </div>

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
            <MobileSectionTitle title="Indicadores rápidos" />
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                <span>Expositores</span>
                <strong>{data.summary.exhibitorsCount}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                <span>Prospectos</span>
                <strong>{data.summary.prospectsCount}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                <span>Alertas de portal</span>
                <strong>{data.summary.pendingPortalRequests}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                <span>Repasses pendentes</span>
                <strong>{data.summary.pendingCashTransfersCount}</strong>
              </div>
            </div>
          </MobileCard>

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
        </>
      ) : null}
    </MobileShell>
  );
}