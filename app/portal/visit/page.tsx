"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function ActionButton({
  label,
  onClick,
  disabled,
  primary = false,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const [hover, setHover] = useState(false);

  const bg = primary
    ? hover
      ? "#1d4ed8"
      : "#2563eb"
    : hover
    ? "#2563eb"
    : "#ffffff";

  const color = hover || primary ? "#ffffff" : "#111827";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 42,
        padding: "0 18px",
        borderRadius: 12,
        border: primary ? "1px solid #2563eb" : "1px solid #e5e7eb",
        background: bg,
        color,
        fontWeight: 800,
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
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          {title}
        </div>

        {subtitle ? (
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#64748b",
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

export default function PortalVisitPage() {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    try {
      setSending(true);
      setError(null);

      const res = await fetch("/api/portal/visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao solicitar visita.");
      }

      setOk(true);
      setMessage("");
    } catch (err: any) {
      setError(err?.message || "Erro ao solicitar visita.");
    } finally {
      setSending(false);
    }
  }

  if (ok) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f3f6fb",
          color: "#111827",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 720 }}>
          <Block
            title="Visita solicitada"
            subtitle="Nossa equipe entrará em contato em breve para organizar o atendimento."
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
        background: "#f3f6fb",
        color: "#111827",
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
                color: "#64748b",
                marginBottom: 10,
              }}
            >
              🏠 / Portal do Cliente / Solicitar visita
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Solicitar visita
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Descreva o que você precisa para que nossa equipe possa atender melhor.
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
          subtitle="Você pode solicitar visita comercial, suporte, manutenção, reposição ou outro atendimento."
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
                background: "#fff1f2",
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
              color: "#111827",
            }}
          >
            Mensagem
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Ex.: preciso de reposição, manutenção no expositor, visita comercial, ajuste de pedido..."
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#111827",
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
              label={sending ? "Enviando..." : "Solicitar visita"}
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