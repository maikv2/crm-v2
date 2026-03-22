"use client";

import { useEffect, useMemo, useState } from "react";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ProspectItem = {
  id: string;
  name?: string | null;
  city?: string | null;
  district?: string | null;
  status?: string | null;
  phone?: string | null;
  contactName?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
  representative?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export default function MobileAdminProspectsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ProspectItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadItems() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/prospects", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar prospectos.");
        }

        if (active) {
          setItems(Array.isArray(json) ? json : []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar prospectos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItems();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!q) return true;

      return (
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.city ?? "").toLowerCase().includes(q) ||
        String(item.district ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q) ||
        String(item.representative?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  function statusColor(status?: string | null) {
    const value = String(status ?? "").toUpperCase();

    if (value === "CONVERTED") return "#16a34a";
    if (value === "RETURN") return "#7c3aed";
    if (value === "NO_RETURN") return "#dc2626";
    return "#b45309";
  }

  function statusBg(status?: string | null) {
    const value = String(status ?? "").toUpperCase();

    if (value === "CONVERTED") return "rgba(34,197,94,0.14)";
    if (value === "RETURN") return "rgba(124,58,237,0.14)";
    if (value === "NO_RETURN") return "rgba(239,68,68,0.14)";
    return "rgba(245,158,11,0.14)";
  }

  return (
    <MobileAdminListPage
      title="Prospectos"
      subtitle="Lista mobile de prospectos"
      desktopHref="/prospects"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome, cidade, bairro ou região"
      createHref="/m/admin/prospects/new"
      createLabel="Novo prospecto"
    >
      {loading ? (
        <MobileCard>Carregando prospectos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum prospecto encontrado.</MobileCard>
      ) : (
        filtered.map((item) => (
          <MobileCard key={item.id} style={{ padding: 14 }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: colors.text,
                    }}
                  >
                    {item.name || "Prospecto"}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: colors.subtext,
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
                    background: statusBg(item.status),
                    color: statusColor(item.status),
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.status || "Pendente"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 6,
                  fontSize: 12,
                  color: colors.subtext,
                }}
              >
                <div>
                  {[item.city, item.district].filter(Boolean).join(" • ") ||
                    "Sem localização"}
                </div>

                <div>
                  {item.contactName
                    ? `Contato: ${item.contactName}`
                    : "Contato não informado"}
                </div>

                <div>
                  {item.phone ? `Telefone: ${item.phone}` : "Telefone não informado"}
                </div>

                <div>
                  {item.representative?.name
                    ? `Representante: ${item.representative.name}`
                    : "Sem representante"}
                </div>
              </div>
            </div>
          </MobileCard>
        ))
      )}
    </MobileAdminListPage>
  );
}