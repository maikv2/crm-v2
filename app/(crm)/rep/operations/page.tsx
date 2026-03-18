"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type PortalOrderItem = {
  id: string;
  quantity: number;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
    priceCents?: number | null;
  } | null;
};

type PortalOrderRequest = {
  id: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  client?: {
    id: string;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  } | null;
  items: PortalOrderItem[];
};

type MaintenanceRequest = {
  id: string;
  createdAt: string;
  performedAt?: string | null;
  type?: string | null;
  description?: string | null;
  solution?: string | null;
  notes?: string | null;
  exhibitor?: {
    id: string;
    name?: string | null;
    code?: string | null;
  } | null;
  client?: {
    id: string;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
  } | null;
};

type RepOperationsResponse = {
  portalOrders: PortalOrderRequest[];
  maintenanceRequests: MaintenanceRequest[];
  visitRequests: any[];
};

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function portalOrderStatusLabel(value?: string | null) {
  switch (value) {
    case "PENDING":
      return "Pendente";
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Rejeitado";
    case "CONVERTED_TO_ORDER":
      return "Convertido em pedido";
    default:
      return value || "-";
  }
}

function maintenanceTypeLabel(value?: string | null) {
  switch (value) {
    case "PREVENTIVE":
      return "Preventiva";
    case "CORRECTIVE":
      return "Corretiva";
    case "CLEANING":
      return "Limpeza";
    case "REPLACEMENT":
      return "Reposição";
    case "COLLECTION":
      return "Coleta";
    case "REINSTALLATION":
      return "Reinstalação";
    default:
      return value || "-";
  }
}

export default function RepOperationsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [data, setData] = useState<RepOperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/operations", {
        cache: "no-store",
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar centro de operações.");
      }

      setData({
        portalOrders: Array.isArray(raw?.portalOrders) ? raw.portalOrders : [],
        maintenanceRequests: Array.isArray(raw?.maintenanceRequests)
          ? raw.maintenanceRequests
          : [],
        visitRequests: Array.isArray(raw?.visitRequests) ? raw.visitRequests : [],
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar centro de operações."
      );
      setData({
        portalOrders: [],
        maintenanceRequests: [],
        visitRequests: [],
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const portalOrders = useMemo(
    () => (Array.isArray(data?.portalOrders) ? data!.portalOrders : []),
    [data]
  );

  const maintenanceRequests = useMemo(
    () =>
      Array.isArray(data?.maintenanceRequests) ? data!.maintenanceRequests : [],
    [data]
  );

  const visitRequests = useMemo(
    () => (Array.isArray(data?.visitRequests) ? data!.visitRequests : []),
    [data]
  );

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando centro de operações...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ color: muted, fontSize: 14, marginBottom: 8 }}>
              Representante / Centro de Operações
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              Centro de Operações
            </h1>

            <div style={{ color: muted, marginTop: 8 }}>
              Pedidos do portal, manutenções e solicitações operacionais da sua
              região.
            </div>
          </div>

          <button style={btnSecondary} onClick={loadData}>
            Atualizar
          </button>
        </div>

        {error ? (
          <div
            style={{
              ...card,
              border: "1px solid #ef4444",
              color: "#ef4444",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>
              Pedidos do portal
            </div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {portalOrders.length}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>
              Solicitações de manutenção
            </div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {maintenanceRequests.length}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>
              Solicitações de visita
            </div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>
              {visitRequests.length}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Pedidos do portal
            </h2>

            {portalOrders.length === 0 ? (
              <div style={{ color: muted }}>
                Nenhuma solicitação de pedido encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {portalOrders.map((request) => {
                  const subtotalCents = request.items.reduce((sum, item) => {
                    return (
                      sum +
                      Number(item.quantity ?? 0) *
                        Number(item.product?.priceCents ?? 0)
                    );
                  }, 0);

                  return (
                    <div
                      key={request.id}
                      style={{
                        border: `1px solid ${border}`,
                        borderRadius: 12,
                        padding: 14,
                        background: subtleCard,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 17 }}>
                            {request.client?.name || "Cliente"}
                          </div>
                          <div style={{ color: muted, marginTop: 4 }}>
                            {[
                              request.client?.city,
                              request.client?.state,
                            ]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800 }}>
                            {portalOrderStatusLabel(request.status)}
                          </div>
                          <div style={{ color: muted, marginTop: 4 }}>
                            {formatDateBR(request.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                        {request.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              {item.product?.name || "Produto"}{" "}
                              <span style={{ color: muted }}>
                                ({item.product?.sku || "-"})
                              </span>
                            </div>
                            <div style={{ fontWeight: 800 }}>
                              {item.quantity} un
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: request.notes ? 10 : 0,
                        }}
                      >
                        <div style={{ color: muted }}>
                          Telefone: {request.client?.phone || "-"}
                        </div>
                        <div style={{ fontWeight: 800 }}>
                          Valor estimado: {money(subtotalCents)}
                        </div>
                      </div>

                      {request.notes ? (
                        <div
                          style={{
                            marginTop: 10,
                            color: muted,
                            lineHeight: 1.6,
                          }}
                        >
                          <strong style={{ color: theme.text }}>
                            Observações:
                          </strong>{" "}
                          {request.notes}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Solicitações de manutenção
            </h2>

            {maintenanceRequests.length === 0 ? (
              <div style={{ color: muted }}>
                Nenhuma solicitação de manutenção encontrada.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {maintenanceRequests.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 14,
                      background: subtleCard,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17 }}>
                          {item.client?.name || "Cliente"}
                        </div>
                        <div style={{ color: muted, marginTop: 4 }}>
                          Expositor: {item.exhibitor?.name || item.exhibitor?.code || "-"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800 }}>
                          {maintenanceTypeLabel(item.type)}
                        </div>
                        <div style={{ color: muted, marginTop: 4 }}>
                          {formatDateBR(item.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ color: muted, marginBottom: 8 }}>
                      Telefone: {item.client?.phone || "-"}
                    </div>

                    <div style={{ lineHeight: 1.6 }}>
                      <strong>Descrição:</strong>{" "}
                      {item.description || "Sem descrição."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Solicitações de visita
            </h2>

            <div style={{ color: muted, lineHeight: 1.6 }}>
              Ainda não existe uma rota de solicitação de visita implementada no
              portal do cliente. Quando essa parte for criada, esta seção pode
              ser ligada diretamente ao centro de operações.
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                style={btnPrimary}
                onClick={() => router.push("/rep")}
              >
                Voltar ao painel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}