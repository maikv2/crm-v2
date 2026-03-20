"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
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
          setError(err instanceof Error ? err.message : "Erro ao carregar cadastros.");
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

          <MobileCard>
            <MobileSectionTitle title="Acessos" />

            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/m/admin/clients">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Users size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Clientes</div>
                </div>
              </Link>

              <Link href="/m/admin/exhibitors">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Building2 size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Expositores</div>
                </div>
              </Link>

              <Link href="/m/admin/prospects">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Target size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Prospectos</div>
                </div>
              </Link>

              <Link href="/m/admin/representatives">
                <div
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <UserRoundCog size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Representantes</div>
                </div>
              </Link>
            </div>
          </MobileCard>
        </>
      ) : null}
    </MobileShell>
  );
}