"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, ShoppingCart, ToolCase, Wrench } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

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

type ThemeShape = ReturnType<typeof getThemeColors>;

function PageButton({
  label,
  icon,
  theme,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  theme: ThemeShape;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : theme.isDark
        ? "#0f172a"
        : "#ffffff";

  const color = primary ? "#ffffff" : hover ? "#ffffff" : theme.text;
  const border = primary ? "none" : `1px solid ${theme.border}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border,
        background,
        color,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
  theme,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  theme: ThemeShape;
}) {
  return (
    <div
      style={{
        background: theme.isDark ? "#0f172a" : "#ffffff",
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 18,
        padding: 22,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.isDark ? "#94a3b8" : "#64748b",
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
  theme,
  accent,
}: {
  title: string;
  value: string;
  theme: ThemeShape;
  accent?: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
        borderRadius: 16,
        padding: 18,
        background: theme.isDark ? "#111827" : "#ffffff",
      }}
    >
      <div
        style={{
          color: theme.isDark ? "#94a3b8" : "#64748b",
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
          color: accent || theme.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : "#f3f6fb";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadClient(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const res = await fetch("/api/portal-auth/me", {
        cache: "no-store",
      });

      if (!res.ok) {
        router.push("/portal/login");
        return;
      }

      const json = await res.json();
      setClient(json?.client ?? null);
    } catch (error) {
      console.error(error);
      setError("Não foi possível carregar o portal.");
      router.push("/portal/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [router]);

  const summary = useMemo(() => {
    const exhibitors = client?.exhibitors ?? [];
    const activeExhibitors = exhibitors.filter((item) => item.status === "ACTIVE");
    const totalProducts = exhibitors.reduce((sum, exhibitor) => {
      return sum + (exhibitor.products?.length ?? 0);
    }, 0);
    const nextVisits = exhibitors.filter((item) => item.nextVisitAt).length;
    const maintenances = exhibitors.reduce((sum, exhibitor) => {
      return sum + (exhibitor.maintenances?.length ?? 0);
    }, 0);

    return {
      exhibitorsCount: exhibitors.length,
      activeExhibitorsCount: activeExhibitors.length,
      totalProducts,
      nextVisits,
      maintenances,
    };
  }, [client]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 74px)",
          background: pageBg,
          color: theme.text,
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
        minHeight: "calc(100vh - 74px)",
        background: pageBg,
        color: theme.text,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
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
              Portal do Cliente
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: theme.text,
              }}
            >
              Dashboard do Cliente
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: muted,
              }}
            >
              Olá, <b style={{ color: theme.text }}>{client?.name ?? "Cliente"}</b>. Aqui
              você acompanha suas informações e solicitações.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PageButton
              label={refreshing ? "Atualizando..." : "Atualizar"}
              icon={<RefreshCw size={16} />}
              theme={theme}
              onClick={() => loadClient(true)}
              disabled={refreshing}
            />
            <PageButton
              label="Solicitar visita"
              icon={<ToolCase size={16} />}
              primary
              theme={theme}
              onClick={() => router.push("/portal/visit")}
            />
            <PageButton
              label="Solicitar pedido"
              icon={<ShoppingCart size={16} />}
              theme={theme}
              onClick={() => router.push("/portal/order-request")}
            />
            <PageButton
              label="Solicitar manutenção"
              icon={<Wrench size={16} />}
              theme={theme}
              onClick={() => router.push("/portal/maintenance")}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 18,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ef4444",
              color: "#ef4444",
              background: theme.isDark ? "#0f172a" : "#ffffff",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <SmallCard title="Código do cliente" value={client?.code ?? "-"} theme={theme} />
          <SmallCard title="Cidade" value={client?.city ?? "-"} theme={theme} />
          <SmallCard title="Bairro" value={client?.district ?? "-"} theme={theme} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <SmallCard
            title="Expositores"
            value={String(summary.exhibitorsCount)}
            theme={theme}
          />
          <SmallCard
            title="Ativos"
            value={String(summary.activeExhibitorsCount)}
            theme={theme}
            accent="#22c55e"
          />
          <SmallCard
            title="Produtos"
            value={String(summary.totalProducts)}
            theme={theme}
            accent="#2563eb"
          />
          <SmallCard
            title="Próximas visitas"
            value={String(summary.nextVisits)}
            theme={theme}
            accent="#f59e0b"
          />
          <SmallCard
            title="Manutenções"
            value={String(summary.maintenances)}
            theme={theme}
            accent="#8b5cf6"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <Section
            title="Acesso rápido"
            subtitle="Escolha uma área para continuar seu atendimento no portal."
            theme={theme}
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
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 20,
                  background: theme.isDark ? "#111827" : "#ffffff",
                  color: theme.text,
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
                    color: muted,
                  }}
                >
                  Monte uma solicitação de pedido para envio ao representante.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/orders")}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 20,
                  background: theme.isDark ? "#111827" : "#ffffff",
                  color: theme.text,
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
                    color: muted,
                  }}
                >
                  Acompanhe o histórico dos seus pedidos e valores.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/visit")}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 20,
                  background: theme.isDark ? "#111827" : "#ffffff",
                  color: theme.text,
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
                  Solicitar visita
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: muted,
                  }}
                >
                  Peça uma visita para reposição, organização ou acompanhamento.
                </div>
              </button>

              <button
                type="button"
                onClick={() => router.push("/portal/maintenance")}
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 16,
                  padding: 20,
                  background: theme.isDark ? "#111827" : "#ffffff",
                  color: theme.text,
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
                  Manutenção
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: muted,
                  }}
                >
                  Solicite correção, troca, coleta ou manutenção do expositor.
                </div>
              </button>
            </div>
          </Section>
        </div>

        <Section
          title="Informações do expositor"
          subtitle="Visualize expositores vinculados, produtos instalados e histórico de manutenção."
          theme={theme}
        >
          {!client?.exhibitors?.length ? (
            <div
              style={{
                padding: 18,
                borderRadius: 14,
                border: `1px solid ${theme.border}`,
                background: theme.isDark ? "#111827" : "#f8fafc",
                color: muted,
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
                    border: `1px solid ${theme.border}`,
                    borderRadius: 16,
                    padding: 18,
                    background: theme.isDark ? "#111827" : "#f8fafc",
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
                          color: theme.text,
                        }}
                      >
                        {exhibitor.name || exhibitor.code || "Expositor"}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
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
                        border: `1px solid ${theme.border}`,
                        background: theme.isDark ? "#0f172a" : "#ffffff",
                        color: theme.primary,
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
                        border: `1px solid ${theme.border}`,
                        borderRadius: 14,
                        background: theme.isDark ? "#0f172a" : "#ffffff",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontSize: 14,
                          fontWeight: 800,
                          color: theme.text,
                          background: theme.isDark ? "#111827" : "#f8fafc",
                        }}
                      >
                        Produtos no expositor
                      </div>

                      {exhibitor.products.length === 0 ? (
                        <div
                          style={{
                            padding: 14,
                            color: muted,
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
                                borderTop: `1px solid ${theme.isDark ? "#1f2937" : "#f1f5f9"}`,
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: theme.text,
                                  }}
                                >
                                  {item.product.name}
                                </div>

                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: 12,
                                    color: muted,
                                  }}
                                >
                                  SKU: {item.product.sku || "-"}
                                </div>
                              </div>

                              <div>
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: muted,
                                    marginBottom: 4,
                                  }}
                                >
                                  Quantidade
                                </div>
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: theme.text,
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
                        border: `1px solid ${theme.border}`,
                        borderRadius: 14,
                        background: theme.isDark ? "#0f172a" : "#ffffff",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 14px",
                          borderBottom: `1px solid ${theme.border}`,
                          fontSize: 14,
                          fontWeight: 800,
                          color: theme.text,
                          background: theme.isDark ? "#111827" : "#f8fafc",
                        }}
                      >
                        Histórico de manutenção
                      </div>

                      {exhibitor.maintenances.length === 0 ? (
                        <div
                          style={{
                            padding: 14,
                            color: muted,
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
                                borderTop: `1px solid ${theme.isDark ? "#1f2937" : "#f1f5f9"}`,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: theme.text,
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
                                    color: theme.text,
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
                                    color: theme.text,
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
                                    color: muted,
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
        </Section>
      </div>
    </div>
  );
}