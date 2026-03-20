"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, MapPin, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
import { MobileCard, formatDateBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ExhibitorItem = {
  id: string;
  code?: string | null;
  name?: string | null;
  model?: string | null;
  type?: string | null;
  status?: string | null;
  installedAt?: string | null;
  nextVisitAt?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

export default function MobileAdminExhibitorsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ExhibitorItem[]>([]);
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
          router.push("/login?redirect=/m/admin/exhibitors");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/exhibitors", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar expositores.");
        }

        const exhibitors = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setItems(exhibitors);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar expositores.");
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
        String(item.code ?? "").toLowerCase().includes(q) ||
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.client?.name ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  return (
    <MobileAdminListPage
      title="Expositores"
      subtitle="Lista mobile de expositores"
      desktopHref="/exhibitors"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por código, nome, cliente ou região"
      createHref="/m/admin/exhibitors/new"
      createLabel="Novo expositor"
    >
      {loading ? (
        <MobileCard>Carregando expositores...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum expositor encontrado.</MobileCard>
      ) : (
        filtered.map((item) => (
          <Link key={item.id} href="/exhibitors">
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
                      {item.name || item.code || "Expositor"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      {item.client?.name || "Sem cliente"}
                    </div>
                  </div>

                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: colors.isDark ? "#111827" : "#f8fafc",
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {item.status || "Sem status"}
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
                    <Boxes size={14} />
                    {item.model || "Sem modelo"} • {item.type || "Sem tipo"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={14} />
                    {item.region?.name || "Sem região"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Wrench size={14} />
                    Instalado em {formatDateBR(item.installedAt)} • próxima visita {formatDateBR(item.nextVisitAt)}
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