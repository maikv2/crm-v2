"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
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

function getLoginEndpoint(access: AccessType) {
  if (access === "CLIENT") return "/api/portal-auth/login";
  if (access === "INVESTOR") return "/api/investor-auth/login";
  return "/api/auth/login";
}

function buildPayload(
  access: AccessType,
  identifier: string,
  password: string,
  remember: boolean
) {
  if (access === "CLIENT" || access === "INVESTOR") {
    return {
      username: identifier,
      password,
      remember,
    };
  }

  return {
  access: "CRM",
  username: identifier,
  password,
  remember,
};
}

function getDefaultDestination(access: AccessType) {
  if (access === "CLIENT") return "/portal";
  if (access === "INVESTOR") return "/investor";
  return "/choose/crm";
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
  const [remember, setRemember] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const redirectParam = searchParams.get("redirect");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crm-v2-login-preferences");
      if (!saved) return;

      const parsed = JSON.parse(saved) as {
        access?: AccessType;
        identifier?: string;
        remember?: boolean;
      };

      if (
        parsed.access === "CRM" ||
        parsed.access === "CLIENT" ||
        parsed.access === "INVESTOR"
      ) {
        setAccess(parsed.access);
      }

      if (typeof parsed.identifier === "string") {
        setIdentifier(parsed.identifier);
      }

      if (typeof parsed.remember === "boolean") {
        setRemember(parsed.remember);
      }
    } catch {
      window.localStorage.removeItem("crm-v2-login-preferences");
    }
  }, []);

  useEffect(() => {
    let activeCheck = true;

    async function checkExistingSession() {
      try {
        if (access !== "CRM") return;

        const res = await fetch("/api/auth/me", { cache: "no-store" });

        if (!activeCheck || !res.ok) return;

        const json = await res.json().catch(() => null);

        if (json?.user?.id) {
          const destination =
            typeof redirectParam === "string" && redirectParam.startsWith("/")
              ? redirectParam
              : getDefaultDestination(access);

          router.replace(destination);
          router.refresh();
        }
      } finally {
        if (activeCheck) setCheckingSession(false);
      }
    }

    checkExistingSession();

    return () => {
      activeCheck = false;
    };
  }, [access, redirectParam, router]);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const subtle = theme.isDark ? "#111827" : "#f8fafc";

  const identifierLabel = access === "CRM" ? "Usuário" : "Usuário";

  const identifierPlaceholder =
    access === "CLIENT"
      ? "Digite o usuário do cliente"
      : access === "INVESTOR"
        ? "Digite o e-mail do investidor"
        : "Digite seu usuário";

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
      setSuccess(null);

      const endpoint = getLoginEndpoint(access);
      const payload = buildPayload(access, identifier, password, remember);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao realizar login.");
      }

      if (remember) {
        window.localStorage.setItem(
          "crm-v2-login-preferences",
          JSON.stringify({
            access,
            identifier,
            remember: true,
          })
        );
      } else {
        window.localStorage.removeItem("crm-v2-login-preferences");
      }

      const destination =
        typeof json?.destination === "string" && json.destination.startsWith("/")
          ? json.destination
          : typeof redirectParam === "string" && redirectParam.startsWith("/")
            ? redirectParam
            : getDefaultDestination(access);

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    try {
      setForgotLoading(true);
      setError(null);
      setSuccess(null);

      const cleanIdentifier = identifier.trim();

      if (!cleanIdentifier) {
        throw new Error("Digite seu usuário ou e-mail antes de recuperar a senha.");
      }

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access,
          identifier: cleanIdentifier,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao solicitar recuperação de senha.");
      }

      setSuccess(
        json?.message ||
          "Se houver um e-mail cadastrado para este usuário, enviaremos o link para redefinir a senha."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao solicitar recuperação de senha."
      );
    } finally {
      setForgotLoading(false);
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
          setSuccess(null);
          setIdentifier("");
          setPassword("");

          const params = new URLSearchParams(searchParams.toString());
          params.set("access", value);
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

  if (checkingSession) {
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
          fontWeight: 800,
        }}
      >
        Verificando acesso...
      </div>
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
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={identifierPlaceholder}
              style={inputStyle}
              autoComplete="username"
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Senha
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                style={{ ...inputStyle, paddingRight: 96 }}
                autoComplete="current-password"
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                fontWeight: 700,
                color: theme.text,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              Manter conectado neste aparelho
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={forgotLoading}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: 13,
                fontWeight: 800,
                cursor: forgotLoading ? "not-allowed" : "pointer",
                padding: 0,
                opacity: forgotLoading ? 0.7 : 1,
              }}
            >
              {forgotLoading ? "Enviando..." : "Esqueci minha senha"}
            </button>
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

          {success ? (
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
              {success}
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
