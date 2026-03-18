"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type Region = {
  id: string;
  name: string;
};

type Representative = {
  id: string;
  name: string;
  email: string;
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
  region?: {
    id: string;
    name: string;
  } | null;
  representative?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

type ProspectForm = {
  name: string;
  tradeName: string;
  cnpj: string;
  phone: string;
  email: string;
  contactName: string;
  cep: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  notes: string;
  status: "PENDING" | "RETURN" | "NO_RETURN" | "CONVERTED";
  regionId: string;
  representativeId: string;
};

function emptyForm(): ProspectForm {
  return {
    name: "",
    tradeName: "",
    cnpj: "",
    phone: "",
    email: "",
    contactName: "",
    cep: "",
    street: "",
    number: "",
    district: "",
    city: "",
    state: "",
    notes: "",
    status: "PENDING",
    regionId: "",
    representativeId: "",
  };
}

function formatDateBR(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("pt-BR");
}

function getStatusLabel(status: Prospect["status"]) {
  switch (status) {
    case "RETURN":
      return "Voltar";
    case "NO_RETURN":
      return "Não voltar";
    case "CONVERTED":
      return "Convertido";
    case "PENDING":
    default:
      return "Pendente";
  }
}

function getStatusBg(status: Prospect["status"], isDark: boolean) {
  switch (status) {
    case "RETURN":
      return isDark ? "rgba(124,58,237,0.14)" : "#ede9fe";
    case "NO_RETURN":
      return isDark ? "rgba(239,68,68,0.14)" : "#fee2e2";
    case "CONVERTED":
      return isDark ? "rgba(34,197,94,0.14)" : "#dcfce7";
    case "PENDING":
    default:
      return isDark ? "rgba(245,158,11,0.14)" : "#fef3c7";
  }
}

function getStatusColor(status: Prospect["status"]) {
  switch (status) {
    case "RETURN":
      return "#7c3aed";
    case "NO_RETURN":
      return "#dc2626";
    case "CONVERTED":
      return "#16a34a";
    case "PENDING":
    default:
      return "#b45309";
  }
}

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  const buttonBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const buttonBorder = theme.isDark ? "#1e293b" : theme.border;
  const buttonText = theme.isDark ? "#ffffff" : theme.text;

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
        border: `1px solid ${buttonBorder}`,
        background: hover ? "#2563eb" : buttonBg,
        color: hover ? "#ffffff" : buttonText,
        fontWeight: 800,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        boxShadow: theme.isDark ? "0 4px 14px rgba(2,6,23,0.28)" : "none",
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

export default function AdminProspectsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtleCard = theme.isDark ? "#0b1324" : "#f8fafc";
  const border = theme.isDark ? "#1e293b" : theme.border;
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [form, setForm] = useState<ProspectForm>(emptyForm());
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function loadProspects() {
    try {
      setLoading(true);

      const res = await fetch("/api/prospects", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar prospectos");
      }

      setProspects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadRegions() {
    try {
      const res = await fetch("/api/regions", {
        cache: "no-store",
      });

      const data = await res.json();
      setRegions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRegions([]);
    }
  }

  async function loadRepresentatives(regionId: string) {
    if (!regionId) {
      setRepresentatives([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/representatives/by-region?regionId=${regionId}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();
      setRepresentatives(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRepresentatives([]);
    }
  }

  useEffect(() => {
    loadProspects();
    loadRegions();
  }, []);

  useEffect(() => {
    loadRepresentatives(form.regionId);

    setForm((prev) => ({
      ...prev,
      representativeId: "",
    }));
  }, [form.regionId]);

  const filteredProspects = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return prospects;

    return prospects.filter((prospect) =>
      [
        prospect.name,
        prospect.tradeName,
        prospect.cnpj,
        prospect.phone,
        prospect.email,
        prospect.contactName,
        prospect.city,
        prospect.state,
        prospect.notes,
        prospect.region?.name,
        prospect.representative?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [prospects, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.regionId) {
      alert("Selecione uma região.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          representativeId: form.representativeId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao salvar prospecto");
      }

      setForm(emptyForm());
      setRepresentatives([]);
      await loadProspects();
    } catch (error: any) {
      alert(error?.message || "Erro ao salvar prospecto");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    prospectId: string,
    status: Prospect["status"]
  ) {
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao atualizar status");
      }

      await loadProspects();
    } catch (error: any) {
      alert(error?.message || "Erro ao atualizar status");
    }
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
            🎯 / Prospectos
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Prospectos
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: muted,
            }}
          >
            Cadastre prospectos e vincule à região e ao representante.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <ActionButton
            label="Atualizar lista"
            theme={theme}
            onClick={() => loadProspects()}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px minmax(0, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <Block title="Novo prospecto" theme={theme}>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
            <select
              value={form.regionId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, regionId: e.target.value }))
              }
              style={inputStyle(inputBg, theme)}
            >
              <option value="">Selecione a região</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>

            <select
              value={form.representativeId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  representativeId: e.target.value,
                }))
              }
              style={inputStyle(inputBg, theme)}
            >
              <option value="">Sem representante</option>
              {representatives.map((representative) => (
                <option key={representative.id} value={representative.id}>
                  {representative.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Nome do local"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="Nome fantasia"
              value={form.tradeName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tradeName: e.target.value }))
              }
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="CNPJ"
              value={form.cnpj}
              onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="Telefone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="Responsável"
              value={form.contactName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactName: e.target.value }))
              }
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="CEP"
              value={form.cep}
              onChange={(e) => setForm((prev) => ({ ...prev, cep: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <input
              placeholder="Rua"
              value={form.street}
              onChange={(e) => setForm((prev) => ({ ...prev, street: e.target.value }))}
              style={inputStyle(inputBg, theme)}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px minmax(0, 1fr)",
                gap: 10,
              }}
            >
              <input
                placeholder="Número"
                value={form.number}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, number: e.target.value }))
                }
                style={inputStyle(inputBg, theme)}
              />

              <input
                placeholder="Bairro"
                value={form.district}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, district: e.target.value }))
                }
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 90px",
                gap: 10,
              }}
            >
              <input
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                style={inputStyle(inputBg, theme)}
              />

              <input
                placeholder="UF"
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                style={inputStyle(inputBg, theme)}
              />
            </div>

            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as Prospect["status"],
                }))
              }
              style={inputStyle(inputBg, theme)}
            >
              <option value="PENDING">Pendente</option>
              <option value="RETURN">Voltar</option>
              <option value="NO_RETURN">Não voltar</option>
              <option value="CONVERTED">Convertido</option>
            </select>

            <textarea
              placeholder="Observação da visita"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              style={{
                ...inputStyle(inputBg, theme),
                minHeight: 110,
                paddingTop: 12,
                resize: "vertical",
              }}
            />

            <button
              type="submit"
              disabled={saving}
              style={{
                height: 42,
                borderRadius: 12,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {saving ? "Salvando..." : "Salvar prospecto"}
            </button>
          </form>
        </Block>

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
                ...inputStyle(inputBg, theme),
                width: 260,
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
              {filteredProspects.map((prospect) => (
                <div
                  key={prospect.id}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: 14,
                    padding: 16,
                    background: subtleCard,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {prospect.tradeName || prospect.name}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: muted,
                        }}
                      >
                        {prospect.name}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: getStatusBg(prospect.status, theme.isDark),
                        color: getStatusColor(prospect.status),
                        fontSize: 12,
                        fontWeight: 800,
                        height: "fit-content",
                      }}
                    >
                      {getStatusLabel(prospect.status)}
                    </div>
                  </div>

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

                    <div>
                      <strong style={{ color: theme.text }}>Região:</strong>{" "}
                      {prospect.region?.name || "-"}
                    </div>

                    <div>
                      <strong style={{ color: theme.text }}>Representante:</strong>{" "}
                      {prospect.representative?.name || "-"}
                    </div>
                  </div>

                  <div
                    style={{
                      marginBottom: 12,
                      color: muted,
                      fontSize: 14,
                    }}
                  >
                    <strong style={{ color: theme.text }}>Observação:</strong>{" "}
                    {prospect.notes || "-"}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => updateStatus(prospect.id, "RETURN")}
                      style={secondaryButtonStyle(theme)}
                    >
                      Marcar voltar
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(prospect.id, "NO_RETURN")}
                      style={secondaryButtonStyle(theme)}
                    >
                      Marcar não voltar
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(prospect.id, "CONVERTED")}
                      style={secondaryButtonStyle(theme)}
                    >
                      Marcar convertido
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(prospect.id, "PENDING")}
                      style={secondaryButtonStyle(theme)}
                    >
                      Voltar para pendente
                    </button>
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

function inputStyle(inputBg: string, theme: ThemeShape): React.CSSProperties {
  return {
    height: 42,
    width: "100%",
    borderRadius: 10,
    border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
    background: inputBg,
    color: theme.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
  };
}

function secondaryButtonStyle(theme: ThemeShape): React.CSSProperties {
  return {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme.isDark ? "#1e293b" : theme.border}`,
    background: theme.isDark ? "#0f172a" : "#ffffff",
    color: theme.text,
    fontWeight: 700,
    cursor: "pointer",
  };
}