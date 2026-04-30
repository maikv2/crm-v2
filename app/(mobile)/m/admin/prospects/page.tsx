"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Region = {
  id: string;
  name: string;
};

type ProspectItem = {
  id: string;
  name?: string | null;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  status?: string | null;
  phone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  region?: { id: string; name: string } | null;
  representative?: { id: string; name: string; email: string } | null;
};

function getStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "RETURN": return "Voltar";
    case "NO_RETURN": return "Não voltar";
    case "CONVERTED": return "Convertido";
    default: return "Pendente";
  }
}

function getStatusColors(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "RETURN": return { bg: "rgba(124,58,237,0.14)", color: "#7c3aed" };
    case "NO_RETURN": return { bg: "rgba(239,68,68,0.14)", color: "#dc2626" };
    case "CONVERTED": return { bg: "rgba(34,197,94,0.14)", color: "#16a34a" };
    default: return { bg: "rgba(245,158,11,0.14)", color: "#b45309" };
  }
}

export default function MobileAdminProspectsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [items, setItems] = useState<ProspectItem[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [prospectsRes, regionsRes] = await Promise.all([
        fetch("/api/prospects", { cache: "no-store" }),
        fetch("/api/regions", { cache: "no-store" }),
      ]);

      const prospectsJson = await prospectsRes.json().catch(() => null);
      const regionsJson = await regionsRes.json().catch(() => null);

      if (!prospectsRes.ok) throw new Error(prospectsJson?.error || "Erro ao carregar prospectos.");

      setItems(Array.isArray(prospectsJson) ? prospectsJson : []);

      const regionList = Array.isArray(regionsJson)
        ? regionsJson
        : Array.isArray(regionsJson?.items)
        ? regionsJson.items
        : [];
      setRegions(regionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar prospectos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadData().finally(() => { if (!active) return; });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const regionOk = regionFilter === "ALL" || item.region?.id === regionFilter;
      if (!regionOk) return false;
      if (!q) return true;
      return [
        item.name, item.tradeName, item.city, item.district,
        item.region?.name, item.representative?.name, item.contactName, item.phone,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [items, search, regionFilter]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar status");
    }
  }

  const btnStyle: React.CSSProperties = {
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const btnPrimaryStyle: React.CSSProperties = {
    ...btnStyle,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
  };

  return (
    <MobileAdminListPage
      title="Prospectos"
      subtitle="Lista mobile de prospectos"
      desktopHref="/prospects"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome, cidade ou região"
      createHref="/m/admin/prospects/new"
      createLabel="Novo prospecto"
    >
      {/* Filtro de região */}
      <MobileCard>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.inputBg,
            color: colors.text,
            padding: "0 14px",
            outline: "none",
            fontSize: 14,
          }}
        >
          <option value="ALL">Todas as regiões</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </MobileCard>

      {/* Lista */}
      {loading ? (
        <MobileCard>Carregando prospectos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum prospecto encontrado.</MobileCard>
      ) : (
        filtered.map((item) => {
          const statusColors = getStatusColors(item.status);
          const displayName = item.tradeName?.trim() || item.name || "Prospecto";

          return (
            <MobileCard key={item.id} style={{ padding: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                {/* Nome e status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>
                      {displayName}
                    </div>
                    {item.tradeName && item.name !== item.tradeName ? (
                      <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                        {item.name}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                      {item.region?.name || "Sem região"}
                    </div>
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: statusColors.bg,
                      color: statusColors.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                {/* Detalhes */}
                <div style={{ display: "grid", gap: 4, fontSize: 12, color: colors.subtext }}>
                  {item.city ? (
                    <div>{item.city}{item.state ? `/${item.state}` : ""}{item.district ? ` • ${item.district}` : ""}</div>
                  ) : null}
                  {item.contactName ? <div>Contato: {item.contactName}</div> : null}
                  {item.phone ? <div>Telefone: {item.phone}</div> : null}
                  {item.representative?.name ? (
                    <div>Representante: {item.representative.name}</div>
                  ) : null}
                  {item.notes ? <div>Obs: {item.notes}</div> : null}
                </div>

                {/* Botões */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/m/admin/prospects/${item.id}/edit`)}
                    style={btnStyle}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Converter "${displayName}" em cliente?`)) {
                        updateStatus(item.id, "CONVERTED");
                      }
                    }}
                    style={btnPrimaryStyle}
                  >
                    Tornar cliente
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/m/admin/exhibitors/new?prospectId=${item.id}&name=${encodeURIComponent(displayName)}`
                      )
                    }
                    style={btnStyle}
                  >
                    Levar expositor
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "RETURN")}
                    style={btnStyle}
                  >
                    Marcar voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "NO_RETURN")}
                    style={btnStyle}
                  >
                    Marcar não voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "PENDING")}
                    style={btnStyle}
                  >
                    Voltar pendente
                  </button>
                </div>
              </div>
            </MobileCard>
          );
        })
      )}
    </MobileAdminListPage>
  );
}