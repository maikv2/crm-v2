"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AccessUserItem = {
  id: string;
  type: "ADMIN" | "REPRESENTATIVE" | "INVESTOR" | "CLIENT";
  name: string;
  email: string | null;
  loginEmail: string | null;
  regionName: string | null;
  active: boolean;
  hasAccess: boolean;
};

export default function SettingsAccessPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [items, setItems] = useState<AccessUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [workingKey, setWorkingKey] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setStatusError(null);

      const res = await fetch("/api/settings/access", {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível carregar os acessos.");
      }

      setItems(json?.items ?? []);
    } catch (err: any) {
      setStatusError(err?.message || "Não foi possível carregar os acessos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchType = typeFilter === "ALL" ? true : item.type === typeFilter;

      const matchText =
        !term ||
        item.name.toLowerCase().includes(term) ||
        String(item.email ?? "").toLowerCase().includes(term) ||
        String(item.loginEmail ?? "").toLowerCase().includes(term) ||
        String(item.regionName ?? "").toLowerCase().includes(term);

      return matchType && matchText;
    });
  }, [items, search, typeFilter]);

  async function changeUserPassword(id: string, type: AccessUserItem["type"]) {
    const password = window.prompt("Digite a nova senha:");

    if (!password) return;

    try {
      setWorkingKey(`${type}-${id}-password`);
      setStatusMessage(null);
      setStatusError(null);

      let endpoint = "/api/settings/access/user-password";
      let payload: any = { id, password };

      if (type === "CLIENT") {
        endpoint = "/api/settings/access/client-password";
        payload = { clientId: id, password };
      }

      if (type === "INVESTOR") {
        endpoint = "/api/settings/access/investor-access";
        payload = { investorId: id, password };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível alterar a senha.");
      }

      setStatusMessage("Senha atualizada com sucesso.");
      await load();
    } catch (err: any) {
      setStatusError(err?.message || "Não foi possível alterar a senha.");
    } finally {
      setWorkingKey(null);
    }
  }

  async function toggleAccess(id: string, type: AccessUserItem["type"], nextActive: boolean) {
    try {
      setWorkingKey(`${type}-${id}-toggle`);
      setStatusMessage(null);
      setStatusError(null);

      const endpoint =
        type === "CLIENT"
          ? "/api/settings/access/client-password"
          : "/api/settings/access/toggle-user";

      const payload =
        type === "CLIENT"
          ? { clientId: id, portalEnabled: nextActive }
          : { userId: id, active: nextActive };

      const res = await fetch(endpoint, {
        method: type === "CLIENT" ? "PATCH" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Não foi possível atualizar o acesso.");
      }

      setStatusMessage("Acesso atualizado com sucesso.");
      await load();
    } catch (err: any) {
      setStatusError(err?.message || "Não foi possível atualizar o acesso.");
    } finally {
      setWorkingKey(null);
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
            ⚙️ / Configurações / Usuários e acessos
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            Usuários e acessos
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              color: theme.subtext,
            }}
          >
            Controle central de admins, representantes, investidores e clientes do portal.
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

      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          padding: 16,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "1fr 220px",
          gap: 12,
        }}
      >
        <input
          style={inputStyle(theme)}
          placeholder="Buscar por nome, email, região..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          style={inputStyle(theme)}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">Todos</option>
          <option value="ADMIN">Admins</option>
          <option value="REPRESENTATIVE">Representantes</option>
          <option value="INVESTOR">Investidores</option>
          <option value="CLIENT">Clientes</option>
        </select>
      </div>

      {statusError ? <MessageBox theme={theme} type="error" text={statusError} /> : null}
      {statusMessage ? <MessageBox theme={theme} type="success" text={statusMessage} /> : null}

      <div
        style={{
          borderRadius: 16,
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1.2fr 1fr 1fr 120px 280px",
            gap: 12,
            padding: "14px 16px",
            borderBottom: `1px solid ${theme.border}`,
            fontSize: 12,
            fontWeight: 800,
            color: theme.subtext,
          }}
        >
          <div>Tipo</div>
          <div>Nome</div>
          <div>Email/Login</div>
          <div>Região</div>
          <div>Status</div>
          <div>Ações</div>
        </div>

        {loading ? (
          <div style={{ padding: 18, color: theme.subtext }}>Carregando acessos...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 18, color: theme.subtext }}>Nenhum registro encontrado.</div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1.2fr 1fr 1fr 120px 280px",
                gap: 12,
                padding: "14px 16px",
                borderBottom: `1px solid ${theme.border}`,
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 800 }}>{labelType(item.type)}</div>

              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
              </div>

              <div style={{ color: theme.subtext }}>
                {item.loginEmail || item.email || "-"}
              </div>

              <div style={{ color: theme.subtext }}>{item.regionName || "-"}</div>

              <div
                style={{
                  fontWeight: 800,
                  color: item.active ? "#16a34a" : "#dc2626",
                }}
              >
                {item.active ? "Ativo" : "Inativo"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => changeUserPassword(item.id, item.type)}
                  disabled={workingKey === `${item.type}-${item.id}-password`}
                  style={smallButtonStyle(theme)}
                >
                  {workingKey === `${item.type}-${item.id}-password`
                    ? "Salvando..."
                    : item.type === "INVESTOR" && !item.hasAccess
                      ? "Criar acesso"
                      : "Trocar senha"}
                </button>

                <button
                  type="button"
                  onClick={() => toggleAccess(item.id, item.type, !item.active)}
                  disabled={workingKey === `${item.type}-${item.id}-toggle`}
                  style={smallButtonStyle(theme)}
                >
                  {workingKey === `${item.type}-${item.id}-toggle`
                    ? "Atualizando..."
                    : item.active
                      ? "Desativar"
                      : "Ativar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function labelType(type: AccessUserItem["type"]) {
  if (type === "ADMIN") return "Admin";
  if (type === "REPRESENTATIVE") return "Representante";
  if (type === "INVESTOR") return "Investidor";
  return "Cliente";
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

function smallButtonStyle(theme: ReturnType<typeof getThemeColors>): React.CSSProperties {
  return {
    height: 34,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    padding: "0 12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

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
        marginBottom: 12,
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