"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function PortalLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mobile = useMemo(() => searchParams.get("m") === "1", [searchParams]);

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

      router.push(mobile ? "/m/client" : "/portal/dashboard");
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
                maxWidth: 720,
                lineHeight: 1.5,
              }}
            >
              Entre com seu usuário e senha para acompanhar pedidos, solicitar
              visitas e registrar solicitações no portal do cliente.
            </div>

            {mobile ? (
              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  borderRadius: 999,
                  padding: "6px 10px",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                Versão mobile ativa
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(320px, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <Block
            title="Login"
            subtitle="Use os dados fornecidos pelo seu representante ou pela administração."
          >
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Usuário
                </div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #dbe3ef",
                    background: "#ffffff",
                    color: "#111827",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#111827",
                    marginBottom: 6,
                  }}
                >
                  Senha
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: "1px solid #dbe3ef",
                    background: "#ffffff",
                    color: "#111827",
                    padding: "0 14px",
                    outline: "none",
                  }}
                />
              </div>

              {error ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    padding: 12,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <ActionButton
                type="submit"
                disabled={loading}
                label={loading ? "Entrando..." : "Entrar no portal"}
              />
            </form>
          </Block>

          <div style={{ display: "grid", gap: 16 }}>
            <Block
              title="O que você consegue fazer aqui"
              subtitle="Tudo foi pensado para facilitar o contato com a operação."
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 12,
                }}
              >
                <InfoCard
                  title="Pedidos"
                  text="Consulte pedidos já realizados e acompanhe o andamento das solicitações."
                />
                <InfoCard
                  title="Solicitações"
                  text="Peça visitas, manutenções e novos pedidos diretamente pelo portal."
                />
                <InfoCard
                  title="Acompanhamento"
                  text="Visualize informações importantes da sua conta em um único lugar."
                />
              </div>
            </Block>

            <Block
              title="Acesso seguro"
              subtitle="Caso tenha problemas de acesso, confirme seu usuário e senha com a equipe responsável."
            >
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#64748b",
                }}
              >
                Após o login, o sistema agora respeita a origem do acesso.
                Entrando pela rota mobile, ele abre a área mobile do cliente.
              </div>
            </Block>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <PortalLoginPageContent />
    </Suspense>
  );
}