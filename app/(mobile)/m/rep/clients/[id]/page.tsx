"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Store,
  User2,
} from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ClientDetails = {
  id: string;
  name: string;
  tradeName?: string | null;
  legalName?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  cep?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  billingEmail?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  active?: boolean;
  lastVisitAt?: string | null;
  notes?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
  orders?: Array<{
    id: string;
    number?: number | null;
    totalCents?: number | null;
    issuedAt?: string | null;
    status?: string | null;
  }>;
  visits?: Array<{
    id: string;
    visitedAt?: string | null;
    notes?: string | null;
  }>;
  exhibitors?: Array<{
    id: string;
    name?: string | null;
    code?: string | null;
    status?: string | null;
    installedAt?: string | null;
  }>;
};

function toWhatsapp(phone?: string | null) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function fullAddress(client: ClientDetails | null) {
  if (!client) return "Sem endereço";
  return [
    client.street,
    client.number,
    client.complement,
    client.district,
    [client.city, client.state].filter(Boolean).join("/"),
    client.cep,
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function MobileRepClientDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          throw new Error("Cliente não informado.");
        }

        const res = await fetch(`/api/clients/${id}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar cliente.");
        }

        if (active) {
          setClient(json);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar cliente."
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
  }, [id]);

  const whatsapp = useMemo(
    () => toWhatsapp(client?.whatsapp || client?.phone),
    [client?.whatsapp, client?.phone]
  );

  const orders = client?.orders ?? [];
  const visits = client?.visits ?? [];
  const exhibitors = client?.exhibitors ?? [];

  const totalOrders = orders.length;
  const totalSpentCents = orders.reduce(
    (sum, item) => sum + Number(item.totalCents || 0),
    0
  );

  return (
    <MobileRepPageFrame
      title="Cliente"
      subtitle="Detalhes mobile do cliente"
      desktopHref={id ? `/rep/clients/${id}` : "/rep/clients"}
    >
      {loading ? (
        <MobileCard>Carregando cliente...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : !client ? (
        <MobileCard>Cliente não encontrado.</MobileCard>
      ) : (
        <>
          <MobileCard>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: colors.text,
                    lineHeight: 1.2,
                  }}
                >
                  {client.tradeName || client.name}
                </div>

                <div
                  style={{
                    marginTop: 6,
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
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: 8,
              }}
            >
              <a
                href={client.phone ? `tel:${client.phone}` : "#"}
                style={{ textDecoration: "none" }}
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
                style={{ textDecoration: "none" }}
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

              <Link
                href={id ? `/m/rep/orders?clientId=${id}` : "/m/rep/orders"}
                style={{ textDecoration: "none" }}
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
                  }}
                >
                  <Package size={14} />
                  Pedidos
                </div>
              </Link>
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Pedidos"
              value={String(totalOrders)}
              helper="Total do cliente"
            />
            <MobileStatCard
              label="Compras"
              value={formatMoneyBR(totalSpentCents)}
              helper="Soma dos pedidos"
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Informações" />

            <MobileInfoRow
              title="Razão social"
              subtitle={client.legalName || client.name || "-"}
            />

            <MobileInfoRow
              title="Documento"
              subtitle={client.cnpj || client.cpf || "-"}
            />

            <MobileInfoRow
              title="Telefone"
              subtitle={client.phone || client.whatsapp || "-"}
            />

            <MobileInfoRow
              title="Endereço"
              subtitle={fullAddress(client)}
            />

            <MobileInfoRow
              title="Última visita"
              subtitle={formatDateBR(client.lastVisitAt)}
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Expositores" />

            {exhibitors.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: colors.subtext,
                }}
              >
                Nenhum expositor vinculado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {exhibitors.map((item) => (
                  <Link
                    key={item.id}
                    href={`/m/rep/exhibitors`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: 14,
                        padding: 12,
                        background: colors.cardBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <Store size={15} color={colors.primary} />
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: colors.text,
                            }}
                          >
                            {item.name || item.code || "Expositor"}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {item.code || "Sem código"} •{" "}
                          {item.status || "Sem status"}
                        </div>
                      </div>

                      <ChevronRight size={16} color={colors.subtext} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Pedidos recentes" />

            {orders.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: colors.subtext,
                }}
              >
                Nenhum pedido encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/m/rep/orders/${order.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: 14,
                        padding: 12,
                        background: colors.cardBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: colors.text,
                          }}
                        >
                          Pedido #{order.number || order.id.slice(0, 6)}
                        </div>

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: colors.subtext,
                          }}
                        >
                          {formatDateBR(order.issuedAt)} •{" "}
                          {order.status || "Sem status"}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: colors.text,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMoneyBR(order.totalCents)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Visitas" />

            {visits.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: colors.subtext,
                }}
              >
                Nenhuma visita registrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {visits.slice(0, 5).map((visit) => (
                  <div
                    key={visit.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 14,
                      padding: 12,
                      background: colors.cardBg,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <User2 size={15} color={colors.primary} />
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: colors.text,
                        }}
                      >
                        {formatDateBR(visit.visitedAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      <MapPin size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span>{visit.notes || "Sem observações."}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}