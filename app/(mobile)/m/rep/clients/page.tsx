"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  User2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import MobileAppear from "@/app/components/mobile/mobile-appear";
import MobileSkeletonCard from "@/app/components/mobile/mobile-skeleton-card";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
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

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.active === false) acc.inactive += 1;
        else acc.active += 1;
        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
      }
    );
  }, [filtered]);

  return (
    <MobileRepPageFrame
      title="Clientes"
      subtitle="Clientes da sua região"
      desktopHref="/rep/clients"
    >
      <MobileAppear>
        <MobileCard>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade, bairro ou região"
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
          />
        </MobileCard>
      </MobileAppear>

      <MobileAppear delay={50}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <MobileStatCard
            label="Clientes visíveis"
            value={String(summary.total)}
            helper="Resultado do filtro atual"
          />
          <MobileStatCard
            label="Ativos"
            value={String(summary.active)}
            helper={`${summary.inactive} inativos`}
          />
        </div>
      </MobileAppear>

      <MobileAppear delay={90}>
        <MobileCard
          style={{
            background: colors.isDark
              ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
              : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
          }}
        >
          <MobileSectionTitle title="Visão rápida da região" />
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                background: colors.isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                border: `1px solid ${
                  colors.isDark ? "rgba(255,255,255,0.08)" : "#bfdbfe"
                }`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  background: colors.isDark ? "#111f39" : "#e8f0ff",
                  color: colors.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={18} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.subtext,
                    marginBottom: 2,
                  }}
                >
                  Operação comercial
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: colors.text,
                    lineHeight: 1.35,
                  }}
                >
                  Consulta rápida com ligação e WhatsApp direto na base da sua região
                </div>
              </div>
            </div>
          </div>
        </MobileCard>
      </MobileAppear>

      {loading ? (
        <MobileAppear delay={120}>
          <div style={{ display: "grid", gap: 12 }}>
            <MobileSkeletonCard />
            <MobileSkeletonCard />
            <MobileSkeletonCard />
          </div>
        </MobileAppear>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum cliente encontrado.</MobileCard>
      ) : (
        filtered.map((client, index) => {
          const whatsapp = toWhatsapp(client.whatsapp || client.phone);

          return (
            <MobileAppear key={client.id} delay={Math.min(index * 35, 180)}>
              <MobileCard style={{ padding: 14 }}>
                <div style={{ display: "grid", gap: 12 }}>
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
                          fontSize: 16,
                          fontWeight: 900,
                          color: colors.text,
                          lineHeight: 1.2,
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
                      gap: 8,
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
                        <ChevronRight size={14} />
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
                        Whats
                      </div>
                    </a>
                  </div>
                </div>
              </MobileCard>
            </MobileAppear>
          );
        })
      )}
    </MobileRepPageFrame>
  );
}