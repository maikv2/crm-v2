"use client";

import { useEffect, useMemo, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AuthResponse = {
  user?: {
    id: string;
    regionId?: string | null;
  } | null;
};

type Point = {
  id: string;
  kind: "CLIENT" | "PROSPECT";
  name: string;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  status?: string | null;
  notes?: string | null;
  lastVisitAt?: string | null;
};

export default function MobileRepRoutesPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = (await authRes.json().catch(() => null)) as
          | AuthResponse
          | null;

        const regionId = authJson?.user?.regionId;
        const query = new URLSearchParams();

        if (regionId) query.set("regionId", regionId);

        const res = await fetch(`/api/commercial-map?${query.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar rotas.");
        }

        if (active) {
          setPoints(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar rotas."
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
    return points.reduce(
      (acc, item) => {
        if (item.kind === "CLIENT") acc.clients += 1;
        if (item.kind === "PROSPECT") acc.prospects += 1;
        return acc;
      },
      { clients: 0, prospects: 0 }
    );
  }, [points]);

  return (
    <MobileRepPageFrame
      title="Rotas"
      subtitle="Abrir navegação até clientes e prospectos da região"
      desktopHref="/rep/map"
    >
      {loading ? (
        <MobileCard>Carregando rotas...</MobileCard>
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
            <MobileStatCard label="Clientes" value={String(summary.clients)} />
            <MobileStatCard
              label="Prospectos"
              value={String(summary.prospects)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Pontos para navegação" />

            <div style={{ display: "grid", gap: 12 }}>
              {points.length === 0 ? (
                <div style={{ fontSize: 13 }}>Nenhum ponto geolocalizado.</div>
              ) : (
                points.map((item) => {
                  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
                  const viewUrl = `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`;

                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: 16,
                        padding: 14,
                        background: colors.cardBg,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: colors.text,
                          marginBottom: 6,
                        }}
                      >
                        {item.tradeName?.trim() || item.name}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: colors.subtext,
                          lineHeight: 1.5,
                          marginBottom: 12,
                        }}
                      >
                        {item.kind === "CLIENT" ? "Cliente" : "Prospecto"} •{" "}
                        {item.city ?? "Sem cidade"}
                        {item.state ? `/${item.state}` : ""}
                        {item.lastVisitAt
                          ? ` • Última visita ${formatDateBR(item.lastVisitAt)}`
                          : ""}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <a
                          href={routeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 12,
                            background: colors.primary,
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Abrir rota
                        </a>

                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            height: 38,
                            padding: "0 14px",
                            borderRadius: 12,
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Ver localização
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}