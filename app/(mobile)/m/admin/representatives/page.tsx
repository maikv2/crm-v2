"use client";

import { useEffect, useMemo, useState } from "react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
} from "@/app/components/mobile/mobile-shell";

type RepresentativeItem = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  phone?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

export default function MobileAdminRepresentativesPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RepresentativeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/representatives", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar representantes.");
        }

        if (active) {
          setItems(Array.isArray(json?.items) ? json.items : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar representantes."
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
        if (item.active) acc.active += 1;
        else acc.inactive += 1;
        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
      }
    );
  }, [items]);

  return (
    <MobilePageFrame
      title="Representantes"
      subtitle="Gestão mobile de representantes"
      desktopHref="/representatives"
    >
      {loading ? (
        <MobileCard>Carregando representantes...</MobileCard>
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
            <MobileStatCard label="Inativos" value={String(summary.inactive)} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Lista de representantes" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>
                Nenhum representante encontrado.
              </div>
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
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
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
                          marginTop: 4,
                          fontSize: 12,
                          opacity: 0.8,
                        }}
                      >
                        {item.region?.name || "Sem região"}
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
                          : "rgba(239,68,68,0.14)",
                        color: item.active ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {item.active ? "Ativo" : "Inativo"}
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
                      title="Email"
                      subtitle={item.email}
                      right={item.phone || "-"}
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