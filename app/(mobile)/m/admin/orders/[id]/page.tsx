"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
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
  product?: { id: string; name?: string | null; sku?: string | null } | null;
};

type OrderDetail = {
  id: string;
  number?: number | null;
  status?: string | null;
  type?: string | null;
  paymentMethod?: string | null;
  paymentReceiver?: string | null;
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
  nfeXmlUrl?: string | null;
  client?: {
    id: string;
    name?: string | null;
    legalName?: string | null;
    cnpj?: string | null;
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

function getStatusLabel(v?: string | null) {
  const m: Record<string, string> = {
    PENDING: "Pendente", APPROVED: "Aprovado", COMPLETED: "Concluído",
    CANCELLED: "Cancelado", DRAFT: "Rascunho",
  };
  return m[v || ""] || v || "-";
}

function getPaymentStatusLabel(v?: string | null) {
  const m: Record<string, string> = {
    PENDING: "Pendente", PAID: "Pago", PARTIAL: "Parcial",
    CANCELLED: "Cancelado", OVERDUE: "Vencido",
  };
  return m[v || ""] || v || "-";
}

function getPaymentMethodLabel(v?: string | null) {
  const m: Record<string, string> = {
    CASH: "Dinheiro", PIX: "Pix", BOLETO: "Boleto",
    CARD_DEBIT: "Cartão débito", CARD_CREDIT: "Cartão crédito",
  };
  return m[v || ""] || v || "-";
}

function getNfeStatusLabel(v?: string | null) {
  const m: Record<string, string> = {
    AUTHORIZED: "Autorizada", PROCESSING: "Processando",
    WAITING: "Aguardando", ISSUED: "Emitida", ERROR: "Erro", REJECTED: "Rejeitada",
  };
  return m[v || ""] || v || "Não emitida";
}

export default function MobileAdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar pedido.");
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pedido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const hasWhatsApp = !!(order?.client?.whatsapp || order?.client?.phone);
  const nfeAuthorized = order?.nfeStatus === "AUTHORIZED" || order?.nfeStatus === "ISSUED";

  const totalItems = useMemo(
    () => order?.items?.reduce((s, i) => s + i.qty, 0) ?? 0,
    [order],
  );

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
      alert(res.ok ? data?.message || "Pedido enviado." : `Erro: ${data?.error || res.status}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar pedido.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEmitNfe() {
    if (!order?.id) return;
    setBusy("emit-nfe");
    try {
      const res = await fetch(`/api/orders/${order.id}/nfe`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Erro: ${data?.error || JSON.stringify(data)}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 3000));
      await fetch(`/api/orders/${order.id}/nfe`, { method: "GET" });
      await load();
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
      alert(res.ok ? data?.message || "NF-e enviada." : `Erro: ${data?.error || res.status}`);
      if (res.ok) {
        try {
          await fetch("/api/whatsapp/send-boleto-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id }),
          });
        } catch { /* silencioso */ }
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar NF-e.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSendBoleto() {
    if (!order?.id) return;
    setBusy("boleto");
    try {
      const res = await fetch("/api/whatsapp/send-boleto-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      alert(res.ok ? data?.message || "Solicitação de boleto enviada." : `Erro: ${data?.error || res.status}`);
    } catch (err) {
      console.error(err);
      alert("Erro ao solicitar boleto.");
    } finally {
      setBusy(null);
    }
  }

  const btnBase: React.CSSProperties = {
    minHeight: 42,
    borderRadius: 12,
    border: "none",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 900,
    color: "#ffffff",
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };

  return (
    <MobilePageFrame
      title="Detalhe do pedido"
      subtitle="Informações completas"
      desktopHref={order?.id ? `/orders/${order.id}` : "/orders"}
    >
      {loading ? (
        <MobileCard>Carregando pedido...</MobileCard>
      ) : error ? (
        <MobileCard>
          <div style={{ color: "#dc2626", marginBottom: 12 }}>{error}</div>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ ...btnBase, background: colors.primary, cursor: "pointer", opacity: 1 }}
          >
            Voltar
          </button>
        </MobileCard>
      ) : !order ? (
        <MobileCard>Pedido não encontrado.</MobileCard>
      ) : (
        <>
          {/* Header card */}
          <MobileCard
            style={{
              background: colors.isDark
                ? "linear-gradient(135deg,#0f172a 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg,#ffffff 0%, #dbeafe 100%)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, color: colors.text, marginBottom: 8 }}>
              Pedido #{order.number ?? "-"}
            </div>

            <div style={{ fontSize: 13, color: colors.isDark ? "rgba(255,255,255,0.85)" : colors.subtext, display: "grid", gap: 3, marginBottom: 14 }}>
              <div>Status: {getStatusLabel(order.status)}</div>
              <div>Pagamento: {getPaymentStatusLabel(order.paymentStatus)}</div>
              <div>Forma: {getPaymentMethodLabel(order.paymentMethod)}</div>
              <div>NF-e: {getNfeStatusLabel(order.nfeStatus)}</div>
              <div>Criado: {formatDateTimeBR(order.issuedAt || order.createdAt)}</div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a
                href={`/api/orders/${order.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                style={{
                  ...btnBase,
                  background: "#475569",
                  textDecoration: "none",
                  cursor: "pointer",
                  opacity: 1,
                }}
              >
                Baixar PDF
              </a>

              <button
                type="button"
                disabled={busy !== null || !hasWhatsApp}
                onClick={handleSendOrder}
                style={{ ...btnBase, background: "#16a34a", opacity: busy || !hasWhatsApp ? 0.6 : 1 }}
                title={hasWhatsApp ? "" : "Cliente sem WhatsApp"}
              >
                {busy === "send-order" ? "Enviando..." : "📲 Enviar pedido"}
              </button>

              {!nfeAuthorized && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={handleEmitNfe}
                  style={{ ...btnBase, background: "#7c3aed" }}
                >
                  {busy === "emit-nfe" ? "Emitindo..." : "🧾 Emitir NF-e"}
                </button>
              )}

              {nfeAuthorized && (
                <button
                  type="button"
                  disabled={busy !== null || !hasWhatsApp}
                  onClick={handleSendNfe}
                  style={{ ...btnBase, background: "#0ea5e9", opacity: busy || !hasWhatsApp ? 0.6 : 1 }}
                  title={hasWhatsApp ? "" : "Cliente sem WhatsApp"}
                >
                  {busy === "send-nfe" ? "Enviando..." : "📲 Enviar NF-e"}
                </button>
              )}

              {order.paymentMethod === "BOLETO" && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={handleSendBoleto}
                  style={{ ...btnBase, background: "#2563eb" }}
                >
                  {busy === "boleto" ? "Enviando..." : "🏦 Solicitar boleto"}
                </button>
              )}
            </div>
          </MobileCard>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Total" value={formatMoneyBR(order.totalCents)} />
            <MobileStatCard label="Itens" value={String(totalItems)} />
          </div>

          {/* Cliente */}
          <MobileCard>
            <MobileSectionTitle title="Cliente" />
            <MobileInfoRow title={order.client?.name || "-"} subtitle={order.client?.legalName || undefined} />
            {order.client?.cnpj ? <MobileInfoRow title="CNPJ" subtitle={order.client.cnpj} /> : null}
            {order.region?.name ? <MobileInfoRow title="Região" subtitle={order.region.name} /> : null}
            {order.seller?.name ? <MobileInfoRow title="Vendedor" subtitle={order.seller.name} /> : null}
            {(order.client?.whatsapp || order.client?.phone) ? (
              <MobileInfoRow title="WhatsApp" subtitle={order.client.whatsapp || order.client.phone || undefined} />
            ) : null}
            {order.client?.city ? (
              <MobileInfoRow
                title="Endereço"
                subtitle={[order.client.city, order.client.state].filter(Boolean).join(" - ")}
              />
            ) : null}
          </MobileCard>

          {/* Resumo financeiro */}
          <MobileCard>
            <MobileSectionTitle title="Resumo financeiro" />
            <MobileInfoRow title="Subtotal" right={formatMoneyBR(order.subtotalCents)} />
            <MobileInfoRow title="Desconto" right={formatMoneyBR(order.discountCents)} />
            <MobileInfoRow title="Total" right={formatMoneyBR(order.totalCents)} />
            <MobileInfoRow title="Forma de pagamento" right={getPaymentMethodLabel(order.paymentMethod)} />
            <MobileInfoRow
              title="Recebedor"
              right={order.paymentReceiver === "REGION" ? "Região" : "Matriz"}
            />
          </MobileCard>

          {/* Itens */}
          {order.items && order.items.length > 0 ? (
            <MobileCard>
              <MobileSectionTitle title="Itens do pedido" />
              <div style={{ display: "grid", gap: 8 }}>
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: `1px solid ${colors.border}`,
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>
                        {item.product?.name || "Produto"}
                      </div>
                      <div style={{ fontSize: 12, color: colors.subtext }}>
                        SKU: {item.product?.sku || "-"} · Qtd: {item.qty}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: colors.primary, whiteSpace: "nowrap" }}>
                      {formatMoneyBR(item.unitCents * item.qty)}
                    </div>
                  </div>
                ))}
              </div>
            </MobileCard>
          ) : null}

          {/* NF-e */}
          {order.nfeStatus ? (
            <MobileCard>
              <MobileSectionTitle title="Nota Fiscal (NF-e)" />
              <MobileInfoRow title="Status" subtitle={getNfeStatusLabel(order.nfeStatus)} />
              {order.nfeNumber ? <MobileInfoRow title="Número" subtitle={String(order.nfeNumber)} /> : null}
              {order.nfeKey ? (
                <div
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    padding: 10,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, marginBottom: 4 }}>
                    Chave de acesso
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: colors.text, wordBreak: "break-all" }}>
                    {order.nfeKey}
                  </div>
                </div>
              ) : null}
            </MobileCard>
          ) : null}

          {/* Observações */}
          {order.notes ? (
            <MobileCard>
              <MobileSectionTitle title="Observações" />
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.55 }}>{order.notes}</div>
            </MobileCard>
          ) : null}

          {/* Botão voltar */}
          <MobileCard>
            <button
              type="button"
              onClick={() => router.push("/m/admin/orders")}
              style={{
                ...btnBase,
                background: colors.isDark ? "#1e293b" : "#e2e8f0",
                color: colors.text,
                width: "100%",
                cursor: "pointer",
                opacity: 1,
              }}
            >
              ← Voltar para pedidos
            </button>
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}
