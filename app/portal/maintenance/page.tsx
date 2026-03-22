"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function ActionButton({
  label,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [hover, setHover] = useState(false);

  const background = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
      ? "#2563eb"
      : colors.cardBg;

  const color = primary ? "#ffffff" : hover ? "#ffffff" : colors.text;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 14px",
        borderRadius: 12,
        border: primary ? "none" : `1px solid ${colors.border}`,
        background,
        color,
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: colors.isDark
          ? "0 8px 24px rgba(2,6,23,0.26)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: colors.text,
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: colors.subtext,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export default function PortalMaintenancePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    try {
      setSending(true);
      setError(null);

      const res = await fetch("/api/portal/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao solicitar manutenção.");
      }

      setOk(true);
      setMessage("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao solicitar manutenção."
      );
    } finally {
      setSending(false);
    }
  }

  if (ok) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.pageBg,
          color: colors.text,
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>
          <Block
            title="Manutenção solicitada"
            subtitle="Nossa equipe recebeu sua solicitação e entrará em contato em breve."
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <ActionButton
                label="Voltar ao portal"
                primary
                onClick={() => router.push("/portal/dashboard")}
              />
              <ActionButton
                label="Nova solicitação"
                onClick={() => {
                  setOk(false);
                  setMessage("");
                  setError(null);
                }}
              />
            </div>
          </Block>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.pageBg,
        color: colors.text,
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
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
                color: colors.subtext,
                marginBottom: 10,
              }}
            >
              🏠 / Portal do Cliente / Solicitar manutenção
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: colors.text,
              }}
            >
              Solicitar manutenção
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              Explique o problema encontrado no expositor para que nossa equipe possa atender melhor.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <ActionButton
              label="Voltar ao portal"
              onClick={() => router.push("/portal/dashboard")}
            />
          </div>
        </div>

        <Block
          title="Mensagem para a equipe"
          subtitle="Descreva o defeito, o comportamento do expositor ou o motivo da manutenção."
        >
          {error ? (
            <div
              style={{
                border: "1px solid #ef4444",
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                color: "#ef4444",
                fontSize: 14,
                background: colors.isDark ? "rgba(127,29,29,0.18)" : "#fff1f2",
              }}
            >
              {error}
            </div>
          ) : null}

          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
              color: colors.text,
            }}
          >
            Mensagem
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Ex.: o expositor está com problema de estrutura, precisa de ajuste, manutenção corretiva ou troca de peças..."
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: colors.cardBg,
              color: colors.text,
              outline: "none",
              resize: "vertical",
              fontSize: 14,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <ActionButton
              label={sending ? "Enviando..." : "Solicitar manutenção"}
              primary
              disabled={sending || !message.trim()}
              onClick={handleSend}
            />

            <ActionButton
              label="Voltar"
              onClick={() => router.push("/portal/dashboard")}
            />
          </div>
        </Block>
      </div>
    </div>
  );
}