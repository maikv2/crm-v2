"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type MonthlyItem = {
  regionId: string;
  regionName: string;
  ebitdaCents?: number | null;
  investorPoolCents?: number | null;
  companyPoolCents?: number | null;
  quarterlyFundContributionCents?: number | null;
  activeQuotaCount?: number | null;
  investorQuotaCount?: number | null;
  companyQuotaCount?: number | null;
  valuePerQuotaCents?: number | null;
  hasMonthlyResult?: boolean;
};

type QuarterlyInvestor = {
  investorId: string;
  investorName: string;
  quotaCount: number;
  totalDistributionCents: number;
  payoutPhase?: string;
};

type QuarterlyItem = {
  regionId: string;
  regionName: string;
  quarterlyFundTotalCents: number;
  investorQuotaCount: number;
  valuePerQuotaCents: number;
  investors: QuarterlyInvestor[];
  hasData: boolean;
};

export default function MobileFinanceInvestorDistributionsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const now = new Date();
  const [activeTab, setActiveTab] = useState<"monthly" | "quarterly">("monthly");

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [errorMonthly, setErrorMonthly] = useState<string | null>(null);

  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [quarterYear, setQuarterYear] = useState(now.getFullYear());
  const [quarterlyItems, setQuarterlyItems] = useState<QuarterlyItem[]>([]);
  const [loadingQuarterly, setLoadingQuarterly] = useState(false);

  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoadingMonthly(true);
        setErrorMonthly(null);
        const res = await fetch(`/api/investors/distributions/summary?month=${month}&year=${year}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || "Erro ao carregar.");
        if (active) setItems(Array.isArray(json?.items) ? json.items : []);
      } catch (err) {
        if (active) setErrorMonthly(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        if (active) setLoadingMonthly(false);
      }
    }
    load();
    return () => { active = false; };
  }, [month, year]);

  async function loadQuarterly() {
    try {
      setLoadingQuarterly(true);
      const res = await fetch(`/api/investors/distributions/quarterly-fund?quarter=${quarter}&year=${quarterYear}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok) setQuarterlyItems(Array.isArray(json?.items) ? json.items : []);
    } finally {
      setLoadingQuarterly(false);
    }
  }

  useEffect(() => {
    if (activeTab === "quarterly") loadQuarterly();
  }, [activeTab, quarter, quarterYear]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => !q || item.regionName.toLowerCase().includes(q));
  }, [items, search]);

  const summary = useMemo(() => ({
    investorPool: filtered.reduce((s, i) => s + Number(i.investorPoolCents ?? 0), 0),
    quarterlyFund: filtered.reduce((s, i) => s + Number(i.quarterlyFundContributionCents ?? 0), 0),
    regions: filtered.length,
  }), [filtered]);

  const quarterlyTotal = useMemo(() =>
    quarterlyItems.reduce((s, i) => s + i.quarterlyFundTotalCents, 0),
  [quarterlyItems]);

  const statBox = (label: string, value: string, sub?: string, color?: string) => (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${colors.border}`,
      background: colors.cardBg,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: color ?? colors.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: colors.subtext }}>{sub}</div>}
    </div>
  );

  return (
    <MobilePageFrame title="Repasses investidores" subtitle="Distribuição EBITDA por região" desktopHref="/investors/distributions">
      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["monthly", "quarterly"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 0", borderRadius: 14,
              border: `1px solid ${activeTab === tab ? colors.primary : colors.border}`,
              background: activeTab === tab ? colors.primary : (colors.isDark ? "#0f172a" : "#f8fafc"),
              color: activeTab === tab ? "#fff" : colors.text,
              fontWeight: 800, fontSize: 13, cursor: "pointer",
            }}
          >
            {tab === "monthly" ? "Mensal" : "Fundo Trimestral"}
          </button>
        ))}
      </div>

      {activeTab === "monthly" ? (
        <>
          <MobileCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>{String(v).padStart(2, "0")}</option>
                ))}
              </select>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }} />
            </div>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: colors.subtext, pointerEvents: "none" }} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar região" style={{ width: "100%", height: 46, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 14px 0 38px", outline: "none", fontSize: 14 }} />
            </div>
          </MobileCard>

          {loadingMonthly ? (
            <MobileCard>Carregando repasses...</MobileCard>
          ) : errorMonthly ? (
            <MobileCard><div style={{ color: "#dc2626", fontSize: 13 }}>{errorMonthly}</div></MobileCard>
          ) : (
            <>
              {/* Resumo planejamento */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {statBox("Total investidores", formatMoneyBR(summary.investorPool), `${summary.regions} região(ões)`, colors.primary)}
                {statBox("Fundo trimestral", formatMoneyBR(summary.quarterlyFund), "contribuição mensal", "#f59e0b")}
              </div>

              <MobileCard>
                <MobileSectionTitle title="Por região" />
                {filtered.length === 0 ? (
                  <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma distribuição encontrada.</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {filtered.map((item) => (
                      <div key={item.regionId} style={{
                        borderRadius: 16,
                        border: `1px solid ${colors.border}`,
                        background: colors.isDark ? "#111827" : "#f8fafc",
                        padding: 14,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{item.regionName}</div>
                            <div style={{ marginTop: 3, fontSize: 11, color: colors.subtext }}>
                              {Number(item.investorQuotaCount ?? 0)} cotas inv. · {Number(item.companyQuotaCount ?? 0)} cotas matriz
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: item.hasMonthlyResult ? "#16a34a" : "#ea580c" }}>
                              {item.hasMonthlyResult ? "Fechado" : "Prévia"}
                            </div>
                          </div>
                        </div>

                        {/* Valor por cota em destaque */}
                        <div style={{
                          borderRadius: 12,
                          background: colors.isDark ? "#0f172a" : "#e8f0ff",
                          padding: "10px 14px",
                          marginBottom: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>Valor por cota</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: colors.primary }}>{formatMoneyBR(item.valuePerQuotaCents)}</div>
                        </div>

                        {/* Total investidores e fundo */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div style={{ borderRadius: 10, background: colors.isDark ? "#0b1324" : "#fff", border: `1px solid ${colors.border}`, padding: "8px 10px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Investidores</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: colors.text, marginTop: 2 }}>{formatMoneyBR(item.investorPoolCents)}</div>
                          </div>
                          <div style={{ borderRadius: 10, background: colors.isDark ? "#0b1324" : "#fff", border: `1px solid ${colors.border}`, padding: "8px 10px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Fundo trim.</div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{formatMoneyBR(item.quarterlyFundContributionCents)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MobileCard>
            </>
          )}
        </>
      ) : (
        <>
          <MobileCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }}>
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}º Trim</option>)}
              </select>
              <input type="number" value={quarterYear} onChange={(e) => setQuarterYear(Number(e.target.value))} style={{ height: 44, borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.inputBg, color: colors.text, padding: "0 12px", outline: "none" }} />
            </div>
          </MobileCard>

          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Total do fundo — {quarter}º Trim/{quarterYear}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#92400e", marginTop: 4 }}>{formatMoneyBR(quarterlyTotal)}</div>
            <div style={{ fontSize: 11, color: "#92400e", marginTop: 4, opacity: 0.7 }}>A distribuir entre todos os investidores</div>
          </div>

          {loadingQuarterly ? (
            <MobileCard>Carregando fundo trimestral...</MobileCard>
          ) : (
            <MobileCard>
              <MobileSectionTitle title="Por região" />
              {quarterlyItems.length === 0 ? (
                <div style={{ fontSize: 13, color: colors.subtext }}>Nenhum fundo trimestral encontrado.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {quarterlyItems.map((item) => (
                    <div key={item.regionId} style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>{item.regionName}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#f59e0b" }}>{formatMoneyBR(item.quarterlyFundTotalCents)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: colors.subtext, marginBottom: item.investors.length > 0 ? 10 : 0 }}>
                        {item.investorQuotaCount} cotas · {formatMoneyBR(item.valuePerQuotaCents)}/cota
                      </div>
                      {item.investors.length > 0 && (
                        <div style={{ display: "grid", gap: 6 }}>
                          {item.investors.map((inv) => (
                            <div key={inv.investorId} style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: colors.isDark ? "#0b1324" : "#fff",
                              borderRadius: 10,
                              padding: "8px 10px",
                              border: `1px solid ${colors.border}`,
                            }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{inv.investorName}</div>
                                <div style={{ fontSize: 11, color: colors.subtext }}>{inv.quotaCount} cota(s) · {inv.payoutPhase === "PAYBACK" ? "60%" : "40%"}</div>
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 900, color: "#f59e0b" }}>{formatMoneyBR(inv.totalDistributionCents)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MobileCard>
          )}
        </>
      )}
    </MobilePageFrame>
  );
}
