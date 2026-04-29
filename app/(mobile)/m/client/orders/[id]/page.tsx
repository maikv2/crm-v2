"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import MobileClientPageFrame from "@/app/components/mobile/mobile-client-page-frame";
import {
  MobileCard,
  MobileInfoRow,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type PortalOrderItem = {
  id: string;
  qty: number;
  unitCents: number;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
  } | null;
};

type PortalOrder = {
  id: string;
  number: number;
  status: string;
  issuedAt: string;
  totalCents: number;
  subtotalCents?: number | null;
  discountCents?: number | null;
  paymentMethod?: string | null;
  notes?: string | null;
  nfeStatus?: string | null;
  nfeNumber?: string | null;
  nfeKey?: string | null;
  nfeXmlUrl?: string | null;
  items?: PortalOrderItem[];
};

function dateBR(date?: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    case "OVERDUE":
      return "Vencido";
    default:
      return status || "-";
  }
}

function hasNfe(order: PortalOrder) {
  return (
    Boolean(order.nfeXmlUrl) ||
    order.nfeStatus === "AUTHORIZED" ||
    order.nfeStatus === "AUTORIZADA"
  );
}

function paymentMethodLabel(value?: string | null) {
  switch (value) {
    case "CASH":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "BOLETO":
      return "Boleto";
    case "CARD_DEBIT":
      return "Cartão débito";
    case "CARD_CREDIT":
      return "Cartão crédito";
    default:
      return value || "-";
  }
}

export default function MobileClientOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<PortalOrder | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/portal/orders", {
          cache: "no-store",
        });

        if (res.status === 401) {
          router.push("/portal/login");
          return;
        }

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar pedido.");
        }

        const orders = Array.isArray(json?.orders) ? json.orders : [];
        const found =
          orders.find((item: PortalOrder) => item.id === params.id) || null;

        if (active) {
          setOrder(found);
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
    <MobileClientPageFrame
      title="Detalhe do pedido"
      subtitle="Itens, valores e PDF"
      desktopHref="/portal/orders"
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
              Pedido #{order.number}
            </div>

            <div style={{ fontSize: 13, opacity: 0.92, display: "grid", gap: 4 }}>
              <div>Status: {statusLabel(order.status)}</div>
              <div>Emissão: {dateBR(order.issuedAt)}</div>
              <div>Forma de pagamento: {paymentMethodLabel(order.paymentMethod)}</div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
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

              {hasNfe(order) ? (
                <a
                  href={`/api/orders/${order.id}/nfe/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      minHeight: 42,
                      borderRadius: 12,
                      background: "#16a34a",
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
                    Baixar NF-e
                  </div>
                </a>
              ) : null}
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
            <MobileInfoRow
              title="Forma de pagamento"
              subtitle={paymentMethodLabel(order.paymentMethod)}
            />
            <MobileInfoRow
              title="Status"
              subtitle={statusLabel(order.status)}
            />
            <MobileInfoRow
              title="Emissão"
              subtitle={dateBR(order.issuedAt)}
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

          <Link href="/m/client/orders" style={{ textDecoration: "none" }}>
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
    </MobileClientPageFrame>
  );
}