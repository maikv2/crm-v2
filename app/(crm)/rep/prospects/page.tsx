"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "REPRESENTATIVE" | "INVESTOR" | string;
  regionId?: string | null;
};

type Prospect = {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status: "PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED";
  createdAt: string;
  updatedAt: string;
  region?: { id: string; name: string } | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

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
  variant?: "default" | "primary";
}) {
  const [hover, setHover] = useState(false);
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
        background:
          variant === "primary"
            ? hover ? "#1d4ed8" : "#2563eb"
            : hover ? theme.primary : theme.cardBg,
        color: variant === "primary" ? "#ffffff" : hover ? "#ffffff" : theme.text,
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
  const blockBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const blockBorder = theme.isDark ? "#1e293b" : theme.border;
  return (
    <div
      style={{
        background: blockBg,
        border: `1px solid ${blockBorder}`,
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

export default function RepresentativeProspectsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [user, setUser] = useState<LoggedUser | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadProspects(currentUser?: LoggedUser | null) {
    const activeUser = currentUser ?? user;
    if (!activeUser?.regionId) {
      setProspects([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const query = new URLSearchParams({
        regionId: activeUser.regionId,
        representativeId: activeUser.id,
      });
      const res = await fetch(`/api/prospects?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar prospectos");
      setProspects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json();
        const currentUser = json?.user ?? null;
        if (!active) return;
        setUser(currentUser);
        await loadProspects(currentUser);
      } catch (error) {
        console.error(error);
        if (active) {
          setUser(null);
          setLoading(false);
        }
      }
    }
    loadUser();
    return () => { active = false; };
  }, []);

  const filteredProspects = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return prospects;
    return prospects.filter((prospect) =>
      [
        prospect.name, prospect.tradeName, prospect.cnpj,
        prospect.phone, prospect.email, prospect.contactName,
        prospect.city, prospect.state, prospect.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [prospects, search]);

  async function updateStatus(prospectId: string, status: Prospect["status"]) {
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar status");
      await loadProspects(user);
    } catch (error: any) {
      alert(error?.message || "Erro ao atualizar status");
    }
  }

  async function handleConvertToClient(prospect: Prospect) {
    if (!confirm(`Converter "${prospect.tradeName || prospect.name}" em cliente?`)) return;
    await updateStatus(prospect.id, "CONVERTED");
  }

  return (
    <div
      style={{
        color: theme.text,
        background: pageBg,
        minHeight: "100vh",
        width: "100%",
        padding: 24,
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
          <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 10 }}>
            🎯 / Representante / Prospectos
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
            Prospectos
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
            Prospectos da sua região.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton
            label="Atualizar"
            theme={theme}
            onClick={() => loadProspects(user)}
          />
          <ActionButton
            label="+ Novo prospecto"
            theme={theme}
            variant="primary"
            onClick={() => router.push("/rep/prospects/new")}
          />
        </div>
      </div>

      <Block
        title="Prospectos cadastrados"
        theme={theme}
        right={
          <input
            type="text"
            placeholder="Pesquisar prospecto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: 38,
              width: 260,
              borderRadius: 10,
              border: `1px solid ${border}`,
              background: inputBg,
              color: theme.text,
              padding: "0 12px",
              outline: "none",
              fontSize: 13,
            }}
          />
        }
      >
        {loading ? (
          <div style={{ color: muted }}>Carregando...</div>
        ) : filteredProspects.length === 0 ? (
          <div style={{ color: muted }}>Nenhum prospecto encontrado.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredProspects.map((prospect) => {
              const statusColors = getStatusColors(prospect.status, theme.isDark);
              return (
                <div
                  key={prospect.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: subtleCard,
                  }}
                >
                  {/* Cabeçalho do card */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: theme.text }}>
                        {prospect.tradeName || prospect.name}
                      </div>
                      {prospect.tradeName && prospect.name !== prospect.tradeName ? (
                        <div style={{ marginTop: 4, fontSize: 13, color: muted }}>
                          {prospect.name}
                        </div>
                      ) : null}
                    </div>

                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: statusColors.bg,
                        color: statusColors.color,
                        fontSize: 12,
                        fontWeight: 800,
                        height: "fit-content",
                      }}
                    >
                      {getStatusLabel(prospect.status)}
                    </span>
                  </div>

                  {/* Detalhes */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 8,
                      marginBottom: 10,
                      color: muted,
                      fontSize: 14,
                    }}
                  >
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
                      <strong style={{ color: theme.text }}>Atualizado:</strong>{" "}
                      {formatDateBR(prospect.updatedAt)}
                    </div>
                  </div>

                  {prospect.notes ? (
                    <div style={{ marginBottom: 12, color: muted, fontSize: 14 }}>
                      <strong style={{ color: theme.text }}>Observação:</strong>{" "}
                      {prospect.notes}
                    </div>
                  ) : null}

                  {/* Botões de ação */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionButton
                      label="Editar"
                      theme={theme}
                      onClick={() => router.push(`/rep/prospects/${prospect.id}/edit`)}
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
                      onClick={() =>
                        router.push(
                          `/rep/exhibitors/new?prospectId=${prospect.id}&name=${encodeURIComponent(prospect.tradeName || prospect.name)}`
                        )
                      }
                    />
                    <ActionButton
                      label="Marcar voltar"
                      theme={theme}
                      onClick={() => updateStatus(prospect.id, "RETURN")}
                    />
                    <ActionButton
                      label="Marcar não voltar"
                      theme={theme}
                      onClick={() => updateStatus(prospect.id, "NO_RETURN")}
                    />
                    <ActionButton
                      label="Voltar para pendente"
                      theme={theme}
                      onClick={() => updateStatus(prospect.id, "PENDING")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Block>
    </div>
  );
}