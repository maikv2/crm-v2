"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, MobileStatCard, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type DistributionItem = {
  regionId: string;
  regionName: string;
  grossRevenueCents?: number | null;
  operatingProfitCents?: number | null;
  investorPoolCents?: number | null;
  companyPoolCents?: number | null;
  activeQuotaCount?: number | null;
  investorQuotaCount?: number | null;
  companyQuotaCount?: number | null;
  valuePerQuotaCents?: number | null;
  hasMonthlyResult?: boolean;
};

export default function MobileFinanceInvestorDistributionsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<DistributionItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/investors/distributions/summary?month=${month}&year=${year}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar repasses para investidores.");
        }

        if (active) setItems(Array.isArray(json?.items) ? json.items : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar repasses para investidores.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [month, year]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => !q || item.regionName.toLowerCase().includes(q));
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      investorPool: filtered.reduce((sum, item) => sum + Number(item.investorPoolCents ?? 0), 0),
      companyPool: filtered.reduce((sum, item) => sum + Number(item.companyPoolCents ?? 0), 0),
      quotaCount: filtered.reduce((sum, item) => sum + Number(item.activeQuotaCount ?? 0), 0),
      regions: filtered.length,
    };
  }, [filtered]);

  return (
    <MobilePageFrame title="Repasses investidores" subtitle="Controle de distribuição por região" desktopHref="/investors/distributions">
      <MobileCard>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{String(value).padStart(2, "0")}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }} />
        </div>

        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.subtext }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar região" style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 14px 0 38px", outline: "none", fontSize: 14 }} />
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando repasses para investidores...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Investidores" value={formatMoneyBR(summary.investorPool)} helper={`${summary.quotaCount} cotas`} />
            <MobileStatCard label="Matriz" value={formatMoneyBR(summary.companyPool)} helper={`${summary.regions} regiões`} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Distribuição" />
            {filtered.length === 0 ? (
              <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma distribuição encontrada.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {filtered.map((item) => (
                  <div key={item.regionId} style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{item.regionName}</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>{Number(item.investorQuotaCount ?? 0)} cotas investidores • {Number(item.companyQuotaCount ?? 0)} cotas matriz</div>
                        <div style={{ marginTop: 5, fontSize: 12, color: colors.subtext }}>Valor por cota: {formatMoneyBR(item.valuePerQuotaCents)}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{formatMoneyBR(item.investorPoolCents)}</div>
                        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 800, color: item.hasMonthlyResult ? "#16a34a" : "#ea580c" }}>{item.hasMonthlyResult ? "Fechado" : "Prévia"}</div>
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
