"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Globe, PackageCheck, XCircle } from "lucide-react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type RequestItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
  };
};

type Representative = {
  id: string;
  name: string;
  active: boolean;
};

type OrderRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CONVERTED_TO_ORDER";
  notes: string | null;
  createdAt: string;
  source?: string;
  requestedPaymentMethod?: string | null;
  requestedInstallments?: number;
  isCashOnDelivery?: boolean;
  customPlanRequested?: boolean;
  convertedOrderId?: string | null;
  client: { id: string; name: string; code?: string | number | null };
  items: RequestItem[];
};

function formatMoneyBRFromCents(cents?: number | null) {
  const safe = cents ?? 0;
  return (safe / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function paymentLabel(req: OrderRequest) {
  if (req.isCashOnDelivery) return "Pagamento na entrega";
  const method = req.requestedPaymentMethod;
  const installments = req.requestedInstallments ?? 1;
  switch (method) {
    case "PIX":
      return "Pix à vista";
    case "CASH":
      return "À vista";
    case "CARD_DEBIT":
      return "Cartão de débito";
    case "CARD_CREDIT":
      return installments > 1 ? `Cartão de crédito ${installments}x` : "Cartão de crédito à vista";
    case "BOLETO":
      return installments > 1 ? `Boleto - entrada + ${installments - 1}x` : "Boleto à vista";
    default:
      return "Não informada";
  }
}

function statusLabel(status: OrderRequest["status"]) {
  switch (status) {
    case "PENDING":
      return "Aguardando aprovação";
    case "APPROVED":
      return "Aprovado - pronto pra converter";
    case "REJECTED":
      return "Rejeitado";
    case "CONVERTED_TO_ORDER":
      return "Convertido em pedido";
    default:
      return status;
  }
}

function statusColor(status: OrderRequest["status"], theme: ReturnType<typeof getThemeColors>) {
  switch (status) {
    case "PENDING":
      return "#d97706";
    case "APPROVED":
      return "#2563eb";
    case "REJECTED":
      return "#dc2626";
    case "CONVERTED_TO_ORDER":
      return "#16a34a";
    default:
      return theme.subtext;
  }
}

export default function OrderRequestsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [convertedOrderId, setConvertedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/requests");
      const data = await res.json();
      setRequests(Array.isArray(data.requests) ? data.requests : []);
    } catch {
      setError("Não foi possível carregar as solicitações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    async function loadRepresentatives() {
      try {
        const res = await fetch("/api/representatives");
        const data = await res.json();
        const items: Representative[] = Array.isArray(data?.items) ? data.items : [];
        const activeReps = items.filter((rep) => rep.active);
        setRepresentatives(activeReps);
        setSellerId((current) => current || activeReps[0]?.id || "");
      } catch {
        // Sem vendedores carregados, o select fica vazio e a conversão exige seleção manual.
      }
    }

    loadRepresentatives();
  }, []);

  async function updateStatus(id: string, status: string) {
    if (status === "CONVERTED_TO_ORDER" && !sellerId) {
      setError("Selecione o vendedor responsável pela comissão antes de converter.");
      return;
    }

    setBusyId(id);
    setError(null);
    setConvertedOrderId(null);
    try {
      const res = await fetch(`/api/orders/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          status === "CONVERTED_TO_ORDER" ? { status, sellerId } : { status }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Não foi possível atualizar a solicitação.");
        return;
      }
      if (status === "CONVERTED_TO_ORDER" && data?.orderId) {
        setConvertedOrderId(data.orderId);
      }
      await load();
    } catch {
      setError("Falha de conexão ao atualizar a solicitação.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((r) => r.status === "PENDING" || r.status === "APPROVED");
  const resolved = requests.filter((r) => r.status === "REJECTED" || r.status === "CONVERTED_TO_ORDER");

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Globe size={22} color={theme.primary} />
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0 }}>Pedidos do Site</h1>
      </div>
      <p style={{ color: theme.subtext, marginTop: 4, marginBottom: 20 }}>
        Solicitações de pedido feitas pelo cliente na loja online (v2distribuidora.com). Toda solicitação precisa ser
        aprovada aqui antes de virar um pedido de verdade.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <label style={{ fontSize: 13, fontWeight: 700, color: theme.text, whiteSpace: "nowrap" }}>
          Vendedor (comissão)
        </label>
        <select
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 280,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: "6px 10px",
            background: theme.inputBg ?? theme.cardBg,
            color: theme.text,
            fontSize: 13,
          }}
        >
          <option value="">Selecione...</option>
          {representatives.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {convertedOrderId ? (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <PackageCheck size={16} />
          Pedido criado! {" "}
          <Link href={`/orders/${convertedOrderId}`} style={{ textDecoration: "underline", fontWeight: 600 }}>
            Abrir pedido e configurar cobrança
          </Link>
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: theme.subtext }}>Carregando...</p>
      ) : requests.length === 0 ? (
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
            color: theme.subtext,
          }}
        >
          Nenhuma solicitação recebida do site ainda.
        </div>
      ) : (
        <>
          {pending.map((req) => (
            <div
              key={req.id}
              style={{
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 18,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, color: theme.text, fontSize: 16 }}>
                    {req.client?.name} {req.client?.code ? `(#${req.client.code})` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
                    {formatDateTimeBR(req.createdAt)} · Origem: {req.source === "site" ? "Loja online" : "Portal do cliente"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: statusColor(req.status, theme),
                    border: `1px solid ${statusColor(req.status, theme)}`,
                    borderRadius: 999,
                    padding: "2px 10px",
                    height: "fit-content",
                  }}
                >
                  {statusLabel(req.status)}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: req.customPlanRequested ? "#fef3c7" : theme.hoverBg,
                  color: req.customPlanRequested ? "#92400e" : theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Forma de pagamento: {paymentLabel(req)}
                {req.customPlanRequested ? " — plano customizado, revisar com atenção antes de aprovar" : ""}
              </div>

              <div style={{ marginTop: 12 }}>
                {req.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: theme.text,
                      padding: "4px 0",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <span>
                      {item.quantity}x {item.product?.name} <span style={{ color: theme.subtext }}>({item.product?.sku})</span>
                    </span>
                    <span>{formatMoneyBRFromCents((item.product?.priceCents ?? 0) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {req.notes ? (
                <pre
                  style={{
                    marginTop: 10,
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    color: theme.subtext,
                    fontFamily: "inherit",
                  }}
                >
                  {req.notes}
                </pre>
              ) : null}

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {req.status === "PENDING" ? (
                  <>
                    <button
                      disabled={busyId === req.id}
                      onClick={() => updateStatus(req.id, "APPROVED")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#2563eb",
                        color: "#fff",
                        border: 0,
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <CheckCircle2 size={16} /> Aprovar
                    </button>
                    <button
                      disabled={busyId === req.id}
                      onClick={() => updateStatus(req.id, "REJECTED")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "transparent",
                        color: "#dc2626",
                        border: "1px solid #dc2626",
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <XCircle size={16} /> Rejeitar
                    </button>
                  </>
                ) : null}

                {req.status === "APPROVED" ? (
                  <button
                    disabled={busyId === req.id}
                    onClick={() => updateStatus(req.id, "CONVERTED_TO_ORDER")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#16a34a",
                      color: "#fff",
                      border: 0,
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <PackageCheck size={16} /> Converter em pedido
                  </button>
                ) : null}
              </div>
            </div>
          ))}

          {resolved.length > 0 ? (
            <>
              <h2 style={{ fontSize: 14, color: theme.subtext, marginTop: 24, marginBottom: 10, textTransform: "uppercase" }}>
                Já resolvidas
              </h2>
              {resolved.map((req) => (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    fontSize: 13,
                    color: theme.text,
                  }}
                >
                  <span>
                    {req.client?.name} · {formatDateTimeBR(req.createdAt)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {req.status === "CONVERTED_TO_ORDER" && req.convertedOrderId ? (
                      <Link href={`/orders/${req.convertedOrderId}`} style={{ color: theme.primary, textDecoration: "underline" }}>
                        Ver pedido
                      </Link>
                    ) : null}
                    <span style={{ fontWeight: 700, color: statusColor(req.status, theme) }}>{statusLabel(req.status)}</span>
                  </span>
                </div>
              ))}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
