"use client";

import { Suspense, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AccessType = "CRM" | "CLIENT" | "INVESTOR";

function normalizeAccess(value: string | null): AccessType {
  const raw = String(value || "").toUpperCase().trim();
  if (raw === "CLIENT") return "CLIENT";
  if (raw === "INVESTOR") return "INVESTOR";
  return "CRM";
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const initialAccess = useMemo(
    () => normalizeAccess(searchParams.get("access")),
    [searchParams]
  );

  const [access, setAccess] = useState<AccessType>(initialAccess);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtle = theme.isDark ? "#111827" : "#f8fafc";

  const identifierLabel =
    access === "CLIENT" || access === "INVESTOR" ? "Usuário" : "E-mail";

  const identifierPlaceholder =
    access === "CLIENT"
      ? "Digite o nome/usuário do cliente"
      : access === "INVESTOR"
      ? "Digite o usuário do investidor"
      : "Digite seu e-mail";

  const title =
    access === "CRM"
      ? "CRM V2"
      : access === "CLIENT"
      ? "Portal do Cliente"
      : "Portal do Investidor";

  const subtitle =
    access === "CRM"
      ? "Acesse sua conta para continuar."
      : access === "CLIENT"
      ? "Entre para acessar o portal do cliente."
      : "Entre para acessar o portal do investidor.";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/session/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access,
          identifier,
          password,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao realizar login.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));

      const destination =
        typeof json?.destination === "string" && json.destination.trim()
          ? json.destination
          : access === "CRM"
            ? "/choose/crm"
            : access === "CLIENT"
              ? "/portal"
              : "/investor";

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  function AccessButton({
    value,
    label,
  }: {
    value: AccessType;
    label: string;
  }) {
    const active = access === value;

    return (
      <button
        type="button"
        onClick={() => {
          setAccess(value);
          setError(null);
          setIdentifier("");
          setPassword("");

          const params = new URLSearchParams(searchParams.toString());
          params.set("access", value);
          params.delete("redirect");

          router.replace(`/login?${params.toString()}`);
        }}
        style={{
          height: 40,
          borderRadius: 12,
          border: `1px solid ${active ? "#2563eb" : border}`,
          background: active ? "#2563eb" : subtle,
          color: active ? "#ffffff" : theme.text,
          fontWeight: 800,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
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
            {title}
          </div>

          <div style={{ fontSize: 14, color: muted, lineHeight: 1.55 }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <AccessButton value="CRM" label="CRM" />
          <AccessButton value="CLIENT" label="Cliente" />
          <AccessButton value="INVESTOR" label="Investidor" />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              {identifierLabel}
            </div>
            <input
              type={access === "CRM" ? "email" : "text"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={identifierPlaceholder}
              style={inputStyle}
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