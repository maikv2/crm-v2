"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type ExhibitorItem = {
  id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  client?: {
    id: string;
    name?: string | null;
  } | null;
  nextVisitAt?: string | null;
};

export default function MobileRepExhibitorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExhibitorItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/exhibitors", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar expositores.");
        }

        if (active) {
          setItems(Array.isArray(json?.items) ? json.items : []);
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
        if (String(item.status ?? "").toUpperCase() === "ACTIVE") acc.active += 1;
        else acc.other += 1;
        return acc;
      },
      { active: 0, other: 0 }
    );
  }, [items]);

  return (
    <MobileRepPageFrame
      title="Expositores"
      subtitle="Base instalada da região"
      desktopHref="/rep/exhibitors"
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
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard label="Ativos" value={String(summary.active)} />
            <MobileStatCard label="Outros" value={String(summary.other)} />
          </div>

          <Link href="/m/rep/exhibitors/new" style={{ textDecoration: "none" }}>
            <MobileCard>
              <div style={{ fontSize: 14, fontWeight: 900 }}>
                Novo expositor
              </div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Abrir cadastro de expositor no fluxo mobile
              </div>
            </MobileCard>
          </Link>

          <MobileCard>
            <MobileSectionTitle title="Lista de expositores" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum expositor encontrado.</div>
            ) : (
              items.map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.code ?? "-"} • ${item.name ?? "Expositor"}`}
                  subtitle={`${item.client?.name ?? "Sem cliente"} • Próxima visita ${formatDateBR(
                    item.nextVisitAt
                  )} • ${item.status ?? "Sem status"}`}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}