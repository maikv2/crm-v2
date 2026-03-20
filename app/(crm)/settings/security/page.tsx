"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

export default function SettingsSecurityPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setPageError(null);
      setPageSuccess(null);

      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("Preencha todos os campos.");
      }

      if (newPassword.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("A confirmação da nova senha não confere.");
      }

      const res = await fetch("/api/settings/access/admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível alterar a senha.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPageSuccess("Senha alterada com sucesso.");
    } catch (err: any) {
      setPageError(err?.message || "Não foi possível alterar a senha.");
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
            ⚙️ / Configurações / Segurança
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Segurança e senhas
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            Altere a senha do administrador logado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/settings")}
          style={secondaryButtonStyle(theme)}
        >
          Voltar
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          padding: 20,
          display: "grid",
          gap: 16,
          maxWidth: 720,
        }}
      >
        <Field label="Senha atual" theme={theme}>
          <input
            type="password"
            style={inputStyle(theme)}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>

        <Field label="Nova senha" theme={theme}>
          <input
            type="password"
            style={inputStyle(theme)}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirmar nova senha" theme={theme}>
          <input
            type="password"
            style={inputStyle(theme)}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        {pageError ? <MessageBox theme={theme} type="error" text={pageError} /> : null}
        {pageSuccess ? <MessageBox theme={theme} type="success" text={pageSuccess} /> : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryButtonStyle,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Salvando..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof getThemeColors>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: theme.subtext,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
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
  };
}

const primaryButtonStyle: React.CSSProperties = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  padding: "0 16px",
  height: 42,
  fontWeight: 800,
};

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