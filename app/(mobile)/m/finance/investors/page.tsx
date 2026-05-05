"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, MobileStatCard, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type InvestorItem = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  activeQuotaCount?: number | null;
  estimatedInvestedCents?: number | null;
  regionCount?: number | null;
  regions?: Array<{ regionId: string; regionName: string; quotaCount: number; estimatedInvestedCents: number }>;
};

export default function MobileFinanceInvestorsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [items, setItems] = useState<InvestorItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/investors", { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar investidores.");
        }

        if (active) setItems(Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar investidores.");
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
      return (
        String(item.name ?? "").toLowerCase().includes(q) ||
        String(item.email ?? "").toLowerCase().includes(q) ||
        String(item.phone ?? "").toLowerCase().includes(q) ||
        (item.regions ?? []).some((region) => region.regionName.toLowerCase().includes(q))
      );
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      investors: filtered.length,
      quotas: filtered.reduce((sum, item) => sum + Number(item.activeQuotaCount ?? 0), 0),
      invested: filtered.reduce((sum, item) => sum + Number(item.estimatedInvestedCents ?? 0), 0),
    };
  }, [filtered]);

  return (
    <MobilePageFrame title="Investidores" subtitle="Consulta financeira de investidores" desktopHref="/investors">
      <MobileCard>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.subtext }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por investidor, email, telefone ou região" style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 14px 0 38px", outline: "none", fontSize: 14 }} />
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando investidores...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Investidores" value={String(summary.investors)} helper="Com cadastro" />
            <MobileStatCard label="Cotas" value={String(summary.quotas)} helper={formatMoneyBR(summary.invested)} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Cotistas" />
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhum investidor encontrado.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => (
                  <div key={item.id} style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{item.name}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>{item.email || item.phone || "Sem contato"}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>{Number(item.regionCount ?? 0)} regiões • {Number(item.activeQuotaCount ?? 0)} cotas</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{formatMoneyBR(item.estimatedInvestedCents)}</div>
                        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 800, color: colors.primary }}>Investido</div>
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
