"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type OrderItem = {
  id: string;
  qty: number;
  unitCents: number;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
    imageUrl?: string | null;
  } | null;
};

type Installment = {
  id: string;
  installmentNumber: number;
  amountCents: number;
  dueDate: string;
  paidAt?: string | null;
  status: string;
};

type OrderDetail = {
  id: string;
  number?: string | number | null;
  createdAt: string;
  status?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  paymentReceiver?: string | null;
  subtotalCents?: number | null;
  discountCents?: number | null;
  totalCents?: number | null;
  notes?: string | null;

  client?: {
    id: string;
    name?: string | null;
    legalName?: string | null;
    cnpj?: string | null;
    cpf?: string | null;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    street?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    cep?: string | null;
    region?: {
      name?: string | null;
    } | null;
  } | null;

  region?: {
    id?: string | null;
    name?: string | null;
  } | null;

  seller?: {
    id?: string | null;
    name?: string | null;
  } | null;

  items?: OrderItem[];

  accountsReceivables?: {
    id: string;
    installmentCount: number;
    installments?: Installment[];
  }[];
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function money(cents?: number | null) {
  const safe = cents ?? 0;
  return (safe / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatOrderNumber(value?: string | number | null, fallbackId?: string) {
  if (value === null || value === undefined || value === "") {
    return fallbackId ?? "-";
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return `PED-${String(numeric).padStart(4, "0")}`;
  }

  return String(value);
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

function paymentStatusLabel(value?: string | null) {
  switch (value) {
    case "PAID":
      return "Pago";
    case "PARTIAL":
      return "Parcial";
    case "PENDING":
      return "Pendente";
    case "OVERDUE":
      return "Vencido";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelado";
    default:
      return value || "-";
  }
}

function buildClientAddress(order: OrderDetail) {
  const client = order.client;
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

function statusColor(status?: string | null) {
  if (status === "PAID") return "#16a34a";
  if (status === "PARTIAL") return "#ca8a04";
  if (status === "OVERDUE") return "#dc2626";
  if (status === "CANCELLED" || status === "CANCELED") return "#6b7280";
  return "#2563eb";
}

function ActionButton({
  label,
  theme,
  onClick,
  primary,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        padding: "0 14px",
        borderRadius: 12,
        border: primary
          ? `1px solid ${theme.primary}`
          : `1px solid ${theme.border}`,
        background: primary
          ? hover
            ? "#1d4ed8"
            : theme.primary
          : hover
          ? theme.primary
          : theme.cardBg,
        color: primary || hover ? "#ffffff" : theme.text,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

function StatusBadge({
  label,
  color,
  theme,
}: {
  label: string;
  color: string;
  theme: ThemeShape;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        background: theme.isDark ? `${color}25` : `${color}18`,
        color,
        border: `1px solid ${theme.isDark ? `${color}40` : `${color}25`}`,
      }}
    >
      {label}
    </span>
  );
}

function ProductImage({
  sku,
  name,
  alt,
  theme,
}: {
  sku?: string | null;
  name?: string | null;
  alt: string;
  theme: ThemeShape;
}) {
  const [failed, setFailed] = useState(false);

  if ((!sku && !name) || failed) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          textAlign: "center",
          padding: 8,
        }}
      >
        Sem imagem
      </div>
    );
  }

  return (
    <img
      src={`/api/product-image?sku=${encodeURIComponent(
        sku ?? ""
      )}&name=${encodeURIComponent(name ?? "")}`}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const id = params?.id as string;

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;

      try {
        const res = await fetch(`/api/orders/${id}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Erro ao carregar pedido.");
        }

        setOrder(data);
      } catch (error) {
        console.error(error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  async function reloadOrder() {
    if (!id) return;

    const res = await fetch(`/api/orders/${id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Erro ao carregar pedido.");
    }

    setOrder(data);
  }

  async function receiveInstallment(installmentId: string) {
    try {
      setReceivingId(installmentId);

      const res = await fetch("/api/installments/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          installmentId,
        }),
      });

      if (!res.ok) {
        alert("Erro ao registrar pagamento");
        return;
      }

      await reloadOrder();
    } catch (error) {
      console.error(error);
      alert("Erro ao registrar pagamento");
    } finally {
      setReceivingId(null);
    }
  }

  const totalItems = useMemo(() => {
    return order?.items?.reduce((sum, item) => sum + item.qty, 0) ?? 0;
  }, [order]);

  const clientAddress = useMemo(() => {
    return order ? buildClientAddress(order) : "-";
  }, [order]);

  const pdfUrl = order ? `/api/orders/${order.id}/pdf` : "";

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        Carregando pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <Block title="Pedido não encontrado" theme={theme}>
            <div
              style={{
                color: muted,
                marginBottom: 16,
              }}
            >
              Não foi possível localizar este pedido.
            </div>

            <ActionButton
              label="Voltar para pedidos"
              theme={theme}
              onClick={() => router.push("/orders")}
            />
          </Block>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: muted,
              marginBottom: 10,
            }}
          >
            🏠 / Pedidos / {formatOrderNumber(order.number, order.id)}
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {formatOrderNumber(order.number, order.id)}
            <StatusBadge
              label={paymentStatusLabel(order.paymentStatus)}
              color={statusColor(order.paymentStatus)}
              theme={theme}
            />
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Criado em {formatDateTimeBR(order.createdAt)}
          </div>
        </div>

        <div
  style={{
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  }}
>
  <ActionButton
    label="Voltar"
    theme={theme}
    onClick={() => router.push("/orders")}
  />
  <ActionButton
    label="Baixar PDF"
    theme={theme}
    onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
  />
  <ActionButton
    label="Emitir NF-e"
    theme={theme}
    primary
    onClick={async () => {
      if (!order?.id) return;

      try {
        const res = await fetch(`/api/orders/${order.id}/nfe`, {
          method: "POST",
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Erro NF-e:", data);
          alert(JSON.stringify(data, null, 2));
          return;
        }

        alert("NF-e enviada para processamento");
      } catch (err) {
        console.error(err);
        alert("Erro ao emitir NF-e");
      }
    }}
  />
</div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
          }}
        >
          <Block title="Cliente" theme={theme}>
            <div
              style={{
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: theme.text,
                }}
              >
                {order.client?.name || "-"}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 6,
                  color: muted,
                  fontSize: 14,
                }}
              >
                <div>
                  <strong style={{ color: theme.text }}>Razão social:</strong>{" "}
                  {order.client?.legalName || order.client?.name || "-"}
                </div>
                <div>
                  <strong style={{ color: theme.text }}>Região:</strong>{" "}
                  {order.region?.name || order.client?.region?.name || "-"}
                </div>
                <div>
                  <strong style={{ color: theme.text }}>WhatsApp:</strong>{" "}
                  {order.client?.whatsapp || order.client?.phone || "-"}
                </div>
                <div>
                  <strong style={{ color: theme.text }}>E-mail:</strong>{" "}
                  {order.client?.email || "-"}
                </div>
                <div>
                  <strong style={{ color: theme.text }}>Endereço:</strong>{" "}
                  {clientAddress}
                </div>
              </div>
            </div>
          </Block>

          <Block title="Resumo do pedido" theme={theme}>
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <InfoRow
                label="Forma de pagamento"
                value={paymentMethodLabel(order.paymentMethod)}
                theme={theme}
              />
              <InfoRow
                label="Status do pedido"
                value={order.status || "-"}
                theme={theme}
              />
              <InfoRow
                label="Status do pagamento"
                value={paymentStatusLabel(order.paymentStatus)}
                theme={theme}
              />
              <InfoRow
                label="Quem recebeu"
                value={
                  order.paymentReceiver === "REGION" ? "Região" : "Matriz"
                }
                theme={theme}
              />
              <InfoRow
                label="Vendedor"
                value={order.seller?.name || "-"}
                theme={theme}
              />
              <InfoRow
                label="Itens"
                value={String(totalItems)}
                theme={theme}
              />
            </div>
          </Block>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.6fr",
            gap: 18,
          }}
        >
          <Block title="Itens do pedido" theme={theme}>
            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              {order.items?.length ? (
                order.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      background: subtleCard,
                      padding: 14,
                      display: "grid",
                      gridTemplateColumns: "80px 1fr auto auto auto",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        border: `1px solid ${theme.border}`,
                        background: inputBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      <ProductImage
                        sku={item.product?.sku}
                        name={item.product?.name}
                        alt={item.product?.name || "Produto"}
                        theme={theme}
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color: theme.text,
                          marginBottom: 4,
                        }}
                      >
                        {item.product?.name || "-"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        SKU: {item.product?.sku || "-"}
                      </div>
                    </div>

                    <MetricBox
                      label="Qtd"
                      value={String(item.qty)}
                      theme={theme}
                    />
                    <MetricBox
                      label="Unitário"
                      value={money(item.unitCents)}
                      theme={theme}
                    />
                    <MetricBox
                      label="Subtotal"
                      value={money(item.qty * item.unitCents)}
                      theme={theme}
                    />
                  </div>
                ))
              ) : (
                <div
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    background: subtleCard,
                    padding: 20,
                    color: muted,
                    textAlign: "center",
                  }}
                >
                  Nenhum item encontrado.
                </div>
              )}
            </div>
          </Block>

          <Block title="Totais" theme={theme}>
            <div style={{ display: "grid", gap: 12 }}>
              <MetricSummary
                label="Subtotal"
                value={money(order.subtotalCents)}
                theme={theme}
              />
              <MetricSummary
                label="Desconto"
                value={money(order.discountCents)}
                theme={theme}
                valueColor="#ef4444"
              />
              <MetricSummary
                label="Total"
                value={money(order.totalCents)}
                theme={theme}
                valueColor={theme.primary}
              />
            </div>
          </Block>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <Block title="Condição de pagamento" theme={theme}>
            <div style={{ display: "grid", gap: 10 }}>
              <InfoRow
                label="Forma de pagamento"
                value={paymentMethodLabel(order.paymentMethod)}
                theme={theme}
              />

              {order.accountsReceivables?.[0]?.installmentCount ? (
                <InfoRow
                  label="Quantidade de parcelas"
                  value={String(order.accountsReceivables[0].installmentCount)}
                  theme={theme}
                />
              ) : null}
            </div>
          </Block>

          <Block title="Observações" theme={theme}>
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                background: subtleCard,
                padding: 16,
                color: muted,
                minHeight: 110,
                lineHeight: 1.6,
              }}
            >
              {order.notes?.trim() ? order.notes : "Sem observações informadas."}
            </div>
          </Block>
        </div>

        <Block title="Parcelas" theme={theme}>
          <div style={{ display: "grid", gap: 12 }}>
            {order.accountsReceivables?.[0]?.installments?.length ? (
              order.accountsReceivables[0].installments.map((item) => {
                const paid = item.status === "PAID";

                return (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      background: subtleCard,
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: "repeat(6, minmax(0, 1fr)) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <MetricMini
                      label="Parcela"
                      value={`${item.installmentNumber}/${
                        order.accountsReceivables?.[0]?.installmentCount || 1
                      }`}
                      theme={theme}
                    />
                    <MetricMini
                      label="Vencimento"
                      value={formatDateBR(item.dueDate)}
                      theme={theme}
                    />
                    <MetricMini
                      label="Valor"
                      value={money(item.amountCents)}
                      theme={theme}
                    />
                    <MetricMini
                      label="Status"
                      value={paymentStatusLabel(item.status)}
                      theme={theme}
                      valueColor={statusColor(item.status)}
                    />
                    <MetricMini
                      label="Pago em"
                      value={formatDateBR(item.paidAt)}
                      theme={theme}
                    />
                    <MetricMini
                      label="Situação"
                      value={paid ? "Pago" : "A receber"}
                      theme={theme}
                      valueColor={paid ? "#16a34a" : "#2563eb"}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      {!paid ? (
                        <ActionButton
                          label={
                            receivingId === item.id ? "Recebendo..." : "Receber"
                          }
                          theme={theme}
                          primary
                          onClick={() => receiveInstallment(item.id)}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "#16a34a",
                          }}
                        >
                          Pago
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  background: subtleCard,
                  padding: 20,
                  color: muted,
                  textAlign: "center",
                }}
              >
                Nenhuma parcela encontrada.
              </div>
            )}
          </div>
        </Block>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 12,
        background: theme.isDark ? "#0b1324" : "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        minWidth: 110,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 12,
        background: theme.cardBg,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricSummary({
  label,
  value,
  theme,
  valueColor,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: 16,
        background: theme.isDark ? "#0b1324" : "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: valueColor || theme.text,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MetricMini({
  label,
  value,
  theme,
  valueColor,
}: {
  label: string;
  value: string;
  theme: ThemeShape;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 12,
        background: theme.cardBg,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: theme.isDark ? "#94a3b8" : "#64748b",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: valueColor || theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}