"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CommercialMapPoint } from "./commercial-map-view";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

const CommercialMapView = dynamic(() => import("./commercial-map-view"), {
  ssr: false,
});

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "REPRESENTATIVE" | "INVESTOR" | string;
  regionId?: string | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40, padding: "0 14px", borderRadius: 12,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        background: hover ? "#2563eb" : theme.isDark ? "#0f172a" : theme.cardBg,
        color: hover ? "#ffffff" : theme.isDark ? "#ffffff" : theme.text,
        fontWeight: 800, fontSize: 13, cursor: "pointer",
        whiteSpace: "nowrap", transition: "all 0.15s ease",
        boxShadow: theme.isDark ? "0 4px 14px rgba(2,6,23,0.28)" : "none",
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  return (
    <div style={{
      background: theme.isDark ? "#0f172a" : theme.cardBg,
      border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
      borderRadius: 18, padding: 22,
      boxShadow: theme.isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: theme.text }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatCard({ title, value, theme }: { title: string; value: number; theme: ThemeShape }) {
  return (
    <div style={{
      background: theme.isDark ? "#0b1324" : "#f8fafc",
      border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
      borderRadius: 16, padding: 18,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.isDark ? "#94a3b8" : "#64748b", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: theme.text }}>{value}</div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
  theme,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 40, borderRadius: 10,
        background: theme.isDark ? "#0f172a" : "#ffffff",
        color: theme.text,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        padding: "0 10px", outline: "none",
      }}
    >
      {children}
    </select>
  );
}

export default function CommercialMapScreen({ mode }: { mode: "admin" | "representative" }) {
  const { theme: modeTheme } = useTheme();
  const theme = getThemeColors(modeTheme);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [user, setUser] = useState<LoggedUser | null>(null);
  const [points, setPoints] = useState<CommercialMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityFilter, setCityFilter] = useState("ALL");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [kindFilter, setKindFilter] = useState("ALL");

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let currentUser: LoggedUser | null = null;

        if (mode === "representative") {
          const authRes = await fetch("/api/auth/me", { cache: "no-store" });
          const authJson = await authRes.json();
          currentUser = authJson?.user ?? null;

          if (!currentUser?.regionId) throw new Error("Representante sem região vinculada.");

          if (active) {
            setUser(currentUser);
            setRegionFilter(currentUser.regionId);
          }
        }

        const query = new URLSearchParams();
        if (mode === "representative" && currentUser?.regionId) {
          query.set("regionId", currentUser.regionId);
        }

        const res = await fetch(
          `/api/commercial-map${query.toString() ? `?${query.toString()}` : ""}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao carregar mapa comercial");

        if (active) setPoints(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error(err);
        if (active) { setPoints([]); setError(err?.message || "Erro ao carregar mapa comercial"); }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [mode]);

  const cities = useMemo(() => {
    return Array.from(new Set(
      points.map((p) => p.city?.trim()).filter((v): v is string => Boolean(v))
    )).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [points]);

  const regions = useMemo(() => {
    return Array.from(new Set(
      points
        .map((p) => p.region?.id && p.region?.name ? `${p.region.id}|||${p.region.name}` : null)
        .filter((v): v is string => Boolean(v))
    ))
      .map((item) => { const [id, name] = item.split("|||"); return { id, name }; })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [points]);

  const representativeRegionName = useMemo(() => {
    if (mode !== "representative" || !user?.regionId) return null;
    return regions.find((r) => r.id === user.regionId)?.name ?? null;
  }, [mode, user, regions]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      // Prospectos convertidos não aparecem no mapa
      if (point.kind === "PROSPECT" && point.status === "CONVERTED") return false;

      const cityOk = cityFilter === "ALL" || (point.city || "") === cityFilter;
      const pointRegionId = point.region?.id || "";
      const regionOk = mode === "representative"
        ? pointRegionId === (user?.regionId || "")
        : regionFilter === "ALL" || pointRegionId === regionFilter;
      const kindOk = kindFilter === "ALL" || point.kind === kindFilter;

      return cityOk && regionOk && kindOk;
    });
  }, [points, cityFilter, regionFilter, kindFilter, mode, user]);

  const counters = useMemo(() => ({
    total: filteredPoints.length,
    clients: filteredPoints.filter((p) => p.kind === "CLIENT").length,
    prospects: filteredPoints.filter((p) => p.kind === "PROSPECT").length,
  }), [filteredPoints]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: pageBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: theme.text, fontWeight: 700,
      }}>
        Carregando mapa comercial...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: pageBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#ef4444", fontWeight: 700,
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      color: theme.text, background: pageBg,
      minHeight: "100vh", width: "100%", padding: 24,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, marginBottom: 22, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 10 }}>
            🗺 / Mapa Comercial
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
            {mode === "representative" ? "Mapa Comercial da Região" : "Mapa Comercial"}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
            {mode === "representative"
              ? `Visualize clientes e prospectos da sua região${representativeRegionName ? ` • ${representativeRegionName}` : ""}.`
              : "Visualize clientes e prospectos em um único painel."}
          </div>
        </div>

        <ActionButton
          label="Limpar filtros"
          theme={theme}
          onClick={() => {
            setCityFilter("ALL");
            setKindFilter("ALL");
            setRegionFilter(mode === "representative" ? user?.regionId || "ALL" : "ALL");
          }}
        />
      </div>

      {/* Contadores — sem card "Voltar" */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        <StatCard title="Pontos no mapa" value={counters.total} theme={theme} />
        <StatCard title="Clientes" value={counters.clients} theme={theme} />
        <StatCard title="Prospectos" value={counters.prospects} theme={theme} />
      </div>

      {/* Filtros */}
      <div style={{ marginBottom: 24 }}>
        <Block title="Filtros" theme={theme}>
          <div style={{
            display: "grid",
            gridTemplateColumns: mode === "representative"
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}>
            <FilterSelect value={cityFilter} onChange={setCityFilter} theme={theme}>
              <option value="ALL">Todas as cidades</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </FilterSelect>

            {mode === "admin" ? (
              <FilterSelect value={regionFilter} onChange={setRegionFilter} theme={theme}>
                <option value="ALL">Todas as regiões</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </FilterSelect>
            ) : (
              <div style={{
                height: 40, borderRadius: 10,
                background: theme.isDark ? "#0f172a" : "#ffffff",
                color: theme.text,
                border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
                padding: "0 12px", display: "flex", alignItems: "center", fontWeight: 700,
              }}>
                Região: {representativeRegionName || "Minha região"}
              </div>
            )}

            <FilterSelect value={kindFilter} onChange={setKindFilter} theme={theme}>
              <option value="ALL">Todos os tipos</option>
              <option value="CLIENT">Clientes</option>
              <option value="PROSPECT">Prospectos</option>
            </FilterSelect>
          </div>
        </Block>
      </div>

      {/* Mapa */}
      <Block
        title="Mapa"
        theme={theme}
        right={
          <div style={{ fontSize: 13, color: muted, fontWeight: 700 }}>
            {filteredPoints.length} ponto(s)
          </div>
        }
      >
        <CommercialMapView points={filteredPoints} themeMode={modeTheme} />
      </Block>
    </div>
  );
}