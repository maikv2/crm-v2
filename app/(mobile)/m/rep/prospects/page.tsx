"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AuthResponse = {
  user?: {
    id: string;
    regionId?: string | null;
    role?: string;
  } | null;
};

type ProspectItem = {
  id: string;
  name?: string | null;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  contactName?: string | null;
  phone?: string | null;
  notes?: string | null;
};

function getStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "RETURN": return "Voltar";
    case "NO_RETURN": return "Não voltar";
    case "CONVERTED": return "Convertido";
    default: return "Pendente";
  }
}

function getStatusColors(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "RETURN": return { bg: "rgba(124,58,237,0.14)", color: "#7c3aed" };
    case "NO_RETURN": return { bg: "rgba(239,68,68,0.14)", color: "#dc2626" };
    case "CONVERTED": return { bg: "rgba(34,197,94,0.14)", color: "#16a34a" };
    default: return { bg: "rgba(245,158,11,0.14)", color: "#b45309" };
  }
}

export default function MobileRepProspectsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regionId, setRegionId] = useState("");
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState<ProspectItem[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    const authRes = await fetch("/api/auth/me", { cache: "no-store" });
    const authJson = (await authRes.json().catch(() => null)) as AuthResponse | null;

    const user = authJson?.user;
    const nextRegionId = user?.regionId ?? "";
    const nextUserId = user?.id ?? "";

    setRegionId(nextRegionId);
    setUserId(nextUserId);

    const query = new URLSearchParams();
    if (nextRegionId) query.set("regionId", nextRegionId);
    if (nextUserId) query.set("representativeId", nextUserId);

    const res = await fetch(`/api/prospects?${query.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) throw new Error(json?.error || "Erro ao carregar prospectos.");
    setItems(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        await load();
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar prospectos.");
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.tradeName, item.city, item.contactName, item.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [items, search]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/prospects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      await load();
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar status");
    }
  }

  const btnStyle: React.CSSProperties = {
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const btnPrimaryStyle: React.CSSProperties = {
    ...btnStyle,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
  };

  return (
    <MobileRepPageFrame
      title="Prospectos"
      subtitle="Prospectos da sua região"
      desktopHref="/rep/prospects"
    >
      <MobileCard>
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar prospecto..."
            style={{
              width: "100%",
              height: 46,
              borderRadius: 14,
              border: `1px solid ${colors.border}`,
              background: colors.inputBg,
              color: colors.text,
              padding: "0 14px",
              outline: "none",
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={() => router.push("/m/rep/prospects/new")}
            style={{
              height: 46,
              borderRadius: 14,
              border: "none",
              background: colors.primary,
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            + Novo prospecto
          </button>
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando prospectos...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : filtered.length === 0 ? (
        <MobileCard>Nenhum prospecto encontrado.</MobileCard>
      ) : (
        filtered.map((item) => {
          const statusColors = getStatusColors(item.status);
          const displayName = item.tradeName?.trim() || item.name || "Prospecto";

          return (
            <MobileCard key={item.id} style={{ padding: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>
                      {displayName}
                    </div>
                    {item.tradeName && item.name !== item.tradeName ? (
                      <div style={{ fontSize: 12, color: colors.subtext, marginTop: 2 }}>
                        {item.name}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      background: statusColors.bg,
                      color: statusColors.color,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 4, fontSize: 12, color: colors.subtext }}>
                  {item.city ? (
                    <div>{item.city}{item.state ? `/${item.state}` : ""}</div>
                  ) : null}
                  {item.contactName ? <div>Contato: {item.contactName}</div> : null}
                  {item.phone ? <div>Telefone: {item.phone}</div> : null}
                  {item.notes ? <div>Obs: {item.notes}</div> : null}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => router.push(`/m/rep/prospects/${item.id}/edit`)}
                    style={btnStyle}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Converter "${displayName}" em cliente?`)) {
                        updateStatus(item.id, "CONVERTED");
                      }
                    }}
                    style={btnPrimaryStyle}
                  >
                    Tornar cliente
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/m/rep/exhibitors/new?prospectId=${item.id}&name=${encodeURIComponent(displayName)}`
                      )
                    }
                    style={btnStyle}
                  >
                    Levar expositor
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "RETURN")}
                    style={btnStyle}
                  >
                    Marcar voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "NO_RETURN")}
                    style={btnStyle}
                  >
                    Marcar não voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "PENDING")}
                    style={btnStyle}
                  >
                    Voltar pendente
                  </button>
                </div>
              </div>
            </MobileCard>
          );
        })
      )}
    </MobileRepPageFrame>
  );
}