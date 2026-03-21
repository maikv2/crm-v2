"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function resolveDefaultRouteByRole(role: string, prefersMobile: boolean) {
  if (role === "ADMIN") {
    return prefersMobile ? "/m/admin" : "/dashboard";
  }

  if (role === "REPRESENTATIVE") {
    return prefersMobile ? "/m/rep" : "/rep";
  }

  if (role === "INVESTOR") {
    return prefersMobile ? "/m/investor" : "/investor";
  }

  return prefersMobile ? "/m/admin" : "/dashboard";
}

function LoginPageContent() {
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

  const forceMobileParam = useMemo(() => {
    return searchParams.get("m") === "1";
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

      let prefersMobile = forceMobileParam;

      try {
        const savedMode = localStorage.getItem("v2_view_mode");

        if (savedMode === "mobile") {
          prefersMobile = true;
        } else if (savedMode === "desktop") {
          prefersMobile = false;
        } else if (window.matchMedia("(max-width: 900px)").matches) {
          prefersMobile = true;
        }
      } catch (err) {
        console.error(err);
      }

      router.push(resolveDefaultRouteByRole(json.role, prefersMobile));
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
            CRM V2
          </div>

          <div
            style={{
              fontSize: 14,
              color: muted,
              lineHeight: 1.55,
            }}
          >
            Acesse sua conta para continuar.
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              E-mail
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Senha
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              style={inputStyle}
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}