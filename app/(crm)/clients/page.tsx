"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";

type Client = {
  id: string;
  code?: string | null;
  name: string;
  tradeName?: string | null;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  active: boolean;
  region?: {
    id: string;
    name: string;
  } | null;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function ActionButton({
  label,
  theme,
  onClick,
}: {
  label: string;
  theme: ThemeShape;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 34,
        padding: "0 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: hover ? theme.primary : theme.cardBg,
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function Block({
  title,
  children,
  theme,
  right,
}: {
  title: string;
  children: React.ReactNode;
  theme: ThemeShape;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 22,
        boxShadow: theme.isDark
          ? "0 10px 30px rgba(2,6,23,0.35)"
          : "0 8px 24px rgba(15,23,42,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {title}
        </div>

        {right}
      </div>

      {children}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";
  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await fetch("/api/clients", {
          cache: "no-store",
        });
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return clients;

    return clients.filter((client) =>
      [
        client.code,
        client.name,
        client.tradeName,
        client.legalName,
        client.phone,
        client.email,
        client.city,
        client.state,
        client.region?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [clients, search]);

  return (
    <div
      style={{
        background: theme.pageBg,
        color: theme.text,
        minHeight: "100%",
        padding: 28,
      }}
    >
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
              color: theme.subtext,
              marginBottom: 10,
            }}
          >
            🏠 / Clientes
          </div>

          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: theme.text,
            }}
          >
            Cadastro de Clientes
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Gerencie os clientes cadastrados e acesse rapidamente os detalhes.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <ActionButton
            label="+ Cliente"
            theme={theme}
            onClick={() => router.push("/clients/new")}
          />
        </div>
      </div>

      <Block
        title="Lista de clientes"
        theme={theme}
        right={
          <input
            type="text"
            placeholder="Pesquisar cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              height: 38,
              width: 260,
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: inputBg,
              color: theme.text,
              padding: "0 12px",
              outline: "none",
            }}
          />
        }
      >
        {loading ? (
          <div style={{ color: theme.subtext }}>Carregando clientes...</div>
        ) : filteredClients.length === 0 ? (
          <div style={{ color: theme.subtext }}>Nenhum cliente encontrado.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredClients.map((client) => {
              const displayName = client.tradeName || client.name || "-";
              const legalDisplay =
                client.legalName &&
                client.legalName.trim() &&
                client.legalName !== displayName
                  ? client.legalName
                  : null;

              return (
                <div
                  key={client.id}
                  style={{
                    background: subtleCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14,
                    padding: 16,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <Link
                      href={`/clients/${client.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        flex: 1,
                        minWidth: 220,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {client.code ? `${client.code} · ` : ""}
                        {displayName}
                      </div>

                      {legalDisplay ? (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            fontWeight: 600,
                            color: theme.subtext,
                          }}
                        >
                          {legalDisplay}
                        </div>
                      ) : null}
                    </Link>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: client.active
                            ? theme.isDark
                              ? "rgba(34,197,94,0.16)"
                              : "#dcfce7"
                            : theme.isDark
                            ? "rgba(239,68,68,0.16)"
                            : "#fee2e2",
                          color: client.active ? "#16a34a" : "#ef4444",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {client.active ? "Ativo" : "Inativo"}
                      </div>

                      <ActionButton
                        label="Editar"
                        theme={theme}
                        onClick={() => router.push(`/clients/${client.id}/edit`)}
                      />
                    </div>
                  </div>

                  <Link
                    href={`/clients/${client.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div style={{ color: theme.subtext, fontSize: 14 }}>
                        <strong style={{ color: theme.text }}>Região:</strong>{" "}
                        {client.region?.name ?? "-"}
                      </div>

                      <div style={{ color: theme.subtext, fontSize: 14 }}>
                        <strong style={{ color: theme.text }}>Telefone:</strong>{" "}
                        {client.phone || "-"}
                      </div>

                      <div style={{ color: theme.subtext, fontSize: 14 }}>
                        <strong style={{ color: theme.text }}>E-mail:</strong>{" "}
                        {client.email || "-"}
                      </div>

                      <div style={{ color: theme.subtext, fontSize: 14 }}>
                        <strong style={{ color: theme.text }}>Cidade:</strong>{" "}
                        {client.city || "-"} / {client.state || "-"}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Block>
    </div>
  );
}
