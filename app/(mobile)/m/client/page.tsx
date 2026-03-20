"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Home,
  Package,
  ShoppingCart,
  ToolCase,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileShell, {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
import { clientMobileNavItems } from "@/app/components/mobile/mobile-client-shared";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ExhibitorProduct = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
  };
};

type ExhibitorMaintenance = {
  id: string;
  type: string;
  description?: string | null;
  performedAt: string;
  nextActionAt?: string | null;
};

type PortalExhibitor = {
  id: string;
  code?: string | null;
  name?: string | null;
  model?: string | null;
  type?: string | null;
  status: string;
  installedAt: string;
  nextVisitAt?: string | null;
  products: ExhibitorProduct[];
  maintenances: ExhibitorMaintenance[];
};

type PortalClient = {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  district?: string | null;
  exhibitors: PortalExhibitor[];
};

type PortalResponse = {
  client: PortalClient;
};

const fabActions = [
  { label: "Fazer pedido", href: "/m/client/order-request", icon: ShoppingCart },
  { label: "Solicitar visita", href: "/m/client/visit", icon: ToolCase },
  { label: "Solicitar manutenção", href: "/m/client/maintenance", icon: Wrench },
];

export default function MobileClientPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/portal-auth/me", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (res.status === 401) {
          router.push("/portal/login");
          return;
        }

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar portal mobile do cliente.");
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
              : "Erro ao carregar portal mobile do cliente."
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

  const summary = useMemo(() => {
    const exhibitors = data?.client?.exhibitors ?? [];
    const activeExhibitors = exhibitors.filter((item) => item.status === "ACTIVE");
    const totalProducts = exhibitors.reduce((sum, exhibitor) => {
      return sum + (exhibitor.products?.length ?? 0);
    }, 0);
    const nextVisits = exhibitors.filter((item) => item.nextVisitAt).length;

    return {
      exhibitorsCount: exhibitors.length,
      activeExhibitorsCount: activeExhibitors.length,
      totalProducts,
      nextVisits,
    };
  }, [data]);

  return (
    <MobileShell
      title="Meu Portal"
      subtitle="Acesso rápido do cliente"
      navItems={clientMobileNavItems}
      fabActions={fabActions}
      showBrand
      brandHref="/m/client"
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
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
              {data.client.name}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              Código {data.client.code} • {data.client.city || "-"} •{" "}
              {data.client.district || "-"}
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
              label="Expositores"
              value={String(summary.exhibitorsCount)}
            />
            <MobileStatCard
              label="Ativos"
              value={String(summary.activeExhibitorsCount)}
            />
            <MobileStatCard
              label="Produtos"
              value={String(summary.totalProducts)}
            />
            <MobileStatCard
              label="Próximas visitas"
              value={String(summary.nextVisits)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Ações rápidas" />
            <div style={{ display: "grid", gap: 10 }}>
              <Link href="/m/client/order-request">
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
                  <ShoppingCart size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Fazer pedido</div>
                </div>
              </Link>

              <Link href="/m/client/visit">
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
                  <ToolCase size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Solicitar visita</div>
                </div>
              </Link>

              <Link href="/m/client/maintenance">
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
                  <Wrench size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    Solicitar manutenção
                  </div>
                </div>
              </Link>

              <Link href="/m/client/orders">
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
                  <ClipboardList size={18} />
                  <div style={{ fontSize: 14, fontWeight: 800 }}>Meus pedidos</div>
                </div>
              </Link>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Meus expositores" />
            {data.client.exhibitors.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum expositor encontrado.
              </div>
            ) : (
              data.client.exhibitors.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={item.name || item.code || "Expositor"}
                  subtitle={`Instalado em ${formatDateBR(item.installedAt)} • próxima visita ${formatDateBR(
                    item.nextVisitAt
                  )}`}
                  right={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Package size={14} />
                      {item.products?.length ?? 0}
                    </span>
                  }
                  href="/portal/dashboard"
                />
              ))
            )}
          </MobileCard>
        </>
      ) : null}
    </MobileShell>
  );
}