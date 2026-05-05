"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, MobileStatCard, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RegionCashItem = {
  id: string;
  amountCents: number;
  status: string;
  createdAt: string;
  transferredAt?: string | null;
  region?: { id: string; name: string } | null;
  receipt?: { id: string; receivedAt: string; order?: { id: string; number: number } | null } | null;
};

function statusLabel(status: string) {
  if (status === "PENDING") return "Aguardando repasse";
  if (status === "TRANSFERRED") return "Repassado";
  if (status === "CANCELED") return "Cancelado";
  return status;
}

function statusColor(status: string) {
  if (status === "PENDING") return "#ea580c";
  if (status === "TRANSFERRED") return "#16a34a";
  if (status === "CANCELED") return "#dc2626";
  return "#64748b";
}

export default function MobileFinanceRegionCashPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [items, setItems] = useState<RegionCashItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/finance/region-cash", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar caixa da região.");
        }

        if (active) setItems(Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar caixa da região.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!q) return true;
      return String(item.region?.name ?? "").toLowerCase().includes(q) || String(item.receipt?.order?.number ?? "").includes(q);
    });
  }, [items, search]);

  const summary = useMemo(() => {
    const pending = filtered.filter((item) => item.status === "PENDING");
    const transferred = filtered.filter((item) => item.status === "TRANSFERRED");

    return {
      pendingValue: pending.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      transferredValue: transferred.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      pendingCount: pending.length,
      transferredCount: transferred.length,
    };
  }, [filtered]);

  return (
    <MobilePageFrame title="Caixa da região" subtitle="Recebimentos aguardando repasse" desktopHref="/finance/region-cash">
      <MobileCard>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.subtext }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por região ou pedido" style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 14px 0 38px", outline: "none", fontSize: 14 }} />
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando caixa da região...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Aguardando" value={formatMoneyBR(summary.pendingValue)} helper={`${summary.pendingCount} registros`} />
            <MobileStatCard label="Repassado" value={formatMoneyBR(summary.transferredValue)} helper={`${summary.transferredCount} registros`} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Registros" />
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhum registro encontrado.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => (
                  <div key={item.id} style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{item.region?.name || "Região"}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>Pedido #{item.receipt?.order?.number ?? "-"} • {formatDateBR(item.receipt?.receivedAt || item.createdAt)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{formatMoneyBR(item.amountCents)}</div>
                        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 800, color: statusColor(item.status) }}>{statusLabel(item.status)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}
