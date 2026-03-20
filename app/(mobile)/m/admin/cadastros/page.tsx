"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Target,
  UserRoundCog,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
} from "@/app/components/mobile/mobile-shell";
import { adminMobileNavItems } from "@/app/components/mobile/mobile-admin-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AdminOverviewResponse = {
  summary: {
    clientsCount: number;
    exhibitorsCount: number;
    prospectsCount: number;
    representativesCount: number;
  };
};

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
      <div
        style={{
          borderRadius: 18,
          padding: 14,
          background: colors.isDark ? "#111827" : "#f8fafc",
          border: `1px solid ${colors.border}`,
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
        </div>

        <ArrowRight size={16} color={colors.subtext} />
      </div>
    </Link>
  );
}

export default function MobileAdminCadastrosPage() {
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
          router.push("/login?redirect=/m");
          return;
        }

        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar cadastros.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar cadastros."
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
      title="Cadastros"
      subtitle="Atalhos rápidos para a base do CRM"
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
              label="Expositores"
              value={String(data.summary.exhibitorsCount)}
            />
            <MobileStatCard
              label="Prospectos"
              value={String(data.summary.prospectsCount)}
            />
            <MobileStatCard
              label="Representantes"
              value={String(data.summary.representativesCount)}
            />
          </div>

          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <MobileSectionTitle title="Base comercial" />
            <div
              style={{
                fontSize: 13,
                color: colors.isDark
                  ? "rgba(255,255,255,0.86)"
                  : colors.subtext,
                lineHeight: 1.55,
              }}
            >
              Acesse os principais cadastros do CRM com navegação simples,
              visual mais limpo e entrada rápida no mobile.
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Acessos" />

            <div style={{ display: "grid", gap: 10 }}>
              <Shortcut
                href="/m/admin/clients"
                icon={<Users size={18} />}
                title="Clientes"
                description="Consulte e gerencie a base de clientes."
              />

              <Shortcut
                href="/m/admin/exhibitors"
                icon={<Building2 size={18} />}
                title="Expositores"
                description="Acompanhe expositores e seus vínculos."
              />

              <Shortcut
                href="/m/admin/prospects"
                icon={<Target size={18} />}
                title="Prospectos"
                description="Organize leads e oportunidades comerciais."
              />

              <Shortcut
                href="/m/admin/representatives"
                icon={<UserRoundCog size={18} />}
                title="Representantes"
                description="Gerencie a equipe comercial por região."
              />
            </div>
          </MobileCard>
        </>
      ) : null}
    </MobileShell>
  );
}