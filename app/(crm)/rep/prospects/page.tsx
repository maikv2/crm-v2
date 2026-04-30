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
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  city?: string | null;
  state?: string | null;
  status: "PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED";
  createdAt: string;
  updatedAt: string;
  region?: { id: string; name: string } | null;
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

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export default function RepresentativeProspectsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const headerBg = theme.isDark ? "#0b1324" : "#f1f5f9";
  const rowHover = theme.isDark ? "#0f1a2e" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;

  const [user, setUser] = useState<LoggedUser | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return prospects;
    return prospects.filter((p) =>
      [p.name, p.tradeName, p.phone, p.email, p.contactName, p.city, p.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [prospects, search]);

  async function handleConvert(prospect: Prospect) {
    if (!confirm(`Converter "${prospect.tradeName || prospect.name}" em cliente?`)) return;
    try {
      const res = await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONVERTED" }),
      });
      if (!res.ok) throw new Error("Erro ao converter");
      await loadProspects(user);
    } catch (err: any) {
      alert(err?.message || "Erro ao converter prospecto");
    }
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
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.subtext, marginBottom: 10 }}>
            🎯 / Representante / Prospectos
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>
            Prospectos
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
            Prospectos da sua região.
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/rep/prospects/new")}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 12,
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + Novo prospecto
        </button>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: theme.isDark
            ? "0 10px 30px rgba(2,6,23,0.35)"
            : "0 8px 24px rgba(15,23,42,0.06)",
        }}
      >
        {/* Barra de filtros */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            borderBottom: `1px solid ${border}`,
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Pesquisar prospecto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: 36,
              flex: 1,
              minWidth: 200,
              maxWidth: 320,
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: inputBg,
              color: theme.text,
              padding: "0 12px",
              outline: "none",
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={() => loadProspects(user)}
            style={{
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              border: `1px solid ${border}`,
              background: "transparent",
              color: theme.text,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Atualizar
          </button>
          <div style={{ marginLeft: "auto", fontSize: 13, color: theme.subtext, fontWeight: 600 }}>
            {filtered.length} prospecto(s)
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 160px 120px 220px",
            padding: "10px 20px",
            background: headerBg,
            borderBottom: `1px solid ${border}`,
            fontSize: 12,
            fontWeight: 700,
            color: theme.subtext,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <div>DATA</div>
          <div>PROSPECTO</div>
          <div>REGIÃO</div>
          <div>STATUS</div>
          <div>AÇÕES</div>
        </div>

        {/* Linhas */}
        {loading ? (
          <div style={{ padding: "24px 20px", color: theme.subtext, fontSize: 14 }}>
            Carregando prospectos...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "24px 20px", color: theme.subtext, fontSize: 14 }}>
            Nenhum prospecto encontrado.
          </div>
        ) : (
          filtered.map((prospect) => {
            const statusColors = getStatusColors(prospect.status, theme.isDark);
            const isHovered = hoveredRow === prospect.id;

            return (
              <div
                key={prospect.id}
                onMouseEnter={() => setHoveredRow(prospect.id)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 160px 120px 220px",
                  padding: "12px 20px",
                  borderBottom: `1px solid ${border}`,
                  background: isHovered ? rowHover : "transparent",
                  transition: "background 0.1s ease",
                  alignItems: "center",
                }}
              >
                {/* Data */}
                <div style={{ fontSize: 13, color: theme.subtext }}>
                  {formatDateBR(prospect.updatedAt)}
                </div>

                {/* Prospecto */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>
                    {prospect.tradeName || prospect.name}
                  </div>
                  {prospect.tradeName && prospect.name !== prospect.tradeName ? (
                    <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
                      {prospect.name}
                    </div>
                  ) : null}
                  {prospect.city ? (
                    <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
                      {prospect.city}{prospect.state ? `/${prospect.state}` : ""}
                    </div>
                  ) : null}
                </div>

                {/* Região */}
                <div style={{ fontSize: 13, color: theme.subtext }}>
                  {prospect.region?.name || "-"}
                </div>

                {/* Status */}
                <div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: statusColors.bg,
                      color: statusColors.color,
                      fontSize: 11,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getStatusLabel(prospect.status)}
                  </span>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/rep/prospects/${prospect.id}/edit`)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: "transparent",
                      color: theme.text,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/rep/prospects/${prospect.id}/edit`)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: "transparent",
                      color: theme.text,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConvert(prospect)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 8,
                      border: "none",
                      background: "#2563eb",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Tornar cliente
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}