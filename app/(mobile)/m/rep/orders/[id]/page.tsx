"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  nfeStatus?: string | null;
  nfeNumber?: string | null;
  nfeKey?: string | null;
  client?: {
    id: string;
    name?: string | null;
    legalName?: string | null;
    whatsapp?: string | null;
    phone?: string | null;
    street?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
  } | null;
  region?: { id: string; name?: string | null } | null;
  seller?: { id: string; name?: string | null } | null;
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

function getNfeStatusLabel(value?: string | null) {
  const map: Record<string, string> = {
    AUTHORIZED: "Autorizada",
    ISSUED: "Autorizada",
    PROCESSING: "Processando",
    WAITING: "Aguardando",
    REJECTED: "Rejeitada",
    ERROR: "Erro",
  };
  return map[value || ""] || value || "Não emitida";
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

type BusyAction = null | "send-order" | "emit-nfe" | "send-nfe";

export default function MobileRepOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (authRes.status === 401) {
        router.push(`/login?redirect=/m/rep/orders/${params.id}`);
        return;
      }

      const res = await fetch(`/api/orders/${params.id}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar pedido.");
      setOrder(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  }, [params?.id, router]);

  useEffect(() => {
    if (params?.id) load();
  }, [params?.id, load]);

  const summary = useMemo(() => {
    const items = order?.items ?? [];
    return {
      skuCount: items.length,
      units: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    };
  }, [order]);

  const hasWhatsApp = !!(order?.client?.whatsapp || order?.client?.phone);
  const nfeAuthorized =
    order?.nfeStatus === "AUTHORIZED" || order?.nfeStatus === "ISSUED";

  async function handleSendOrder() {
    if (!order?.id) return;
    setBusy("send-order");
    try {
      const res = await fetch("/api/whatsapp/send-order-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      alert(res.ok ? data?.message || "Pedido enviado pelo WhatsApp." : `Erro: ${data?.error || res.status}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido por WhatsApp.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmitNfe() {
    if (!order?.id) return;
    if (!confirm("Emitir NF-e deste pedido? A SEFAZ é acionada de verdade (em produção).")) return;
    setBusy("emit-nfe");
    try {
      const res = await fetch(`/api/orders/${order.id}/nfe`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Erro NF-e: ${data?.error || res.status}${data?.detalhes ? "\n\n" + JSON.stringify(data.detalhes, null, 2) : ""}`);
      } else {
        alert(data?.message || "NF-e enviada.");
        await load();
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao emitir NF-e.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSendNfe() {
    if (!order?.id) return;
    setBusy("send-nfe");
    try {
      const res = await fetch("/api/whatsapp/send-nfe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      alert(res.ok ? data?.message || "NF-e enviada pelo WhatsApp." : `Erro: ${data?.error || res.status}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar NF-e por WhatsApp.");
    } finally {
      setBusy(null);
    }
  }

  const buttonBase: React.CSSProperties = {
    minHeight: 42,
    borderRadius: 12,
    border: "none",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 900,
    color: "#ffffff",
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
  };

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
              <div>NF-e: {getNfeStatusLabel(order.nfeStatus)}</div>
              <div>Emissão: {formatDateTimeBR(order.issuedAt || order.createdAt)}</div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              
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

              <button
                disabled={busy !== null || !hasWhatsApp}
                onClick={handleSendOrder}
                style={{
                  ...buttonBase,
                  background: "#16a34a",
                  opacity: busy || !hasWhatsApp ? 0.6 : 1,
                  cursor: busy || !hasWhatsApp ? "not-allowed" : "pointer",
                }}
                title={hasWhatsApp ? "" : "Cliente sem WhatsApp cadastrado"}
              >
                {busy === "send-order" ? "Enviando..." : "📲 Enviar pedido"}
              </button>

              {!nfeAuthorized && (
                <button
                  disabled={busy !== null}
                  onClick={handleEmitNfe}
                  style={{ ...buttonBase, background: "#7c3aed" }}
                >
                  {busy === "emit-nfe" ? "Emitindo..." : "🧾 Emitir NF-e"}
                </button>
              )}

              {nfeAuthorized && (
                <button
                  disabled={busy !== null || !hasWhatsApp}
                  onClick={handleSendNfe}
                  style={{
                    ...buttonBase,
                    background: "#0ea5e9",
                    opacity: busy || !hasWhatsApp ? 0.6 : 1,
                    cursor: busy || !hasWhatsApp ? "not-allowed" : "pointer",
                  }}
                  title={hasWhatsApp ? "" : "Cliente sem WhatsApp cadastrado"}
                >
                  {busy === "send-nfe" ? "Enviando..." : "📲 Enviar NF-e"}
                </button>
              )}
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
            <MobileStatCard label="Total" value={formatMoneyBR(order.totalCents ?? 0)} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Dados do cliente" />
            <MobileInfoRow title="Cliente" subtitle={order.client?.name || "-"} />
            <MobileInfoRow title="Razão social" subtitle={order.client?.legalName || "-"} />
            <MobileInfoRow title="Endereço" subtitle={buildAddress(order)} />
            <MobileInfoRow title="Região" subtitle={order.region?.name || "-"} />
            <MobileInfoRow title="Vendedor" subtitle={order.seller?.name || "-"} />
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Valores" />
            <MobileInfoRow title="Subtotal" right={formatMoneyBR(order.subtotalCents ?? 0)} />
            <MobileInfoRow title="Desconto" right={formatMoneyBR(order.discountCents ?? 0)} />
            <MobileInfoRow title="Total" right={formatMoneyBR(order.totalCents ?? 0)} />
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
                        Total: {formatMoneyBR((item.qty || 0) * (item.unitCents || 0))}
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