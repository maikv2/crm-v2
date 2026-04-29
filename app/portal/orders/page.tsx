"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Order = {
  id: string;
  number: number;
  status: string;
  issuedAt: string;
  totalCents: number;
  nfeStatus?: string | null;
  nfeNumber?: string | null;
  nfeKey?: string | null;
  nfeXmlUrl?: string | null;
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
    case "OVERDUE":
      return "Vencido";
    default:
      return status;
  }
}

function hasNfe(order: Order) {
  return (
    Boolean(order.nfeXmlUrl) ||
    order.nfeStatus === "AUTHORIZED" ||
    order.nfeStatus === "AUTORIZADA"
  );
}

function statusColors(status: string, isDark: boolean) {
  switch (status) {
    case "PAID":
      return {
        bg: isDark ? "rgba(34,197,94,0.18)" : "#dcfce7",
        color: "#16a34a",
      };
    case "CANCELLED":
      return {
        bg: isDark ? "rgba(239,68,68,0.18)" : "#fee2e2",
        color: "#dc2626",
      };
    case "OVERDUE":
      return {
        bg: isDark ? "rgba(245,158,11,0.18)" : "#fef3c7",
        color: "#b45309",
      };
    default:
      return {
        bg: isDark ? "rgba(37,99,235,0.18)" : "#dbeafe",
        color: "#2563eb",
      };
  }
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
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
        border: `1px solid ${colors.border}`,
        background: hover ? "#2563eb" : colors.cardBg,
        color: hover ? "#ffffff" : colors.text,
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
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: colors.isDark
          ? "0 8px 24px rgba(2,6,23,0.26)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: colors.text,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
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
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

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

  const totalValue = useMemo(() => {
    return orders.reduce((sum, item) => sum + Number(item.totalCents || 0), 0);
  }, [orders]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.pageBg,
          color: colors.text,
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
        background: colors.pageBg,
        color: colors.text,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
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
                color: colors.subtext,
                marginBottom: 10,
              }}
            >
              🏠 / Portal do Cliente / Pedidos
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Meus pedidos
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              Lista simplificada dos seus pedidos. Para ver o pedido completo, baixe o PDF.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              label="Voltar ao portal"
              onClick={() => router.push("/portal/dashboard")}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <Block title="Quantidade" subtitle="Pedidos encontrados">
            <div style={{ fontSize: 28, fontWeight: 900 }}>{orders.length}</div>
          </Block>

          <Block title="Total" subtitle="Valor somado dos pedidos">
            <div style={{ fontSize: 28, fontWeight: 900 }}>{money(totalValue)}</div>
          </Block>
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
                border: `1px solid ${colors.border}`,
                background: colors.isDark ? "#111827" : "#f8fafc",
                color: colors.subtext,
                fontSize: 14,
              }}
            >
              Nenhum pedido encontrado.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {orders.map((order) => {
                const badge = statusColors(order.status, colors.isDark);

                return (
                  <div
                    key={order.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 16,
                      padding: 18,
                      background: colors.isDark ? "#111827" : "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1fr) auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 18,
                            color: colors.text,
                          }}
                        >
                          Pedido #{order.number}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 13,
                            color: colors.subtext,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 10,
                          }}
                        >
                          <span>{dateBR(order.issuedAt)}</span>
                          <span>{money(order.totalCents)}</span>
                        </div>
                      </div>

                      <span
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <a
                        href={`/api/orders/${order.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          textDecoration: "none",
                        }}
                      >
                        <div
                          style={{
                            minHeight: 42,
                            padding: "0 14px",
                            borderRadius: 12,
                            background: "#2563eb",
                            color: "#ffffff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          <Download size={15} />
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
                              padding: "0 14px",
                              borderRadius: 12,
                              background: "#16a34a",
                              color: "#ffffff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            <FileText size={15} />
                            Baixar NF-e
                          </div>
                        </a>
                      ) : null}

                      <div
                        style={{
                          minHeight: 42,
                          padding: "0 14px",
                          borderRadius: 12,
                          border: `1px solid ${colors.border}`,
                          background: colors.cardBg,
                          color: colors.text,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        <FileText size={15} />
                        Pedido resumido
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Block>
      </div>
    </div>
  );
}