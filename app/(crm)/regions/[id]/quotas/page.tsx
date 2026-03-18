"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

type Quota = {
  number: number;
  type: "COMPANY" | "INVESTOR" | "AVAILABLE";
  owner: string | null;
  shareId: string | null;
  investorId: string | null;
  ownerType: "COMPANY" | "INVESTOR" | null;
  isActive: boolean;
};

type QuotaMapResponse = {
  region: string;
  regionId: string;
  totalQuotaCount: number;
  activeQuotaCount: number;
  companyQuotaCount: number;
  investorQuotaCount: number;
  availableQuotaCount: number;
  quotas: Quota[];
};

function getQuotaColor(type: Quota["type"]) {
  if (type === "COMPANY") return "#2563eb";
  if (type === "INVESTOR") return "#22c55e";
  return "#cbd5e1";
}

function getQuotaLabel(type: Quota["type"]) {
  if (type === "COMPANY") return "Empresa";
  if (type === "INVESTOR") return "Investidor";
  return "Disponível";
}

type SummaryCardProps = {
  title: string;
  value: string | number;
  color?: string;
  subtext?: string;
  colors: ReturnType<typeof getThemeColors>;
};

function SummaryCard({
  title,
  value,
  color,
  subtext,
  colors,
}: SummaryCardProps) {
  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: 18,
        background: colors.isDark ? "#111827" : "#f8fafc",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: colors.subtext,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: color || colors.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>

      {subtext ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: colors.subtext,
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  );
}

