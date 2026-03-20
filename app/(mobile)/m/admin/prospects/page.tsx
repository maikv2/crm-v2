"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Target, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
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
  region?: {
    id: string;
    name: string;
  } | null;
};

export default function MobileAdminProspectsPage() {
  const router = useRouter();
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

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = await authRes.json().catch(() => null);

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/admin/prospects");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/prospects", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar prospectos.");
        }

        const prospects = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setItems(prospects);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar prospectos.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItems();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!q) return true;

      return (
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.city ?? "").toLowerCase().includes(q) ||
        String(item.district ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  return (
    <MobileAdminListPage
      title="Prospectos"
      subtitle="Lista mobile de prospectos"
      desktopHref="/prospects"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome, cidade, bairro ou região"
      createHref="/prospects"
      createLabel="Abrir área de prospectos"
    >
      {loading ? (
        <MobileCard>Carregando prospectos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum prospecto encontrado.</MobileCard>
      ) : (
        filtered.map((item) => (
          <Link key={item.id} href="/prospects">
            <MobileCard style={{ padding: 14 }}>
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
                      background: colors.isDark ? "#111f39" : "#e8f0ff",
                      color: colors.primary,
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} />
                    {[item.city, item.district].filter(Boolean).join(" • ") || "Sem localização"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Target size={14} />
                    Oportunidade em acompanhamento
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <UserPlus size={14} />
                    Toque para abrir a área completa
                  </div>
                </div>
              </div>
            </MobileCard>
          </Link>
        ))
      )}
    </MobileAdminListPage>
  );
}