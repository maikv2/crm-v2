"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type Region = {
  id: string;
  name: string;
};

type Prospect = {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status: "PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED";
  updatedAt: string;
  region?: { id: string; name: string } | null;
  representative?: { id: string; name: string; email: string } | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function getStatusLabel(status: Prospect["status"]) {
  switch (status) {
    case "RETURN": return "Voltar";
    case "NO_RETURN": return "Não voltar";
    case "CONVERTED": return "Convertido";
    default: return "Pendente";
  }
}

function getStatusColors(status: Prospect["status"], isDark: boolean) {
  switch (status) {
    case "RETURN":
      return { bg: isDark ? "rgba(124,58,237,0.14)" : "#ede9fe", color: "#7c3aed" };
    case "NO_RETURN":
      return { bg: isDark ? "rgba(239,68,68,0.14)" : "#fee2e2", color: "#dc2626" };
    case "CONVERTED":
      return { bg: isDark ? "rgba(34,197,94,0.14)" : "#dcfce7", color: "#16a34a" };
    default:
      return { bg: isDark ? "rgba(245,158,11,0.14)" : "#fef3c7", color: "#b45309" };
  }
}

function ActionButton({
  label,
  theme,
  onClick,
  variant = "default",
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger";
}) {
  const [hover, setHover] = useState(false);

  const bg = () => {
    if (variant === "primary") return hover ? "#1d4ed8" : "#2563eb";
    if (variant === "danger") return hover ? "#b91c1c" : "#ef4444";
    return hover ? theme.primary : theme.cardBg;
  };

  const color = () => {
    if (variant === "primary" || variant === "danger") return "#ffffff";
    return hover ? "#ffffff" : theme.text;
  };

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
        border: variant === "default" ? `1px solid ${theme.border}` : "none",
        background: bg(),
        color: color(),
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
        <div style={{ fontSize: 18, fontWeight: 800, color: theme.text }}>
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function AdminProspectsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [converting, setConverting] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const [prospectsRes, regionsRes] = await Promise.all([
        fetch("/api/prospects", { cache: "no-store" }),
        fetch("/api/regions", { cache: "no-store" }),
      ]);
      const prospectsData = await prospectsRes.json();
      const regionsData = await regionsRes.json();

      setProspects(Array.isArray(prospectsData) ? prospectsData : []);
      const regionList = Array.isArray(regionsData)
        ? regionsData
        : Array.isArray(regionsData?.items)
        ? regionsData.items
        : [];
      setRegions(regionList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return prospects.filter((p) => {
      const regionOk =
        regionFilter === "ALL" || p.region?.id === regionFilter;
      if (!regionOk) return false;
      if (!term) return true;
      return [
        p.name, p.tradeName, p.cnpj, p.phone,
        p.email, p.contactName, p.city, p.state,
        p.region?.name, p.representative?.name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [prospects, search, regionFilter]);

  async function handleConvertToClient(prospect: Prospect) {
    if (!confirm(`Converter "${prospect.tradeName || prospect.name}" em cliente?`)) return;
    try {
      setConverting(prospect.id);
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTED" }),
      });
      if (!res.ok) throw new Error("Erro ao converter");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erro ao converter prospecto");
    } finally {
      setConverting(null);
    }
  }

  async function handleAddExhibitor(prospect: Prospect) {
    router.push(
      `/exhibitors/new?prospectId=${prospect.id}&name=${encodeURIComponent(
        prospect.tradeName || prospect.name
      )}`
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
      {/* Header */}
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
            🎯 / Prospectos
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
            Prospectos
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
            Gerencie os prospectos cadastrados por região e representante.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ActionButton
            label="Atualizar"
            theme={theme}
            onClick={loadData}
          />
          <ActionButton
            label="+ Novo prospecto"
            theme={theme}
            variant="primary"
            onClick={() => router.push("/prospects/new")}
          />
        </div>
      </div>

      <Block
        title="Lista de prospectos"
        theme={theme}
        right={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {/* Filtro por região */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              style={{
                height: 38,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: inputBg,
                color: theme.text,
                padding: "0 10px",
                outline: "none",
                fontSize: 13,
              }}
            >
              <option value="ALL">Todas as regiões</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Pesquisa */}
            <input
              type="text"
              placeholder="Pesquisar prospecto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                height: 38,
                width: 240,
                borderRadius: 10,
                border: `1px solid ${theme.border}`,
                background: inputBg,
                color: theme.text,
                padding: "0 12px",
                outline: "none",
                fontSize: 13,
              }}
            />
          </div>
        }
      >
        {loading ? (
          <div style={{ color: theme.subtext }}>Carregando prospectos...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: theme.subtext }}>Nenhum prospecto encontrado.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((prospect) => {
              const statusColors = getStatusColors(prospect.status, theme.isDark);
              const displayName = prospect.tradeName || prospect.name;

              return (
                <div
                  key={prospect.id}
                  style={{
                    background: subtleCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Nome e status */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {displayName}
                      </div>
                      {prospect.tradeName && prospect.name !== prospect.tradeName ? (
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 13,
                            color: theme.subtext,
                          }}
                        >
                          {prospect.name}
                        </div>
                      ) : null}
                    </div>

                    {/* Badge status + botões */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: statusColors.bg,
                          color: statusColors.color,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {getStatusLabel(prospect.status)}
                      </span>

                      <ActionButton
                        label="Editar"
                        theme={theme}
                        onClick={() => router.push(`/prospects/${prospect.id}/edit`)}
                      />
                      <ActionButton
                        label="Tornar cliente"
                        theme={theme}
                        variant="primary"
                        onClick={() => handleConvertToClient(prospect)}
                      />
                      <ActionButton
                        label="Levar expositor"
                        theme={theme}
                        onClick={() => handleAddExhibitor(prospect)}
                      />
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 8,
                      fontSize: 13,
                      color: theme.subtext,
                    }}
                  >
                    <div>
                      <strong style={{ color: theme.text }}>Região:</strong>{" "}
                      {prospect.region?.name || "-"}
                    </div>
                    <div>
                      <strong style={{ color: theme.text }}>Representante:</strong>{" "}
                      {prospect.representative?.name || "-"}
                    </div>
                    <div>
                      <strong style={{ color: theme.text }}>Contato:</strong>{" "}
                      {prospect.contactName || "-"}
                    </div>
                    <div>
                      <strong style={{ color: theme.text }}>Telefone:</strong>{" "}
                      {prospect.phone || "-"}
                    </div>
                    <div>
                      <strong style={{ color: theme.text }}>Cidade:</strong>{" "}
                      {prospect.city || "-"} / {prospect.state || "-"}
                    </div>
                    <div>
                      <strong style={{ color: theme.text }}>E-mail:</strong>{" "}
                      {prospect.email || "-"}
                    </div>
                  </div>

                  {prospect.notes ? (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: theme.subtext,
                      }}
                    >
                      <strong style={{ color: theme.text }}>Observação:</strong>{" "}
                      {prospect.notes}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Block>
    </div>
  );
}