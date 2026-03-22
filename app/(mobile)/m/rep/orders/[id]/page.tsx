"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatDateTimeBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type OrderItem = {
  id: string;
  qty: number;
  unitCents: number;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
  } | null;
};

type OrderDetail = {
  id: string;
  number?: number | null;
  status?: string | null;
  type?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  notes?: string | null;
  subtotalCents?: number | null;
  discountCents?: number | null;
  totalCents?: number | null;
  issuedAt?: string | null;
  createdAt?: string | null;
  client?: {
    id: string;
    name?: string | null;
    legalName?: string | null;
    street?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
  } | null;
  region?: {
    id: string;
    name?: string | null;
  } | null;
  seller?: {
    id: string;
    name?: string | null;
  } | null;
  items?: OrderItem[];
};

function getStatusLabel(value?: string | null) {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    DRAFT: "Rascunho",
  };
  return map[value || ""] || value || "-";
}

function getPaymentStatusLabel(value?: string | null) {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    PAID: "Pago",
    PARTIAL: "Parcial",
    CANCELLED: "Cancelado",
    OVERDUE: "Vencido",
  };
  return map[value || ""] || value || "-";
}

function getPaymentMethodLabel(value?: string | null) {
  const map: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "Pix",
    BOLETO: "Boleto",
    CARD_DEBIT: "Cartão débito",
    CARD_CREDIT: "Cartão crédito",
  };
  return map[value || ""] || value || "-";
}

function buildAddress(order?: OrderDetail | null) {
  const client = order?.client;
  if (!client) return "-";

  const parts = [
    client.street,
    client.number,
    client.district,
    client.city,
    client.state,
    client.cep ? `CEP: ${client.cep}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" - ") : "-";
}

export default function MobileRepOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const authRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (authRes.status === 401) {
          router.push(`/login?redirect=/m/rep/orders/${params.id}`);
          return;
        }

        const res = await fetch(`/api/orders/${params.id}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar pedido.");
        }

        if (active) {
          setOrder(json);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar pedido."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (params?.id) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [params?.id, router]);

  const summary = useMemo(() => {
    const items = order?.items ?? [];
    return {
      skuCount: items.length,
      units: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    };
  }, [order]);

  return (
    <MobileRepPageFrame
      title="Detalhe do pedido"
      subtitle="Informações completas do pedido"
      desktopHref={order?.id ? `/orders/${order.id}` : "/rep/orders"}
    >
      {loading ? (
        <MobileCard>Carregando pedido...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : !order ? (
        <MobileCard>Pedido não encontrado.</MobileCard>
      ) : (
        <>
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>
              Pedido #{order.number ?? "-"}
            </div>

            <div style={{ fontSize: 13, opacity: 0.92, display: "grid", gap: 4 }}>
              <div>Status: {getStatusLabel(order.status)}</div>
              <div>Pagamento: {getPaymentStatusLabel(order.paymentStatus)}</div>
              <div>Forma: {getPaymentMethodLabel(order.paymentMethod)}</div>
              <div>Emissão: {formatDateTimeBR(order.issuedAt || order.createdAt)}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              <a
                href={`/api/orders/${order.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    minHeight: 42,
                    borderRadius: 12,
                    background: "#2563eb",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "0 14px",
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  <Download size={14} />
                  Baixar PDF
                </div>
              </a>
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard label="Itens" value={String(summary.skuCount)} />
            <MobileStatCard label="Unidades" value={String(summary.units)} />
            <MobileStatCard
              label="Total"
              value={formatMoneyBR(order.totalCents ?? 0)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Dados do cliente" />
            <MobileInfoRow
              title="Cliente"
              subtitle={order.client?.name || "-"}
            />
            <MobileInfoRow
              title="Razão social"
              subtitle={order.client?.legalName || "-"}
            />
            <MobileInfoRow
              title="Endereço"
              subtitle={buildAddress(order)}
            />
            <MobileInfoRow
              title="Região"
              subtitle={order.region?.name || "-"}
            />
            <MobileInfoRow
              title="Vendedor"
              subtitle={order.seller?.name || "-"}
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Valores" />
            <MobileInfoRow
              title="Subtotal"
              right={formatMoneyBR(order.subtotalCents ?? 0)}
            />
            <MobileInfoRow
              title="Desconto"
              right={formatMoneyBR(order.discountCents ?? 0)}
            />
            <MobileInfoRow
              title="Total"
              right={formatMoneyBR(order.totalCents ?? 0)}
            />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Itens do pedido" />

            {!order.items?.length ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>
                Nenhum item encontrado.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      borderRadius: 14,
                      border: `1px solid ${colors.border}`,
                      padding: 12,
                      background: colors.isDark ? "#111827" : "#f8fafc",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>
                      {item.product?.name || "Produto"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: colors.subtext,
                        display: "grid",
                        gap: 4,
                      }}
                    >
                      <div>SKU: {item.product?.sku || "-"}</div>
                      <div>Quantidade: {item.qty}</div>
                      <div>Unitário: {formatMoneyBR(item.unitCents ?? 0)}</div>
                      <div>
                        Total:{" "}
                        {formatMoneyBR((item.qty || 0) * (item.unitCents || 0))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>

          {order.notes ? (
            <MobileCard>
              <MobileSectionTitle title="Observações" />
              <div style={{ fontSize: 13, color: colors.text }}>{order.notes}</div>
            </MobileCard>
          ) : null}

          <Link href="/m/rep/orders" style={{ textDecoration: "none" }}>
            <div
              style={{
                minHeight: 46,
                borderRadius: 14,
                border: `1px solid ${colors.border}`,
                background: colors.cardBg,
                color: colors.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              Voltar para pedidos
            </div>
          </Link>
        </>
      )}
    </MobileRepPageFrame>
  );
}