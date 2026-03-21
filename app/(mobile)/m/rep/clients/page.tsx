"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  MapPin,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Target,
  Users,
} from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ClientItem = {
  id: string;
  name?: string | null;
  fantasyName?: string | null;
  city?: string | null;
  phone?: string | null;
  neighborhood?: string | null;
  active?: boolean | null;
};

type ClientsResponse =
  | ClientItem[]
  | {
      clients?: ClientItem[];
      items?: ClientItem[];
    };

function resolveClients(data: ClientsResponse | null): ClientItem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.clients)) return data.clients;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function QuickAction({
  href,
  title,
  icon,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          minWidth: 108,
          padding: "12px 14px",
          borderRadius: 14,
          border: `1px solid ${colors.border}`,
          background: colors.cardBg,
          color: colors.text,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: colors.isDark
            ? "0 8px 24px rgba(2,6,23,0.24)"
            : "0 8px 20px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: colors.isDark ? "#111827" : "#e8f0ff",
            color: colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </div>
    </Link>
  );
}

export default function MobileRepClientsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/clients", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar clientes.");
        }

        if (active) {
          setClients(resolveClients(json));
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

    load();

    return () => {
      active = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;

    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.fantasyName,
        client.city,
        client.phone,
        client.neighborhood,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [clients, query]);

  return (
    <MobileRepPageFrame
      title="Clientes"
      subtitle="Carteira de clientes da região"
      desktopHref="/rep/clients"
    >
      <MobileCard style={{ padding: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: "12px 14px",
            background: colors.cardBg,
          }}
        >
          <Search size={16} color={colors.subtext} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, cidade ou telefone"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.text,
              width: "100%",
              fontSize: 14,
            }}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <MobileSectionTitle title="Ações rápidas" />

        <div
          style={{
            display: "flex",
            gap: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <QuickAction
            href="/clients/new"
            title="Novo cliente"
            icon={<Plus size={18} />}
          />
          <QuickAction
            href="/m/rep/orders/new"
            title="Novo pedido"
            icon={<ShoppingBag size={18} />}
          />
          <QuickAction
            href="/rep/exhibitors"
            title="Expositores"
            icon={<Store size={18} />}
          />
          <QuickAction
            href="/rep/prospects"
            title="Prospectos"
            icon={<Target size={18} />}
          />
        </div>
      </MobileCard>

      <MobileCard>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <MobileSectionTitle title="Resumo" />
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: colors.subtext,
              whiteSpace: "nowrap",
            }}
          >
            {filteredClients.length} cliente
            {filteredClients.length === 1 ? "" : "s"}
          </div>
        </div>

        {loading ? (
          <div
            style={{
              fontSize: 14,
              color: colors.subtext,
            }}
          >
            Carregando clientes...
          </div>
        ) : error ? (
          <div
            style={{
              fontSize: 14,
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        ) : filteredClients.length === 0 ? (
          <div
            style={{
              fontSize: 14,
              color: colors.subtext,
            }}
          >
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredClients.map((client) => {
              const displayName =
                client.fantasyName?.trim() || client.name?.trim() || "Cliente";

              return (
                <Link
                  key={client.id}
                  href={`/rep/clients/${client.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 16,
                      padding: 14,
                      background: colors.cardBg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 12,
                              background: colors.isDark ? "#111827" : "#e8f0ff",
                              color: colors.primary,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Users size={16} />
                          </div>

                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 900,
                              color: colors.text,
                              lineHeight: 1.2,
                            }}
                          >
                            {displayName}
                          </div>
                        </div>

                        {client.name &&
                        client.fantasyName &&
                        client.name !== client.fantasyName ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: colors.subtext,
                              marginBottom: 8,
                            }}
                          >
                            Razão social: {client.name}
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "grid",
                            gap: 6,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {client.city ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <MapPin size={13} />
                              <span>
                                {client.city}
                                {client.neighborhood
                                  ? ` • ${client.neighborhood}`
                                  : ""}
                              </span>
                            </div>
                          ) : null}

                          {client.phone ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Phone size={13} />
                              <span>{client.phone}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <ChevronRight size={16} color={colors.subtext} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </MobileCard>
    </MobileRepPageFrame>
  );
}