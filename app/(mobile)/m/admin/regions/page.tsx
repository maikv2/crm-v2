"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Map, Target, Wallet } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type RegionItem = {
  id: string;
  name: string;
  active: boolean;
  targetClients: number;
  monthlySalesTargetCents: number;
  maxQuotaCount: number;
  quotaValueCents: number;
  investmentTargetCents: number;
  activeQuotaCount: number;
  companyQuotaCount: number;
  investorQuotaCount: number;
  availableQuotaCount: number;
  occupationPercent: number;
  stockLocationId?: string | null;
  stockLocationName?: string | null;
  stockLocationActive?: boolean | null;
};

export default function AdminRegionsMobile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RegionItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/regions", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar regiões.");
        }

        if (active) {
          setItems(Array.isArray(json?.items) ? json.items : []);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar regiões.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.active) acc.active += 1;
        acc.targetClients += Number(item.targetClients || 0);
        acc.investmentTargetCents += Number(item.investmentTargetCents || 0);
        return acc;
      },
      {
        total: 0,
        active: 0,
        targetClients: 0,
        investmentTargetCents: 0,
      }
    );
  }, [items]);

  return (
    <MobilePageFrame
      title="Regiões"
      subtitle="Controle mobile das regiões comerciais"
      desktopHref="/regions"
    >
      {loading ? (
        <MobileCard>Carregando regiões...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard label="Regiões" value={String(summary.total)} />
            <MobileStatCard label="Ativas" value={String(summary.active)} />
            <MobileStatCard
              label="Meta de clientes"
              value={String(summary.targetClients)}
            />
            <MobileStatCard
              label="Meta investimento"
              value={formatMoneyBR(summary.investmentTargetCents)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Lista de regiões" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma região encontrada.</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(148,163,184,0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 900,
                        }}
                      >
                        {item.name}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          opacity: 0.8,
                        }}
                      >
                        {item.stockLocationName
                          ? `Estoque: ${item.stockLocationName}`
                          : "Sem estoque vinculado"}
                      </div>
                    </div>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        background: item.active
                          ? "rgba(34,197,94,0.14)"
                          : "rgba(245,158,11,0.14)",
                        color: item.active ? "#16a34a" : "#b45309",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <MobileInfoRow
                      title="Meta comercial"
                      subtitle={`Clientes alvo: ${item.targetClients}`}
                      right={formatMoneyBR(item.monthlySalesTargetCents)}
                    />
                    <MobileInfoRow
                      title="Cotas"
                      subtitle={`Ativas ${item.activeQuotaCount} • Disponíveis ${item.availableQuotaCount}`}
                      right={`${item.occupationPercent}%`}
                    />
                    <MobileInfoRow
                      title="Distribuição"
                      subtitle={`Empresa ${item.companyQuotaCount} • Investidores ${item.investorQuotaCount}`}
                      right={formatMoneyBR(item.quotaValueCents)}
                    />
                  </div>
                </div>
              ))
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resumo da operação" />
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <Map size={16} />
                Gestão territorial e estrutura comercial por região
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <Target size={16} />
                Metas de clientes, vendas e ocupação de cotas
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <Building2 size={16} />
                Validação rápida de vínculo com estoque
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <Wallet size={16} />
                Acompanhamento da meta de investimento regional
              </div>
            </div>
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}