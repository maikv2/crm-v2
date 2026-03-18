"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function ActionButton({
  label,
  disabled,
  type = "button",
}: {
  label: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type={type}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 40,
        width: "100%",
        padding: "0 14px",
        borderRadius: 12,
        border: "1px solid #dbe3ef",
        background: hover ? "#2563eb" : "#ffffff",
        color: hover ? "#ffffff" : "#111827",
        fontWeight: 800,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.75 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
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

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#f8fafc",
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#111827",
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: "#64748b",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/portal-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao realizar login.");
      }

      router.push("/portal/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        color: "#111827",
        background: "#f3f6fb",
        minHeight: "100vh",
        width: "100%",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
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
              🏠 / Portal do Cliente / Login
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#111827",
              }}
            >
              Acessar Portal do Cliente
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Entre com seu usuário e senha para acompanhar pedidos, visitas e informações do seu atendimento.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 430px) minmax(320px, 1fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <Block
            title="Login"
            subtitle="Use o nome fantasia como usuário e o código do cliente como senha inicial."
          >
            <form onSubmit={handleSubmit}>
              {error ? (
                <div
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #ef4444",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 16,
                    color: "#ef4444",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={label()}>Usuário</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={input()}
                    placeholder="Ex.: Mercado Juvenil"
                  />
                </div>

                <div>
                  <label style={label()}>Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={input()}
                    placeholder="Ex.: 0231"
                  />
                </div>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 14,
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 1.55,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 6,
                      fontWeight: 800,
                      color: "#111827",
                    }}
                  >
                    Acesso inicial
                  </div>

                  <div>
                    Usuário padrão: <b style={{ color: "#111827" }}>Nome fantasia</b>
                  </div>

                  <div>
                    Senha inicial: <b style={{ color: "#111827" }}>Código do cliente</b>
                  </div>
                </div>

                <div style={{ marginTop: 4 }}>
                  <ActionButton
                    type="submit"
                    label={loading ? "Entrando..." : "Entrar"}
                    disabled={loading}
                  />
                </div>

                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                    marginTop: 2,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  Solicitar acesso pelo WhatsApp
                </a>
              </div>
            </form>
          </Block>

          <Block
            title="Portal do Cliente"
            subtitle="Uma área exclusiva para o cliente acompanhar o relacionamento com a V2."
          >
            <div
              style={{
                display: "grid",
                gap: 16,
              }}
            >
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  background: "#ffffff",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 30,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    color: "#111827",
                    marginBottom: 12,
                    maxWidth: 560,
                  }}
                >
                  Acompanhe seu relacionamento com a V2 em um só lugar
                </div>

                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "#64748b",
                    maxWidth: 700,
                  }}
                >
                  Consulte pedidos, acompanhe visitas programadas, visualize informações do seu relacionamento com a empresa e tenha um canal mais direto com a equipe da V2.
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <InfoCard
                  title="Pedidos"
                  text="Visualize seus pedidos e acompanhe o histórico de compras e atendimento."
                />
                <InfoCard
                  title="Visitas"
                  text="Confira visitas programadas e tenha mais visibilidade sobre o suporte recebido."
                />
                <InfoCard
                  title="Portal"
                  text="Acesse suas informações com praticidade pelo celular ou computador."
                />
              </div>

              <div
                style={{
                  marginTop: 4,
                  paddingTop: 18,
                  borderTop: "1px solid #e5e7eb",
                  color: "#64748b",
                  fontSize: 13,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span>V2 Distribuidora</span>
                <span>Atendimento digital ao cliente</span>
              </div>
            </div>
          </Block>
        </div>
      </div>
    </div>
  );
}

function label(): React.CSSProperties {
  return {
    display: "block",
    marginBottom: 8,
    fontWeight: 700,
    color: "#111827",
    fontSize: 14,
  };
}

function input(): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111827",
    padding: "0 14px",
    outline: "none",
    fontSize: 14,
  };
}