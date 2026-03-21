"use client";

import { useEffect, useMemo, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";

type AgendaExhibitorItem = {
  id: string;
  name?: string | null;
  code?: string | null;
  nextVisitAt?: string | null;
  client?: {
    id: string;
    name?: string | null;
    city?: string | null;
    phone?: string | null;
  } | null;
};

type AgendaVisitedItem = {
  id: string;
  visitedAt?: string | null;
  notes?: string | null;
  client?: {
    id: string;
    name?: string | null;
  } | null;
  exhibitor?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
};

type AgendaResponse = {
  atrasados?: AgendaExhibitorItem[];
  hoje?: AgendaExhibitorItem[];
  proximos?: AgendaExhibitorItem[];
  visitadosHoje?: AgendaVisitedItem[];
};

type TabKey = "hoje" | "atrasados" | "proximos" | "visitados";

export default function RepVisitPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgendaResponse | null>(null);
  const [tab, setTab] = useState<TabKey>("hoje");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/agenda", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar agenda.");
        }

        if (active) setData(json);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar agenda.");
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

  const counts = useMemo(
    () => ({
      hoje: data?.hoje?.length ?? 0,
      atrasados: data?.atrasados?.length ?? 0,
      proximos: data?.proximos?.length ?? 0,
      visitados: data?.visitadosHoje?.length ?? 0,
    }),
    [data]
  );

  const items = useMemo(() => {
    if (tab === "hoje") return data?.hoje ?? [];
    if (tab === "atrasados") return data?.atrasados ?? [];
    if (tab === "proximos") return data?.proximos ?? [];
    return data?.visitadosHoje ?? [];
  }, [data, tab]);

  function TabButton({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          height: 38,
          padding: "0 12px",
          borderRadius: 12,
          border: active ? "1px solid #2563eb" : "1px solid #dbe3ef",
          background: active ? "#2563eb" : "transparent",
          color: active ? "#fff" : "inherit",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <MobileRepPageFrame
      title="Agenda"
      subtitle="Rotina comercial da região"
      desktopHref="/rep/agenda"
    >
      {loading ? (
        <MobileCard>Carregando agenda...</MobileCard>
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
            <MobileStatCard label="Hoje" value={String(counts.hoje)} />
            <MobileStatCard label="Atrasados" value={String(counts.atrasados)} />
            <MobileStatCard label="Próximos" value={String(counts.proximos)} />
            <MobileStatCard label="Visitados" value={String(counts.visitados)} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Filtrar agenda" />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <TabButton
                label={`Hoje (${counts.hoje})`}
                active={tab === "hoje"}
                onClick={() => setTab("hoje")}
              />
              <TabButton
                label={`Atrasados (${counts.atrasados})`}
                active={tab === "atrasados"}
                onClick={() => setTab("atrasados")}
              />
              <TabButton
                label={`Próximos (${counts.proximos})`}
                active={tab === "proximos"}
                onClick={() => setTab("proximos")}
              />
              <TabButton
                label={`Visitados (${counts.visitados})`}
                active={tab === "visitados"}
                onClick={() => setTab("visitados")}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Lista" />

            {items.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum item nessa aba.</div>
            ) : tab === "visitados" ? (
              (items as AgendaVisitedItem[]).map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={item.client?.name ?? "Cliente"}
                  subtitle={`Visitado em ${formatDateBR(item.visitedAt)}${
                    item.exhibitor?.code ? ` • ${item.exhibitor.code}` : ""
                  }`}
                  href={item.client?.id ? `/rep/clients/${item.client.id}` : undefined}
                />
              ))
            ) : (
              (items as AgendaExhibitorItem[]).map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={item.client?.name ?? item.name ?? "Expositor"}
                  subtitle={`${item.client?.city ?? "Sem cidade"} • Próxima visita ${formatDateBR(
                    item.nextVisitAt
                  )}${item.code ? ` • ${item.code}` : ""}`}
                  href={item.client?.id ? `/rep/clients/${item.client.id}` : undefined}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}