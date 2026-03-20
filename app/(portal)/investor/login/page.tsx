"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function InvestorLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const mobile = useMemo(() => searchParams.get("m") === "1", [searchParams]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao entrar.");
      }

      router.push(mobile ? "/m/investor" : "/investor");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
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
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          border: `1px solid ${border}`,
          borderRadius: 20,
          background: cardBg,
          padding: 24,
          color: theme.text,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
          Portal do Investidor
        </div>

        <div
          style={{
            color: theme.subtext,
            marginBottom: 20,
          }}
        >
          Entre com seu e-mail e senha.
        </div>

        {mobile ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 12,
              padding: 10,
              border: `1px solid ${border}`,
              background: theme.isDark ? "#111827" : "#eff6ff",
              color: theme.primary,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Versão mobile ativa
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ef4444",
              color: "#ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              E-mail
            </div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Digite seu e-mail"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Senha
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              style={{
                width: "100%",
                height: 46,
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: cardBg,
                color: theme.text,
                padding: "0 14px",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              height: 46,
              borderRadius: 12,
              border: "none",
              background: "#2563eb",
              color: "#ffffff",
              fontWeight: 900,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: 6,
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}