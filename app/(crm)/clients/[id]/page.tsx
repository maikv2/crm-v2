"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatMoneyBRFromCents(cents?: number | null) {
  if (cents == null) return "-";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type ThemeShape = ReturnType<typeof getThemeColors>;

type ClientPageProps = {
  mode?: "ADMIN" | "REPRESENTATIVE";
};

function ActionButton({
  label,
  theme,
  onClick,
  danger = false,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  danger?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const isDangerHover = danger && hover;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: danger
          ? `1px solid ${hover ? "#dc2626" : theme.border}`
          : `1px solid ${theme.border}`,
        background: isDangerHover
          ? "#dc2626"
          : hover
          ? theme.primary
          : theme.cardBg,
        color: hover ? "#ffffff" : danger ? "#dc2626" : theme.text,
        fontWeight: 700,
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

export default function ClientPage({
  mode = "ADMIN",
}: ClientPageProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { theme: modeTheme } = useTheme();
  const theme = getThemeColors(modeTheme);

  const isRepresentative = mode === "REPRESENTATIVE";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/clients/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || "Erro ao carregar cliente");
        }

        const data = await res.json();
        setClient(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Erro ao carregar cliente");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  const totalOrders = useMemo(() => {
    const orders = client?.orders ?? [];
    return orders.length;
  }, [client]);

  const totalSpentCents = useMemo(() => {
    const orders = client?.orders ?? [];
    return orders.reduce(
      (sum: number, order: any) => sum + (order.totalCents ?? 0),
      0
    );
  }, [client]);

  const lastOrder = useMemo(() => {
    const orders = [...(client?.orders ?? [])];
    orders.sort(
      (a: any, b: any) =>
        new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
    return orders[0] ?? null;
  }, [client]);

  async function handleDeleteClient() {
    if (!id || deleting) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este cliente?\n\nSe ele possuir histórico, o sistema poderá apenas inativá-lo."
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Não foi possível excluir o cliente.");
        return;
      }

      if (data?.action === "inactivated") {
        alert("Cliente inativado, pois possui histórico.");
      } else {
        alert("Cliente excluído com sucesso.");
      }

      router.push("/clients");
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir cliente.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleInactivateClient() {
    if (!id || deleting) return;

    const confirmed = window.confirm("Deseja inativar este cliente?");

    if (!confirmed) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "Não foi possível inativar o cliente.");
        return;
      }

      alert("Cliente inativado com sucesso.");
      router.push("/rep/clients");
    } catch (err) {
      console.error(err);
      alert("Erro ao inativar cliente.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: 28,
          background: theme.pageBg,
          color: theme.text,
          minHeight: "100%",
        }}
      >
        Carregando cliente...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 28,
          background: theme.pageBg,
          color: theme.text,
          minHeight: "100%",
        }}
      >
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: 22,
          }}
        >
          <h1 style={{ marginTop: 0 }}>Erro ao carregar</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              color: "#ef4444",
              margin: 0,
            }}
          >
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div
        style={{
          padding: 28,
          background: theme.pageBg,
          color: theme.text,
          minHeight: "100%",
        }}
      >
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            padding: 22,
          }}
        >
          Cliente não encontrado.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: theme.pageBg,
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
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Clientes / Detalhes
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {client.name}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Detalhes do cliente e resumo de compras.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            label="Editar Cliente"
            theme={theme}
            onClick={() =>
              router.push(
                isRepresentative
                  ? `/clients/${client.id}/edit?from=rep-client`
                  : `/clients/${client.id}/edit`
              )
            }
          />
          <ActionButton
            label="Ajustar posição no mapa"
            theme={theme}
            onClick={() =>
              router.push(
                isRepresentative
                  ? `/rep/clients/${client.id}/map`
                  : `/clients/${client.id}/map`
              )
            }
          />
          <ActionButton
            label="Novo Expositor"
            theme={theme}
            onClick={() =>
              router.push(
                isRepresentative
                  ? `/exhibitors/new?clientId=${client.id}&from=rep-client`
                  : `/exhibitors/new?clientId=${client.id}`
              )
            }
          />
          <ActionButton
            label="Novo Pedido"
            theme={theme}
            onClick={() =>
              router.push(
                isRepresentative
                  ? `/rep/orders/new?clientId=${client.id}`
                  : `/orders/new?clientId=${client.id}`
              )
            }
          />

          {isRepresentative ? (
            <ActionButton
              label={deleting ? "Inativando..." : "Inativar Cliente"}
              theme={theme}
              onClick={handleInactivateClient}
              danger
            />
          ) : (
            <ActionButton
              label={deleting ? "Excluindo..." : "Excluir Cliente"}
              theme={theme}
              onClick={handleDeleteClient}
              danger
            />
          )}

          <ActionButton
            label="Voltar"
            theme={theme}
            onClick={() =>
              router.push(isRepresentative ? "/rep/clients" : "/clients")
            }
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: theme.subtext,
              marginBottom: 8,
            }}
          >
            Total de pedidos
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {totalOrders}
          </div>
        </div>

        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: theme.subtext,
              marginBottom: 8,
            }}
          >
            Total comprado
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {formatMoneyBRFromCents(totalSpentCents)}
          </div>
        </div>

        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: theme.subtext,
              marginBottom: 8,
            }}
          >
            Último pedido
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            {lastOrder ? formatDateBR(lastOrder.issuedAt) : "-"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <Block title="Dados do cliente" theme={theme}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Nome:</strong> {client.name || "-"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Status:</strong>{" "}
              {client.active ? "Ativo" : "Inativo"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Região:</strong>{" "}
              {client.region?.name ?? "-"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Telefone:</strong>{" "}
              {client.phone || "-"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>E-mail:</strong>{" "}
              {client.email || "-"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Cidade:</strong>{" "}
              {client.city || "-"} / {client.state || "-"}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Criado em:</strong>{" "}
              {formatDateBR(client.createdAt)}
            </div>

            <div style={{ color: theme.subtext, fontSize: 14 }}>
              <strong style={{ color: theme.text }}>Atualizado em:</strong>{" "}
              {formatDateBR(client.updatedAt)}
            </div>
          </div>
        </Block>

        <Block
          title="Últimos pedidos"
          theme={theme}
          right={
            <ActionButton
              label="Ver histórico"
              theme={theme}
              onClick={() =>
                router.push(
                  isRepresentative
                    ? `/rep/orders?clientId=${client.id}`
                    : `/clients/${client.id}/orders`
                )
              }
            />
          }
        >
          {!(client.orders?.length > 0) ? (
            <div style={{ color: theme.subtext }}>
              Nenhum pedido encontrado para este cliente.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {[...(client.orders ?? [])]
                .sort(
                  (a: any, b: any) =>
                    new Date(b.issuedAt).getTime() -
                    new Date(a.issuedAt).getTime()
                )
                .slice(0, 5)
                .map((order: any) => (
                  <div
                    key={order.id}
                    style={{
                      background: subtleCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {order.status ?? "-"}
                      </div>

                      <div
                        style={{
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {formatMoneyBRFromCents(order.totalCents)}
                      </div>
                    </div>

                    <div style={{ color: theme.subtext, fontSize: 14 }}>
                      <strong style={{ color: theme.text }}>Data:</strong>{" "}
                      {formatDateBR(order.issuedAt)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Block>

        <Block title="Expositores do cliente" theme={theme}>
          {!(client.exhibitors?.length > 0) ? (
            <div style={{ color: theme.subtext }}>
              Nenhum expositor encontrado para este cliente.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {client.exhibitors.map((exhibitor: any) => (
                <div
                  key={exhibitor.id}
                  style={{
                    background: subtleCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: theme.text,
                        marginBottom: 6,
                      }}
                    >
                      {exhibitor.name || exhibitor.code || "Expositor"}
                    </div>

                    <div style={{ color: theme.subtext, fontSize: 14 }}>
                      <strong style={{ color: theme.text }}>Status:</strong>{" "}
                      {exhibitor.status || "-"}
                    </div>

                    <div style={{ color: theme.subtext, fontSize: 14 }}>
                      <strong style={{ color: theme.text }}>Instalado em:</strong>{" "}
                      {formatDateBR(exhibitor.installedAt)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <ActionButton
                      label="Detalhes"
                      theme={theme}
                      onClick={() => router.push(`/exhibitors/${exhibitor.id}`)}
                    />
                    <ActionButton
                      label="Manutenção"
                      theme={theme}
                      onClick={() =>
                        router.push(`/exhibitors/${exhibitor.id}/maintenance`)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Block>
      </div>
    </div>
  );
}