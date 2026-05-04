"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function formatPhoneBR(value: string) {
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (!v) return "";
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return v.replace(/^(\d{2})(\d+)/, "($1) $2");
  if (v.length <= 10) return v.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
  return v.replace(/^(\d{2})(\d{5})(\d+)/, "($1) $2-$3");
}

export default function EditSettingsUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [active, setActive] = useState(true);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/settings/users/${id}`, {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Não foi possível carregar o usuário.");
        }

        setName(json?.user?.name ?? "");
        setEmail(json?.user?.email ?? "");
        setPhone(formatPhoneBR(json?.user?.phone ?? ""));
        setActive(Boolean(json?.user?.active));
        setRole(json?.user?.role ?? "");
      } catch (err: any) {
        setError(err?.message || "Não foi possível carregar o usuário.");
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/settings/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.replace(/\D/g, "") || null,
          active,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível salvar o usuário.");
      }

      setSuccess("Usuário atualizado com sucesso.");
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        padding: 28,
        background: theme.pageBg,
        color: theme.text,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 24,
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
            ⚙️ / Configurações / Usuários e acessos
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Editar usuário
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            Atualize os dados do usuário selecionado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings/access")}
          style={secondaryButtonStyle(theme)}
        >
          Voltar
        </button>
      </div>

      <div
        style={{
          maxWidth: 620,
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          padding: 20,
        }}
      >
        {loading ? (
          <div style={{ color: theme.subtext }}>Carregando usuário...</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {error ? <MessageBox theme={theme} type="error" text={error} /> : null}
            {success ? <MessageBox theme={theme} type="success" text={success} /> : null}

            <div>
              <label style={labelStyle(theme)}>Tipo</label>
              <input style={inputStyle(theme)} value={labelRole(role)} disabled />
            </div>

            <div>
              <label style={labelStyle(theme)}>Nome completo *</label>
              <input
                style={inputStyle(theme)}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle(theme)}>E-mail *</label>
              <input
                type="email"
                style={inputStyle(theme)}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle(theme)}>WhatsApp</label>
              <input
                type="tel"
                style={inputStyle(theme)}
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 800,
                color: theme.text,
              }}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Usuário ativo
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                style={primaryButtonStyle()}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/settings/access")}
                style={secondaryButtonStyle(theme)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function labelRole(role: string) {
  if (role === "ADMIN") return "Admin";
  if (role === "REPRESENTATIVE") return "Representante";
  if (role === "ADMINISTRATIVE") return "Financeiro";
  return role || "-";
}

function labelStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    display: "block",
    fontSize: 13,
    fontWeight: 800,
    color: theme.subtext,
    marginBottom: 6,
  };
}

function inputStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    padding: "0 12px",
    outline: "none",
    fontSize: 14,
    boxSizing: "border-box",
  };
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "0 16px",
    height: 42,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function secondaryButtonStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    background: theme.cardBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    padding: "0 16px",
    height: 42,
    fontWeight: 800,
    cursor: "pointer",
  };
}

function MessageBox({
  type,
  text,
  theme,
}: {
  type: "error" | "success";
  text: string;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const isError = type === "error";

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        border: isError
          ? theme.isDark
            ? "1px solid rgba(248,113,113,0.35)"
            : "1px solid #fecaca"
          : theme.isDark
            ? "1px solid rgba(74,222,128,0.35)"
            : "1px solid #bbf7d0",
        background: isError
          ? theme.isDark
            ? "rgba(127,29,29,0.25)"
            : "#fef2f2"
          : theme.isDark
            ? "rgba(20,83,45,0.25)"
            : "#f0fdf4",
        color: isError
          ? theme.isDark
            ? "#fecaca"
            : "#b91c1c"
          : theme.isDark
            ? "#bbf7d0"
            : "#166534",
      }}
    >
      {text}
    </div>
  );
}
