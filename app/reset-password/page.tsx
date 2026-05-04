"use client";

import { Suspense, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtle = theme.isDark ? "#111827" : "#f8fafc";

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error("Link inválido ou expirado.");
      }

      if (password.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
      }

      if (password !== confirmPassword) {
        throw new Error("As senhas não conferem.");
      }

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao redefinir senha.");
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: theme.text,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 460,
          border: `1px solid ${border}`,
          borderRadius: 18,
          padding: 28,
          background: cardBg,
          boxShadow: theme.isDark
            ? "0 10px 30px rgba(2,6,23,0.35)"
            : "0 8px 24px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 6 }}>
            Criar nova senha
          </div>
          <div style={{ fontSize: 14, color: muted, lineHeight: 1.55 }}>
            Digite e confirme sua nova senha de acesso.
          </div>
        </div>

        {success ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #bbf7d0",
                background: theme.isDark ? "rgba(20,83,45,0.22)" : "#f0fdf4",
                color: theme.isDark ? "#86efac" : "#15803d",
                padding: 12,
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.45,
              }}
            >
              Senha alterada com sucesso. Agora você já pode entrar com a nova senha.
            </div>
            <Link
              href="/login"
              style={{
                height: 46,
                borderRadius: 12,
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Nova senha
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  style={{ ...inputStyle, paddingRight: 96 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    height: 32,
                    padding: "0 10px",
                    borderRadius: 10,
                    border: `1px solid ${border}`,
                    background: subtle,
                    color: theme.text,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Ocultar" : "Ver senha"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Confirmar senha
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                style={inputStyle}
                autoComplete="new-password"
              />
            </div>

            {error ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #fecaca",
                  background: theme.isDark ? "rgba(127,29,29,0.18)" : "#fef2f2",
                  color: "#dc2626",
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                height: 46,
                borderRadius: 12,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
