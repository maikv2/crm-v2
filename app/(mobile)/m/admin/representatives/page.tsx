"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileAdminListPage from "@/app/components/mobile/mobile-admin-list-page";
import { MobileCard } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RepresentativeItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
  region?: {
    id: string;
    name: string;
  } | null;
};

export default function MobileAdminRepresentativesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<RepresentativeItem[]>([]);
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
          router.push("/login?redirect=/m/admin/representatives");
          return;
        }

        if (authJson?.user?.role !== "ADMIN") {
          router.push("/m/admin");
          return;
        }

        const res = await fetch("/api/representatives", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar representantes.");
        }

        const reps = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        if (active) {
          setItems(reps);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar representantes.");
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
        String(item.email ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search]);

  return (
    <MobileAdminListPage
      title="Representantes"
      subtitle="Lista mobile de representantes"
      desktopHref="/representatives"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome, email ou região"
      createHref="/representatives"
      createLabel="Abrir área de representantes"
    >
      {loading ? (
        <MobileCard>Carregando representantes...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum representante encontrado.</MobileCard>
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
                    {item.name}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: colors.subtext,
                    }}
                  >
                    {item.email || "Sem e-mail"}
                  </div>
                </div>

                <span
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    background:
                      item.active === false
                        ? colors.isDark
                          ? "#2a1313"
                          : "#fee2e2"
                        : colors.isDark
                        ? "#0f2a17"
                        : "#dcfce7",
                    color:
                      item.active === false
                        ? "#ef4444"
                        : "#16a34a",
                  }}
                >
                  {item.active === false ? "Inativo" : "Ativo"}
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
                  {item.region?.name || "Sem região"}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <UserRoundCog size={14} />
                  Representante comercial
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                  gap: 8,
                }}
              >
                <Link href="/representatives">
                  <div
                    style={{
                      minHeight: 42,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      color: colors.text,
                    }}
                  >
                    <UserRoundCog size={14} />
                    Abrir
                  </div>
                </Link>

                <a href={item.phone ? `tel:${item.phone}` : "#"}>
                  <div
                    style={{
                      minHeight: 42,
                      borderRadius: 12,
                      border: `1px solid ${colors.border}`,
                      background: colors.cardBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 800,
                      color: colors.text,
                      opacity: item.phone ? 1 : 0.5,
                    }}
                  >
                    <Phone size={14} />
                    Ligar
                  </div>
                </a>
              </div>
            </div>
          </MobileCard>
        ))
      )}
    </MobileAdminListPage>
  );
}