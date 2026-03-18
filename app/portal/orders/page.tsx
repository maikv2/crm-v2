"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type OrderItem = {
  id: string;
  qty: number;
  unitCents: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
  };
};

type Order = {
  id: string;
  number: number;
  status: string;
  issuedAt: string;
  totalCents: number;
  subtotalCents?: number;
  discountCents?: number;
  paymentMethod?: string | null;
  notes?: string | null;
  items: OrderItem[];
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBR(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "PAID":
      return "Pago";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
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

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
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
        border: "1px solid #e5e7eb",
        background: hover ? "#2563eb" : "#ffffff",
        color: hover ? "#ffffff" : "#111827",
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
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export default function PortalOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const res = await fetch("/api/portal/orders", {
          cache: "no-store",
        });

        if (!res.ok) {
          router.push("/portal/login");
          return;
        }

        const data = await res.json();

        if (active) {
          setOrders(Array.isArray(data?.orders) ? data.orders : []);
        }
      } catch (error) {
        console.error(error);
        router.push("/portal/login");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f3f6fb",
          color: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        Carregando pedidos...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        color: "#111827",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
                color: "#64748b",
                marginBottom: 10,
              }}
            >
              🏠 / Portal do Cliente / Pedidos
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Meus Pedidos
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Consulte os detalhes completos dos seus pedidos, itens e forma de pagamento.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              label="Voltar ao portal"
              onClick={() => router.push("/portal/dashboard")}
            />
          </div>
        </div>

        <Block
          title="Lista de pedidos"
          subtitle="Abaixo estão os pedidos vinculados ao seu cadastro."
        >
          {orders.length === 0 ? (
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Nenhum pedido encontrado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 18,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 18,
                          color: "#111827",
                        }}
                      >
                        Pedido #{String(order.number).padStart(4, "0")}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Emitido em {dateBR(order.issuedAt)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #dbe3ef",
                        background: "#ffffff",
                        color: "#2563eb",
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {statusLabel(order.status)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 14,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Data
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {dateBR(order.issuedAt)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Status
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {statusLabel(order.status)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Forma de pagamento
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {paymentMethodLabel(order.paymentMethod)}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#111827",
                        }}
                      >
                        {money(order.totalCents)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 14,
                      background: "#ffffff",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid #e5e7eb",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#111827",
                        background: "#f8fafc",
                      }}
                    >
                      Itens do pedido
                    </div>

                    <div style={{ display: "grid" }}>
                      {order.items.length === 0 ? (
                        <div
                          style={{
                            padding: 14,
                            color: "#64748b",
                            fontSize: 14,
                          }}
                        >
                          Nenhum item encontrado neste pedido.
                        </div>
                      ) : (
                        order.items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1.6fr) 120px 140px 140px",
                              gap: 12,
                              padding: 14,
                              borderTop: "1px solid #f1f5f9",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: "#111827",
                                }}
                              >
                                {item.product?.name || "Produto"}
                              </div>

                              <div
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  color: "#64748b",
                                }}
                              >
                                SKU: {item.product?.sku || "-"}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  marginBottom: 4,
                                }}
                              >
                                Quantidade
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#111827",
                                }}
                              >
                                {item.qty}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  marginBottom: 4,
                                }}
                              >
                                Valor unitário
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#111827",
                                }}
                              >
                                {money(item.unitCents)}
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  marginBottom: 4,
                                }}
                              >
                                Subtotal
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#111827",
                                }}
                              >
                                {money(item.qty * item.unitCents)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 14,
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Subtotal
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {money(order.subtotalCents ?? order.totalCents)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Desconto
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#111827",
                        }}
                      >
                        {money(order.discountCents ?? 0)}
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 4,
                        }}
                      >
                        Total final
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 900,
                          color: "#111827",
                        }}
                      >
                        {money(order.totalCents)}
                      </div>
                    </div>
                  </div>

                  {order.notes ? (
                    <div
                      style={{
                        marginTop: 14,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        padding: 12,
                        background: "#ffffff",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "#64748b",
                          marginBottom: 6,
                        }}
                      >
                        Observações
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "#111827",
                          lineHeight: 1.6,
                        }}
                      >
                        {order.notes}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Block>
      </div>
    </div>
  );
}