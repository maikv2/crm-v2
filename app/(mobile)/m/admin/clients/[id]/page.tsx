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
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
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

export default function MobileAdminClientDetailsPage() {
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
    <MobilePageFrame
      title="Cliente"
      subtitle="Detalhes mobile do cliente"
      desktopHref={id ? `/clients/${id}` : "/clients"}
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
                href={id ? `/m/admin/clients/${id}/map` : "/m/admin/clients"}
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
                  <MapPin size={14} />
                  Mapa
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
            <MobileStatCard label="Pedidos" value={String(totalOrders)} />
            <MobileStatCard
              label="Faturado"
              value={formatMoneyBR(totalSpentCents)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Dados principais" />
            <div style={{ display: "grid", gap: 8 }}>
              <MobileInfoRow
                title="Nome"
                subtitle={client.name || "-"}
                right={client.tradeName || "-"}
              />
              <MobileInfoRow
                title="Documento"
                subtitle={client.cnpj || client.cpf || "-"}
                right={client.email || "-"}
              />
              <MobileInfoRow
                title="Fone"
                subtitle={client.phone || "-"}
                right={client.whatsapp || "-"}
              />
              <MobileInfoRow
                title="Última visita"
                subtitle={formatDateBR(client.lastVisitAt)}
                right={client.billingEmail || "-"}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Endereço" />
            <div
              style={{
                display: "grid",
                gap: 8,
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              <div>{fullAddress(client)}</div>
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Pedidos recentes" />
            {orders.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum pedido encontrado.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {orders.slice(0, 5).map((order) => (
                  <MobileInfoRow
                    key={order.id}
                    title={`Pedido #${order.number ?? "-"}`}
                    subtitle={formatDateBR(order.issuedAt)}
                    right={formatMoneyBR(order.totalCents || 0)}
                  />
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Expositores" />
            {exhibitors.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhum expositor vinculado.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {exhibitors.slice(0, 5).map((item) => (
                  <MobileInfoRow
                    key={item.id}
                    title={item.name || item.code || "Expositor"}
                    subtitle={item.status || "-"}
                    right={formatDateBR(item.installedAt)}
                  />
                ))}
              </div>
            )}
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Visitas recentes" />
            {visits.length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma visita registrada.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {visits.slice(0, 5).map((visit) => (
                  <MobileInfoRow
                    key={visit.id}
                    title="Visita"
                    subtitle={visit.notes || "Sem observações"}
                    right={formatDateBR(visit.visitedAt)}
                  />
                ))}
              </div>
            )}
          </MobileCard>

          {id ? (
            <Link
              href={`/clients/${id}`}
              style={{ textDecoration: "none" }}
            >
              <MobileCard>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: colors.text,
                      }}
                    >
                      Abrir versão desktop
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                      }}
                    >
                      Ver tela completa do cliente no CRM
                    </div>
                  </div>

                  <ChevronRight size={16} color={colors.subtext} />
                </div>
              </MobileCard>
            </Link>
          ) : null}
        </>
      )}
    </MobilePageFrame>
  );
}