function LegendItem({
  color,
  label,
  colors,
}: {
  color: string;
  label: string;
  colors: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 700,
        color: colors.text,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: color,
          border: `1px solid ${colors.border}`,
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export default function RegionQuotaMap() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [region, setRegion] = useState("");
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingShareId, setActionLoadingShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/regions/${params.id}/quota-map`, {
        cache: "no-store",
      });

      const rawText = await res.text();
      const raw = rawText ? JSON.parse(rawText) : null;

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao carregar mapa de cotas.");
      }

      const data = raw as QuotaMapResponse;

      setRegion(data.region || "");
      setQuotas(data.quotas || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar mapa de cotas."
      );
      setRegion("");
      setQuotas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params?.id) {
      load();
    }
  }, [params?.id]);

  const totalQuotas = quotas.length;

  const companyQuotaCount = useMemo(() => {
    return quotas.filter((q) => q.type === "COMPANY").length;
  }, [quotas]);

  const investorQuotaCount = useMemo(() => {
    return quotas.filter((q) => q.type === "INVESTOR").length;
  }, [quotas]);

  const availableQuotaCount = useMemo(() => {
    return quotas.filter((q) => q.type === "AVAILABLE").length;
  }, [quotas]);

  const occupancyPercent = useMemo(() => {
    if (!totalQuotas) return 0;
    return ((totalQuotas - availableQuotaCount) / totalQuotas) * 100;
  }, [totalQuotas, availableQuotaCount]);

  async function handleUnlinkQuota(quota: Quota) {
    if (!quota.shareId) return;

    const confirmed = window.confirm(
      `Deseja desvincular a cota #${quota.number} de ${quota.owner || "este investidor"}?`
    );

    if (!confirmed) return;

    try {
      setActionLoadingShareId(quota.shareId);
      setError(null);

      const res = await fetch(`/api/regions/${params.id}/quota-map`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: quota.shareId,
        }),
      });

      const raw = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(raw?.error || "Erro ao desvincular cota.");
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desvincular cota.");
    } finally {
      setActionLoadingShareId(null);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        color: colors.text,
        background: colors.pageBg,
        minHeight: "100vh",
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
              color: colors.subtext,
              marginBottom: 10,
            }}
          >
            🗺️ / Regiões / Mapa de Cotas
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: colors.text,
            }}
          >
            {loading
              ? "Carregando mapa..."
              : region
              ? `Cotas da Região ${region}`
              : "Mapa de Cotas"}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
            }}
          >
            Visualização das cotas da região, status de ocupação e propriedade.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/investors/assign-quota")}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: "none",
              background: colors.primary,
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Vincular Cotas
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              color: colors.text,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Voltar
          </button>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            border: `1px solid #ef4444`,
            borderRadius: 12,
            padding: 12,
            color: "#ef4444",
            background: colors.isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          title="Total de Cotas"
          value={loading ? "-" : totalQuotas}
          colors={colors}
        />
        <SummaryCard
          title="Cotas da Empresa"
          value={loading ? "-" : companyQuotaCount}
          colors={colors}
          color="#2563eb"
        />
        <SummaryCard
          title="Cotas de Investidores"
          value={loading ? "-" : investorQuotaCount}
          colors={colors}
          color="#22c55e"
        />
        <SummaryCard
          title="Cotas Disponíveis"
          value={loading ? "-" : availableQuotaCount}
          colors={colors}
          color="#64748b"
        />
        <SummaryCard
          title="Ocupação"
          value={loading ? "-" : `${occupancyPercent.toFixed(0)}%`}
          colors={colors}
          subtext="Cotas ocupadas da região"
        />
      </div>

      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 22,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: colors.text,
            marginBottom: 12,
          }}
        >
          Legenda
        </div>

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <LegendItem
            color={getQuotaColor("COMPANY")}
            label="Cota da Empresa"
            colors={colors}
          />
          <LegendItem
            color={getQuotaColor("INVESTOR")}
            label="Cota de Investidor"
            colors={colors}
          />
          <LegendItem
            color={getQuotaColor("AVAILABLE")}
            label="Cota Disponível"
            colors={colors}
          />
        </div>
      </div>

      <div
        style={{
          background: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: 22,
        }}
      >
        {loading ? (
          <div style={{ color: colors.subtext, fontWeight: 700 }}>
            Carregando cotas...
          </div>
        ) : quotas.length === 0 ? (
          <div style={{ color: colors.subtext, fontWeight: 700 }}>
            Nenhuma cota encontrada.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {quotas.map((q) => {
              const canUnlink = q.type === "INVESTOR" && !!q.shareId;
              const isProcessing = actionLoadingShareId === q.shareId;

              return (
                <div
                  key={q.number}
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: colors.isDark ? "#111827" : "#f8fafc",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 18,
                        color: colors.text,
                      }}
                    >
                      Cota #{q.number}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color:
                          q.type === "COMPANY"
                            ? "#2563eb"
                            : q.type === "INVESTOR"
                            ? "#22c55e"
                            : "#64748b",
                        background:
                          q.type === "COMPANY"
                            ? colors.isDark
                              ? "rgba(37,99,235,0.18)"
                              : "#dbeafe"
                            : q.type === "INVESTOR"
                            ? colors.isDark
                              ? "rgba(34,197,94,0.18)"
                              : "#dcfce7"
                            : colors.isDark
                            ? "rgba(148,163,184,0.16)"
                            : "#e2e8f0",
                        padding: "6px 10px",
                        borderRadius: 999,
                      }}
                    >
                      {getQuotaLabel(q.type)}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      borderRadius: 999,
                      background: getQuotaColor(q.type),
                    }}
                  />

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: colors.subtext,
                        marginBottom: 4,
                      }}
                    >
                      Proprietário
                    </div>

                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: colors.text,
                        minHeight: 22,
                      }}
                    >
                      {q.owner || "Livre"}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `1px solid ${colors.border}`,
                      paddingTop: 10,
                      fontSize: 12,
                      color: colors.subtext,
                    }}
                  >
                    {q.type === "AVAILABLE"
                      ? "Esta cota está livre para vinculação."
                      : q.type === "COMPANY"
                      ? "Esta cota está atualmente em posse da empresa."
                      : "Esta cota está vinculada a um investidor."}
                  </div>

                  {canUnlink ? (
                    <button
                      type="button"
                      onClick={() => handleUnlinkQuota(q)}
                      disabled={isProcessing}
                      style={{
                        marginTop: 4,
                        height: 38,
                        borderRadius: 10,
                        border: "none",
                        background: "#ef4444",
                        color: "white",
                        fontWeight: 800,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        opacity: isProcessing ? 0.7 : 1,
                      }}
                    >
                      {isProcessing ? "Desvinculando..." : "Desvincular Cota"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
