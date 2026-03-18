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

  const buttonBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const buttonBorder = theme.isDark ? "#1e293b" : theme.border;
  const buttonText = theme.isDark ? "#ffffff" : theme.text;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: `1px solid ${buttonBorder}`,
        background: hover ? "#2563eb" : buttonBg,
        color: hover ? "#ffffff" : buttonText,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
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
  const blockBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const blockBorder = theme.isDark ? "#1e293b" : theme.border;

  return (
    <div
      style={{
        background: blockBg,
        border: `1px solid ${blockBorder}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  theme,
}: {
  title: string;
  value: number;
  theme: ThemeShape;
}) {
  const cardBg = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: muted,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: theme.text,
        }}
      >
        {value}
      </div>
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
        height: 40,
        borderRadius: 10,
        background: theme.isDark ? "#0f172a" : "#ffffff",
        color: theme.text,
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        padding: "0 10px",
        outline: "none",
      }}
    >
      {children}
    </select>
  );
}

export default function CommercialMapScreen({
  mode,
}: {
  mode: "admin" | "representative";
}) {
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
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        let currentUser: LoggedUser | null = null;

        if (mode === "representative") {
          const authRes = await fetch("/api/auth/me", {
            cache: "no-store",
          });

          const authJson = await authRes.json();
          currentUser = authJson?.user ?? null;

          if (!currentUser?.regionId) {
            throw new Error("Representante sem região vinculada.");
          }

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
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar mapa comercial");
        }

        if (active) {
          setPoints(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        console.error("Erro ao carregar mapa comercial:", err);

        if (active) {
          setPoints([]);
          setError(err?.message || "Erro ao carregar mapa comercial");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [mode]);

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        points
          .map((point) => point.city?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [points]);

  const regions = useMemo(() => {
    return Array.from(
      new Set(
        points
          .map((point) => point.region?.id && point.region?.name
            ? `${point.region.id}|||${point.region.name}`
            : null)
          .filter((value): value is string => Boolean(value))
      )
    )
      .map((item) => {
        const [id, name] = item.split("|||");
        return { id, name };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [points]);

  const statuses = useMemo(() => {
    return Array.from(
      new Set(
        points
          .map((point) => point.status?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [points]);

  const representativeRegionName = useMemo(() => {
    if (mode !== "representative" || !user?.regionId) return null;

    const found = regions.find((region) => region.id === user.regionId);
    return found?.name ?? null;
  }, [mode, user, regions]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      const cityOk = cityFilter === "ALL" || (point.city || "") === cityFilter;

      const pointRegionId = point.region?.id || "";
      const regionOk =
        mode === "representative"
          ? pointRegionId === (user?.regionId || "")
          : regionFilter === "ALL" || pointRegionId === regionFilter;

      const kindOk = kindFilter === "ALL" || point.kind === kindFilter;
      const statusOk = statusFilter === "ALL" || point.status === statusFilter;

      return cityOk && regionOk && kindOk && statusOk;
    });
  }, [points, cityFilter, regionFilter, kindFilter, statusFilter, mode, user]);

  const counters = useMemo(() => {
    return {
      total: filteredPoints.length,
      clients: filteredPoints.filter((point) => point.kind === "CLIENT").length,
      prospects: filteredPoints.filter((point) => point.kind === "PROSPECT")
        .length,
      returnCount: filteredPoints.filter((point) => point.status === "RETURN")
        .length,
    };
  }, [filteredPoints]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
          fontWeight: 700,
        }}
      >
        Carregando mapa comercial...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          fontWeight: 700,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: muted,
              marginBottom: 10,
            }}
          >
            🗺 / Mapa Comercial
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {mode === "representative"
              ? "Mapa Comercial da Região"
              : "Mapa Comercial"}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            {mode === "representative"
              ? `Visualize clientes e prospectos da sua região${
                  representativeRegionName ? ` • ${representativeRegionName}` : ""
                }.`
              : "Visualize clientes e prospectos em um único painel."}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Limpar filtros"
            theme={theme}
            onClick={() => {
              setCityFilter("ALL");
              setKindFilter("ALL");
              setStatusFilter("ALL");
              setRegionFilter(
                mode === "representative" ? user?.regionId || "ALL" : "ALL"
              );
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard title="Pontos no mapa" value={counters.total} theme={theme} />
        <StatCard title="Clientes" value={counters.clients} theme={theme} />
        <StatCard title="Prospectos" value={counters.prospects} theme={theme} />
        <StatCard title="Voltar" value={counters.returnCount} theme={theme} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Block title="Filtros" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                mode === "representative"
                  ? "repeat(3, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <FilterSelect
              value={cityFilter}
              onChange={setCityFilter}
              theme={theme}
            >
              <option value="ALL">Todas as cidades</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </FilterSelect>

            {mode === "admin" ? (
              <FilterSelect
                value={regionFilter}
                onChange={setRegionFilter}
                theme={theme}
              >
                <option value="ALL">Todas as regiões</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </FilterSelect>
            ) : (
              <div
                style={{
                  height: 40,
                  borderRadius: 10,
                  background: theme.isDark ? "#0f172a" : "#ffffff",
                  color: theme.text,
                  border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
                  padding: "0 12px",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 700,
                }}
              >
                Região: {representativeRegionName || "Minha região"}
              </div>
            )}

            <FilterSelect
              value={kindFilter}
              onChange={setKindFilter}
              theme={theme}
            >
              <option value="ALL">Todos os tipos</option>
              <option value="CLIENT">Clientes</option>
              <option value="PROSPECT">Prospectos</option>
            </FilterSelect>

            <FilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              theme={theme}
            >
              <option value="ALL">Todos os status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </FilterSelect>
          </div>
        </Block>
      </div>

      <Block
        title="Mapa"
        theme={theme}
        right={
          <div
            style={{
              fontSize: 13,
              color: muted,
              fontWeight: 700,
            }}
          >
            {filteredPoints.length} ponto(s)
          </div>
        }
      >
        <CommercialMapView points={filteredPoints} themeMode={modeTheme} />
      </Block>
    </div>
  );
}