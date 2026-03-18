"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ExhibitorProduct = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
  };
};

type ExhibitorMaintenance = {
  id: string;
  type: string;
  description?: string | null;
  solution?: string | null;
  notes?: string | null;
  performedAt: string;
  nextActionAt?: string | null;
};

type PortalExhibitor = {
  id: string;
  code?: string | null;
  name?: string | null;
  model?: string | null;
  type?: string | null;
  status: string;
  installedAt: string;
  nextVisitAt?: string | null;
  products: ExhibitorProduct[];
  maintenances: ExhibitorMaintenance[];
};

type PortalClient = {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  district?: string | null;
  exhibitors: PortalExhibitor[];
};

function dateBR(date?: string | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

function exhibitorTypeLabel(value?: string | null) {
  switch (value) {
    case "FLOOR":
      return "Chão";
    case "ACRYLIC_CLOSED":
      return "Acrílico fechado";
    case "ACRYLIC_OPEN":
      return "Acrílico aberto";
    case "ACRYLIC_OPEN_SMALL":
      return "Acrílico aberto pequeno";
    default:
      return value || "-";
  }
}

function exhibitorStatusLabel(value?: string | null) {
  switch (value) {
    case "ACTIVE":
      return "Ativo";
    case "MAINTENANCE":
      return "Manutenção";
    case "DAMAGED":
      return "Danificado";
    case "REMOVED":
      return "Removido";
    case "INACTIVE":
      return "Inativo";
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

function ActionButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
    ? "#2563eb"
    : "#ffffff";

  const color = hover || primary ? "#ffffff" : "#111827";

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
        border: primary ? "1px solid #2563eb" : "1px solid #e5e7eb",
        background,
        color,
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
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
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

function SmallCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 18,
        background: "#ffffff",
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          marginTop: 8,
          color: "#111827",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadClient() {
      try {
        const res = await fetch("/api/portal-auth/me", {
          cache: "no-store",
        });

        if (!res.ok) {
          router.push("/portal/login");
          return;
        }

        const json = await res.json();

        if (active) {
          setClient(json?.client ?? null);
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

    loadClient();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/portal-auth/logout", {
      method: "POST",
    });

    router.push("/portal/login");
    router.refresh();
  }

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
        Carregando portal...
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
              🏠 / Portal do Cliente / Dashboard
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Portal do Cliente
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Olá, <b style={{ color: "#111827" }}>{client?.name ?? "Cliente"}</b>. Aqui
              você acompanha suas informações e solicitações.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              label="Solicitar visita"
              primary
              onClick={() => router.push("/portal/visit")}
            />
            <ActionButton
              label="Solicitar pedido"
              onClick={() => router.push("/portal/order-request")}
            />
            <ActionButton
              label="Solicitar manutenção"
              onClick={() => router.push("/portal/maintenance")}
            />
            <ActionButton label="Sair" onClick={handleLogout} />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <SmallCard title="Código do cliente" value={client?.code ?? "-"} />
          <SmallCard title="Cidade" value={client?.city ?? "-"} />
          <SmallCard title="Bairro" value={client?.district ?? "-"} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Block
            title="Acesso rápido"
            subtitle="Escolha uma área para continuar seu atendimento no portal."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <button
                type="button"
                onClick={() => router.push("/portal/order-request")}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Solicitar pedido
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Monte uma solicitação de pedido para envio ao representante.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/orders")}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Pedidos
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Acompanhe o histórico dos seus pedidos e valores.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/boletos")}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Boletos
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Consulte os títulos e acompanhe seus recebimentos.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/notas-fiscais")}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 20,
                  background: "#ffffff",
                  color: "#111827",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  Notas fiscais
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "#64748b",
                  }}
                >
                  Visualize documentos vinculados ao seu atendimento.
                </div>
              </button>
            </div>
          </Block>
        </div>

        <Block
          title="Informações do expositor"
          subtitle="Aqui você visualiza os expositores vinculados ao seu cadastro, os produtos instalados e o histórico de manutenção."
        >
          {!client?.exhibitors?.length ? (
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
              Nenhum expositor encontrado para este cliente.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {client.exhibitors.map((exhibitor) => (
                <div
                  key={exhibitor.id}
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
                          fontSize: 18,
                          fontWeight: 900,
                          color: "#111827",
                        }}
                      >
                        {exhibitor.name || exhibitor.code || "Expositor"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#64748b",
                        }}
                      >
                        Tipo: {exhibitorTypeLabel(exhibitor.type)} • Status:{" "}
                        {exhibitorStatusLabel(exhibitor.status)}
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
                      Instalado em {dateBR(exhibitor.installedAt)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
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
                        Produtos no expositor
                      </div>

                      {exhibitor.products.length === 0 ? (
                        <div
                          style={{
                            padding: 14,
                            color: "#64748b",
                            fontSize: 14,
                          }}
                        >
                          Nenhum produto registrado.
                        </div>
                      ) : (
                        <div style={{ display: "grid" }}>
                          {exhibitor.products.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) 110px",
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
                                  {item.product.name}
                                </div>

                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    color: "#64748b",
                                  }}
                                >
                                  SKU: {item.product.sku || "-"}
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
                                  {item.quantity}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                        Histórico de manutenção
                      </div>

                      {exhibitor.maintenances.length === 0 ? (
                        <div
                          style={{
                            padding: 14,
                            color: "#64748b",
                            fontSize: 14,
                          }}
                        >
                          Nenhuma manutenção registrada.
                        </div>
                      ) : (
                        <div style={{ display: "grid" }}>
                          {exhibitor.maintenances.map((maintenance) => (
                            <div
                              key={maintenance.id}
                              style={{
                                padding: 14,
                                borderTop: "1px solid #f1f5f9",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: "#111827",
                                  marginBottom: 4,
                                }}
                              >
                                {maintenanceTypeLabel(maintenance.type)} •{" "}
                                {dateBR(maintenance.performedAt)}
                              </div>

                              {maintenance.description ? (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#111827",
                                    lineHeight: 1.55,
                                    marginBottom: 4,
                                  }}
                                >
                                  <b>Descrição:</b> {maintenance.description}
                                </div>
                              ) : null}

                              {maintenance.solution ? (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#111827",
                                    lineHeight: 1.55,
                                    marginBottom: 4,
                                  }}
                                >
                                  <b>Solução:</b> {maintenance.solution}
                                </div>
                              ) : null}

                              {maintenance.notes ? (
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#64748b",
                                    lineHeight: 1.55,
                                  }}
                                >
                                  <b>Observações:</b> {maintenance.notes}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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