"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const redirect = useMemo(() => {
    const value = searchParams.get("redirect")?.trim();

    if (!value) return null;
    if (!value.startsWith("/")) return null;

    return value;
  }, [searchParams]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao realizar login.");
      }

      if (redirect) {
        router.push(redirect);
        return;
      }

      if (json.role === "ADMIN") {
        router.push("/dashboard");
      } else if (json.role === "REPRESENTATIVE") {
        router.push("/rep");
      } else if (json.role === "INVESTOR") {
        router.push("/investor");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

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
          maxWidth: 420,
          border: `1px solid ${border}`,
          borderRadius: 18,
          padding: 28,
          background: cardBg,
          boxShadow: theme.isDark
            ? "0 10px 30px rgba(2,6,23,0.35)"
            : "0 8px 24px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              marginBottom: 6,
            }}
          >
            Acessar CRM
          </div>

          <div
            style={{
              fontSize: 14,
              color: muted,
            }}
          >
            Entre com seu e-mail e senha
          </div>

          {redirect === "/m" ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: theme.primary,
                fontWeight: 700,
              }}
            >
              Você está entrando pela versão mobile.
            </div>
          ) : null}
        </div>

        {error && (
          <div
            style={{
              border: "1px solid #ef4444",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              color: "#ef4444",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${theme.primary}`,
              background: theme.primary,
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}