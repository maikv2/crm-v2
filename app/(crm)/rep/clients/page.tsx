"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
}

type LoggedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  regionId?: string | null;
};

type RepClientItem = {
  id: string;
  name: string;
  legalName?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  code?: string | null;
  regionId?: string | null;
  active?: boolean;
  exhibitorCount?: number;
  totalOrders?: number;
  lastOrderAt?: string | null;
  _count?: {
    exhibitors?: number;
    orders?: number;
  };
};

export default function RepClientsPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [clients, setClients] = useState<RepClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [regionName, setRegionName] = useState<string>("");

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);

      const [clientsRes, authRes] = await Promise.all([
        fetch("/api/rep/clients", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      const clientsJson = await clientsRes.json().catch(() => null);
      const authJson = await authRes.json().catch(() => null);

      if (!clientsRes.ok) {
        throw new Error(clientsJson?.error || "Erro ao carregar clientes.");
      }

      const clientItems = Array.isArray(clientsJson)
        ? clientsJson
        : Array.isArray(clientsJson?.items)
        ? clientsJson.items
        : [];

      setClients(clientItems);

      const user = authJson?.user as LoggedUser | undefined;

      if (user?.regionId) {
        const regionRes = await fetch("/api/regions", { cache: "no-store" });
        const regionJson = await regionRes.json().catch(() => null);

        if (regionRes.ok) {
          const regionItems = Array.isArray(regionJson?.items)
            ? regionJson.items
            : [];
          const currentRegion = regionItems.find(
            (item: any) => item.id === user.regionId
          );
          setRegionName(currentRegion?.name || "Região vinculada");
        } else {
          setRegionName("Região vinculada");
        }
      } else {
        setRegionName("Sem região vinculada");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao carregar clientes.");
      setClients([]);
      setRegionName("");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return clients
      .filter((client) => {
        if (onlyActive && client.active === false) return false;

        const haystack = [
          client.name,
          client.legalName,
          client.city,
          client.state,
          client.phone,
          client.email,
          client.code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!normalized) return true;
        return haystack.includes(normalized);
      })
      .sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR")
      );
  }, [clients, search, onlyActive]);

  const card: React.CSSProperties = {
    border: `1px solid ${border}`,
    borderRadius: 16,
    padding: 16,
    background: cardBg,
    color: theme.text,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: theme.primary,
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnSecondary: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          padding: 24,
          color: theme.text,
        }}
      >
        Carregando clientes...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1200 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
            Meus Clientes
          </h1>

          <button style={btnSecondary} onClick={loadClients}>
            Atualizar
          </button>
        </div>

        <div style={{ color: muted, marginBottom: 20 }}>
          Região do representante: {regionName || "Não identificada"}
        </div>

        <div
          style={{
            ...card,
            marginBottom: 16,
            display: "grid",
            gap: 12,
          }}
        >
          <input
            type="text"
            placeholder="Buscar por nome, cidade, telefone, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              color: theme.text,
            }}
          >
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            Mostrar somente clientes ativos
          </label>

          <div style={{ fontSize: 14, color: muted }}>
            {filteredClients.length} cliente(s) encontrado(s)
          </div>
        </div>

        {error ? (
          <div
            style={{
              ...card,
              marginBottom: 16,
              border: "1px solid #ef4444",
            }}
          >
            {error}
          </div>
        ) : null}

        {filteredClients.length === 0 ? (
          <div style={card}>Nenhum cliente encontrado para esta região.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredClients.map((client) => {
              const exhibitorCount =
                client.exhibitorCount ?? client._count?.exhibitors ?? 0;
              const totalOrders = client.totalOrders ?? client._count?.orders ?? 0;
              const lastOrderAt = client.lastOrderAt ?? null;

              return (
                <div
                  key={client.id}
                  style={{
                    ...card,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontSize: 20, fontWeight: 900 }}>
                        {client.name}
                      </div>

                      {client.active === false ? (
                        <StatusBadge label="Inativo" color="#ef4444" />
                      ) : (
                        <StatusBadge label="Ativo" color="#22c55e" />
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gap: 6,
                        color: muted,
                      }}
                    >
                      <div>
                        Cidade: {[client.city, client.state].filter(Boolean).join(" / ") || "-"}
                      </div>
                      <div>Telefone: {client.phone ?? "-"}</div>
                      <div>Código: {client.code ?? "-"}</div>
                      <div>Último pedido: {formatDateBR(lastOrderAt)}</div>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <StatBox label="Expositores" value={exhibitorCount} theme={theme} />
                      <StatBox label="Pedidos" value={totalOrders} theme={theme} />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gap: 10,
                      minWidth: 180,
                    }}
                  >
                    <button
                      style={btnSecondary}
                      onClick={() => router.push(`/rep/clients/${client.id}`)}
                    >
                      Abrir cliente
                    </button>

                    <button
                      style={btnSecondary}
                      onClick={() => router.push(`/clients/${client.id}/edit`)}
                    >
                      Editar cliente
                    </button>

                    <button
                      style={btnPrimary}
                      onClick={() =>
                        router.push(`/rep/orders/new?clientId=${client.id}`)
                      }
                    >
                      Novo pedido
                    </button>

                    <button
                      style={btnSecondary}
                      onClick={() => router.push(`/rep/exhibitors?clientId=${client.id}`)}
                    >
                      Ver expositores
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 800,
        padding: "4px 8px",
        borderRadius: 999,
        background: `${color}20`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function StatBox({
  label,
  value,
  theme,
}: {
  label: string;
  value: number;
  theme: any;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "8px 10px",
        background: cardBg,
        fontSize: 14,
      }}
    >
      {label}: <b>{value}</b>
    </div>
  );
}