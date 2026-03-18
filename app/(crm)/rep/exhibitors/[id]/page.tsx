"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function getStatusLabel(status?: string | null) {
  switch (status) {
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
      return status || "-";
  }
}

function getStatusColor(status?: string | null) {
  switch (status) {
    case "ACTIVE":
      return "#22c55e";
    case "MAINTENANCE":
      return "#f59e0b";
    case "DAMAGED":
      return "#ef4444";
    case "REMOVED":
      return "#64748b";
    case "INACTIVE":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}

type ExhibitorProductRow = {
  id: string;
  quantity?: number | null;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
  } | null;
};

type ExhibitorMaintenanceRow = {
  id: string;
  status?: string | null;
  createdAt?: string | null;
  notes?: string | null;
};

type ExhibitorDetail = {
  id: string;
  name?: string | null;
  code?: string | null;
  model?: string | null;
  status?: string | null;
  type?: string | null;
  installedAt?: string | null;
  lastVisitAt?: string | null;
  nextVisitAt?: string | null;
  notes?: string | null;
  client?: {
    id: string;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  region?: {
    id: string;
    name?: string | null;
  } | null;
  products?: ExhibitorProductRow[] | null;
  maintenances?: ExhibitorMaintenanceRow[] | null;
};

export default function RepExhibitorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const exhibitorId = params?.id;
  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [item, setItem] = useState<ExhibitorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    if (!exhibitorId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/exhibitors/${exhibitorId}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar expositor.");
      }

      setItem(data as ExhibitorDetail);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao carregar expositor.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [exhibitorId]);

  const productRows = useMemo<ExhibitorProductRow[]>(() => {
    return Array.isArray(item?.products) ? item.products : [];
  }, [item]);

  const maintenanceRows = useMemo<ExhibitorMaintenanceRow[]>(() => {
    return Array.isArray(item?.maintenances) ? item.maintenances : [];
  }, [item]);

  const totalMix = useMemo(() => {
    return productRows.reduce(
      (sum, current) => sum + Number(current.quantity ?? 0),
      0
    );
  }, [productRows]);

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
        Carregando expositor...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div style={{ ...card, border: "1px solid #ef4444" }}>{error}</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div style={card}>Expositor não encontrado.</div>
      </div>
    );
  }

  const statusColor = getStatusColor(item.status);

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
              Expositores / Detalhes
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              {item.name || item.code || "Expositor"}
            </h1>

            <div style={{ color: muted, marginTop: 8 }}>
              Cliente: {item.client?.name ?? "-"} • Região: {item.region?.name ?? "-"}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={btnSecondary}
              onClick={() =>
                item.client?.id
                  ? router.push(`/rep/exhibitors?clientId=${item.client.id}`)
                  : router.push("/rep/exhibitors")
              }
            >
              Voltar
            </button>

            <button
              style={btnPrimary}
              onClick={() => router.push(`/rep/exhibitors/${item.id}/return`)}
            >
              Registrar devolução
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>Status</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: statusColor }}>
              {getStatusLabel(item.status)}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>Tipo</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{item.type || "-"}</div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>Mix atual</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{totalMix} item(ns)</div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: muted, marginBottom: 6 }}>Código</div>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{item.code || "-"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Dados do expositor
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                color: muted,
              }}
            >
              <div>
                <strong style={{ color: theme.text }}>Nome:</strong> {item.name || "-"}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Modelo:</strong> {item.model || "-"}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Instalado em:</strong> {formatDateBR(item.installedAt)}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Última visita:</strong> {formatDateBR(item.lastVisitAt)}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Próxima visita:</strong> {formatDateBR(item.nextVisitAt)}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Observações:</strong> {item.notes || "-"}
              </div>
            </div>
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Cliente vinculado
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                color: muted,
              }}
            >
              <div>
                <strong style={{ color: theme.text }}>Cliente:</strong> {item.client?.name || "-"}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Cidade:</strong>{" "}
                {[item.client?.city, item.client?.state].filter(Boolean).join(" / ") || "-"}
              </div>
              <div>
                <strong style={{ color: theme.text }}>Telefone:</strong> {item.client?.phone || "-"}
              </div>
              <div>
                <strong style={{ color: theme.text }}>E-mail:</strong> {item.client?.email || "-"}
              </div>
            </div>
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Produtos no expositor
            </h2>

            {productRows.length === 0 ? (
              <div style={{ color: muted }}>Nenhum item informado no expositor.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {productRows.map((productRow) => (
                  <div
                    key={productRow.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: subtleCard,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {productRow.product?.name || "Produto"}
                      </div>
                      <div style={{ color: muted, marginTop: 4 }}>
                        SKU: {productRow.product?.sku || "-"}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800 }}>
                      Quantidade: {Number(productRow.quantity ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>
              Histórico recente de manutenção
            </h2>

            {maintenanceRows.length === 0 ? (
              <div style={{ color: muted }}>Nenhuma manutenção registrada.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {maintenanceRows.slice(0, 5).map((maintenance) => (
                  <div
                    key={maintenance.id}
                    style={{
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: 12,
                      background: subtleCard,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {maintenance.status || "-"}
                      </div>
                      <div style={{ color: muted }}>
                        {formatDateBR(maintenance.createdAt)}
                      </div>
                    </div>

                    <div style={{ color: muted }}>
                      {maintenance.notes || "Sem observações."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}