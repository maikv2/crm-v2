"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
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

function maintenanceLabel(type?: string | null) {
  if (!type) return "Manutenção";
  switch (String(type).toUpperCase()) {
    case "PREVENTIVE":
      return "Preventiva";
    case "CORRECTIVE":
      return "Corretiva";
    case "CLEANING":
      return "Limpeza";
    case "REPLACEMENT":
      return "Troca";
    case "COLLECTION":
      return "Coleta";
    case "REINSTALLATION":
      return "Reinstalação";
    default:
      return type;
  }
}

export default function MobileClientExhibitorDetailsPage() {
  const params = useParams<{ id: string }>();
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
          throw new Error(json?.error || "Erro ao carregar expositor.");
        }

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar expositor."
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

  const exhibitor = useMemo(() => {
    return data?.client?.exhibitors?.find((item) => item.id === params?.id) ?? null;
  }, [data, params?.id]);

  const summary = useMemo(() => {
    const products = exhibitor?.products ?? [];
    const maintenances = exhibitor?.maintenances ?? [];

    return {
      skuCount: products.length,
      totalUnits: products.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      ),
      maintenancesCount: maintenances.length,
    };
  }, [exhibitor]);

  return (
    <MobileClientPageFrame
      title="Meu expositor"
      subtitle="Estoque em empréstimo e histórico"
      desktopHref="/portal/dashboard"
    >
      {loading ? (
        <MobileCard>Carregando expositor...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : !exhibitor ? (
        <MobileCard>Expositor não encontrado.</MobileCard>
      ) : (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
              {exhibitor.name || exhibitor.code || "Expositor"}
            </div>

            <div style={{ fontSize: 13, opacity: 0.9, display: "grid", gap: 4 }}>
              <div>Status: {exhibitor.status || "-"}</div>
              <div>Instalado em: {formatDateBR(exhibitor.installedAt)}</div>
              <div>Próxima visita: {formatDateBR(exhibitor.nextVisitAt)}</div>
              <div>
                Modelo: {exhibitor.model || "-"} • Tipo: {exhibitor.type || "-"}
              </div>
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="SKUs"
              value={String(summary.skuCount)}
            />
            <MobileStatCard
              label="Unidades"
              value={String(summary.totalUnits)}
            />
            <MobileStatCard
              label="Manutenções"
              value={String(summary.maintenancesCount)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Estoque em empréstimo" />

            {exhibitor.products.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum item registrado neste expositor.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {exhibitor.products.map((item) => (
                  <MobileInfoRow
                    key={item.id}
                    title={item.product.name}
                    subtitle={item.product.sku || "Sem SKU"}
                    right={`${item.quantity} un`}
                  />
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Histórico de manutenção" />

            {exhibitor.maintenances.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhuma manutenção registrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {exhibitor.maintenances.map((item) => (
                  <MobileInfoRow
                    key={item.id}
                    title={maintenanceLabel(item.type)}
                    subtitle={
                      item.description?.trim()
                        ? `${item.description} • ${formatDateBR(item.performedAt)}`
                        : formatDateBR(item.performedAt)
                    }
                    right={formatDateBR(item.nextActionAt)}
                  />
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobileClientPageFrame>
  );
}