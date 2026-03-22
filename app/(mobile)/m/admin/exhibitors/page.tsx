"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type ExhibitorItem = {
  id: string;
  code?: string | null;
  name?: string | null;
  model?: string | null;
  status?: string | null;
  type?: string | null;
  installedAt?: string | null;
  nextVisitAt?: string | null;
  lastVisitAt?: string | null;
  client?: {
    id: string;
    name?: string | null;
  } | null;
  region?: {
    id: string;
    name?: string | null;
  } | null;
};

export default function AdminMobileExhibitorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExhibitorItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/exhibitors", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar expositores.");
        }

        if (active) {
          setItems(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar expositores."
          );
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

        if (String(item.status ?? "").toUpperCase() === "ACTIVE") {
          acc.active += 1;
        } else {
          acc.other += 1;
        }

        return acc;
      },
      { total: 0, active: 0, other: 0 }
    );
  }, [items]);

  return (
    <MobilePageFrame
      title="Expositores"
      subtitle="Gestão mobile dos expositores"
      desktopHref="/exhibitors"
    >
      {loading ? (
        <MobileCard>Carregando expositores...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard label="Total" value={String(summary.total)} />
            <MobileStatCard label="Ativos" value={String(summary.active)} />
            <MobileStatCard label="Outros" value={String(summary.other)} />
          </div>

          <Link href="/m/admin/exhibitors/new" style={{ textDecoration: "none" }}>
            <MobileCard>
              <div style={{ fontSize: 14, fontWeight: 900 }}>Novo expositor</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Abrir cadastro mobile de expositor
              </div>
            </MobileCard>
          </Link>

          <MobileCard>
            <MobileSectionTitle title="Lista de expositores" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum expositor encontrado.</div>
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
                        {item.code || "-"} • {item.name || "Expositor"}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          opacity: 0.8,
                        }}
                      >
                        {item.client?.name || "Sem cliente"} •{" "}
                        {item.region?.name || "Sem região"}
                      </div>
                    </div>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        background:
                          String(item.status ?? "").toUpperCase() === "ACTIVE"
                            ? "rgba(34,197,94,0.14)"
                            : "rgba(59,130,246,0.14)",
                        color:
                          String(item.status ?? "").toUpperCase() === "ACTIVE"
                            ? "#16a34a"
                            : "#2563eb",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.status || "Sem status"}
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
                      title="Modelo e tipo"
                      subtitle={item.model || "Sem modelo informado"}
                      right={item.type || "-"}
                    />
                    <MobileInfoRow
                      title="Instalação"
                      subtitle={`Instalado em ${formatDateBR(item.installedAt)}`}
                      right={`Próx. ${formatDateBR(item.nextVisitAt)}`}
                    />
                    <MobileInfoRow
                      title="Última visita"
                      subtitle={`Último atendimento ${formatDateBR(
                        item.lastVisitAt
                      )}`}
                      right="Operação"
                    />
                  </div>
                </div>
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}