"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, MessageCircle, Phone, User2 } from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepListPage from "@/app/components/mobile/mobile-rep-list-page";
import { MobileCard, formatDateBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ClientItem = {
  id: string;
  name: string;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  lastVisitAt?: string | null;
  active?: boolean;
  regionId?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

type AuthMeResponse = {
  user?: {
    role?: string;
    regionId?: string | null;
  } | null;
};

function toWhatsapp(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export default function MobileRepClientsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadClients() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        const authJson = (await authRes.json().catch(() => null)) as
          | AuthMeResponse
          | null;

        if (authRes.status === 401) {
          router.push("/login?redirect=/m/rep/clients");
          return;
        }

        if (authJson?.user?.role !== "REPRESENTATIVE") {
          router.push("/m/rep");
          return;
        }

        const regionId = authJson?.user?.regionId ?? null;

        const res = await fetch("/api/clients", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar clientes.");
        }

        const items = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : [];

        const filteredByRegion = items.filter(
          (item: ClientItem) => !regionId || item.regionId === regionId
        );

        if (active) {
          setClients(filteredByRegion);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar clientes."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClients();

    return () => {
      active = false;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((item) => {
      if (!q) return true;

      return (
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.city ?? "").toLowerCase().includes(q) ||
        String(item.district ?? "").toLowerCase().includes(q) ||
        String(item.region?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  return (
    <MobileRepListPage
      title="Clientes"
      subtitle="Clientes da sua região"
      desktopHref="/rep/clients"
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nome, cidade, bairro ou região"
    >
      {loading ? (
        <MobileCard>Carregando clientes...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum cliente encontrado.</MobileCard>
      ) : (
        filtered.map((client) => {
          const whatsapp = toWhatsapp(client.whatsapp || client.phone);

          return (
            <MobileCard key={client.id} style={{ padding: 14 }}>
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
                      {client.name}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      {client.region?.name || "Sem região"}
                    </div>
                  </div>

                  <span
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background:
                        client.active === false
                          ? colors.isDark
                            ? "#2a1313"
                            : "#fee2e2"
                          : colors.isDark
                          ? "#0f2a17"
                          : "#dcfce7",
                      color: client.active === false ? "#ef4444" : "#16a34a",
                    }}
                  >
                    {client.active === false ? "Inativo" : "Ativo"}
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
                    {[client.city, client.district].filter(Boolean).join(" • ") ||
                      "Sem localização"}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <User2 size={14} />
                    Última visita: {formatDateBR(client.lastVisitAt)}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                    gap: 8,
                  }}
                >
                  <Link href="/m/rep/clients" style={{ textDecoration: "none" }}>
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
                      <User2 size={14} />
                      Abrir
                    </div>
                  </Link>

                  <a
                    href={client.phone ? `tel:${client.phone}` : "#"}
                    style={{
                      pointerEvents: client.phone ? "auto" : "none",
                      textDecoration: "none",
                    }}
                  >
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
                        opacity: client.phone ? 1 : 0.5,
                      }}
                    >
                      <Phone size={14} />
                      Ligar
                    </div>
                  </a>

                  <a
                    href={whatsapp ? `https://wa.me/${whatsapp}` : "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      pointerEvents: whatsapp ? "auto" : "none",
                      textDecoration: "none",
                    }}
                  >
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
                        opacity: whatsapp ? 1 : 0.5,
                      }}
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </div>
                  </a>
                </div>
              </div>
            </MobileCard>
          );
        })
      )}
    </MobileRepListPage>
  );
}