"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, Eye, EyeOff } from "lucide-react";
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

export default function NewAdminUserPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/settings/users/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.replace(/\D/g, "") || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Erro ao criar usuário.");
        return;
      }

      router.push("/settings/access");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    fontSize: 14,
    color: theme.text,
    background: theme.inputBg,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: theme.subtext,
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: "100%",
        background: theme.pageBg,
        color: theme.text,
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <button
          onClick={() => router.push("/settings/users/new")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: theme.subtext,
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 24,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div
          style={{
            background: theme.cardBg,
            borderRadius: 16,
            border: `1px solid ${theme.border}`,
            padding: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: theme.isDark
                  ? "rgba(124,58,237,0.18)"
                  : "#f3ebff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={20} color="#7c3aed" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: theme.text }}>
                Novo Administrador
              </div>
              <div style={{ fontSize: 13, color: theme.subtext, marginTop: 2 }}>
                Acesso completo ao CRM e configurações
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: theme.isDark ? "rgba(127,29,29,0.25)" : "#fef2f2",
                border: theme.isDark
                  ? "1px solid rgba(248,113,113,0.35)"
                  : "1px solid #fecaca",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                color: theme.isDark ? "#fecaca" : "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Nome completo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Administrador"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>E-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                WhatsApp{" "}
                <span style={{ fontWeight: 400, color: theme.subtext }}>
                  — opcional
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                placeholder="(00) 00000-0000"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Senha *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{ ...inputStyle, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: theme.subtext,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "12px 0",
                borderRadius: 10,
                background: loading ? "#c4b5fd" : "#7c3aed",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 15,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background .15s ease",
              }}
            >
              {loading ? "Criando..." : "Criar Administrador"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
