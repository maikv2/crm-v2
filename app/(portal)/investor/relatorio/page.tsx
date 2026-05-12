"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

type RegionReport = {
  regionId: string;
  regionName: string;
  month: number;
  year: number;
  grossRevenueCents: number;
  cmvCents: number;
  logisticsCents: number;
  commissionCents: number;
  taxesCents: number;
  administrativeCents: number;
  operatingProfitCents: number;
};

type ThemeShape = ReturnType<typeof getThemeColors>;

function PageButton({ label, icon, theme, onClick, disabled }: {
  label: string; icon?: React.ReactNode; theme: ThemeShape; onClick?: () => void; disabled?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height: 42, padding: "0 14px", borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: hover ? "#2563eb" : theme.isDark ? "#0f172a" : "#ffffff",
        color: hover ? "#ffffff" : theme.text,
        fontWeight: 800, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 8, opacity: disabled ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {icon}{label}
    </button>
  );
}

function ExpenseBar({ label, cents, total, muted, isDark }: {
  label: string; cents: number; total: number; muted: string; isDark: boolean;
}) {
  const pct = total > 0 ? Math.round((cents / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${isDark ? "#1e293b" : "#f1f5f9"}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: muted }}>{label}</span>
          <span style={{ fontSize: 12, color: muted }}>{pct}% da receita</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: isDark ? "#1e293b" : "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#ef4444", borderRadius: 999 }} />
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 900, color: "#ef4444", minWidth: 100, textAlign: "right" }}>{money(cents)}</div>
    </div>
  );
}

function RegionCard({ region, theme }: { region: RegionReport; theme: ThemeShape }) {
  const muted = theme.isDark ? "#94a3b8" : "#64748b";
  const totalExpenses =
    region.cmvCents + region.logisticsCents + region.commissionCents +
    region.taxesCents + region.administrativeCents;
  const isPositive = region.operatingProfitCents >= 0;

  const expenseRows = [
    { label: "CMV (custo dos produtos)", cents: region.cmvCents },
    { label: "Logística", cents: region.logisticsCents },
    { label: "Comissões", cents: region.commissionCents },
    { label: "Impostos", cents: region.taxesCents },
    { label: "Despesas administrativas", cents: region.administrativeCents },
  ].filter((r) => r.cents > 0);

  return (
    <div style={{ background: theme.isDark ? "#0f172a" : "#ffffff", border: `1px solid ${theme.border}`, borderRadius: 18, overflow: "hidden" }}>
      {/* Region header */}
      <div style={{ padding: "16px 20px", background: theme.isDark ? "#111827" : "#f8fafc", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: theme.text }}>{region.regionName}</div>
          <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>
            Competência: {formatMonthYear(region.month, region.year)} · dados em tempo real
          </div>
        </div>
        <div style={{
          fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999,
          background: isPositive ? "#f0fdf4" : "#fef2f2",
          color: isPositive ? "#166534" : "#dc2626",
          border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`,
          textTransform: "uppercase",
        }}>
          {isPositive ? "Positivo" : "Negativo"}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 24 }}>
          <div style={{ background: theme.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 6, textTransform: "uppercase" }}>Receita bruta</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{money(region.grossRevenueCents)}</div>
          </div>
          <div style={{ background: theme.isDark ? "#2d0707" : "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 6, textTransform: "uppercase" }}>Total despesas</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#ef4444" }}>{money(totalExpenses)}</div>
          </div>
          <div style={{
            background: isPositive ? (theme.isDark ? "#052e16" : "#f0fdf4") : (theme.isDark ? "#2d0707" : "#fef2f2"),
            border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`, borderRadius: 14, padding: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: isPositive ? "#166534" : "#dc2626", marginBottom: 6, textTransform: "uppercase" }}>Resultado</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: isPositive ? "#16a34a" : "#ef4444" }}>
              {isPositive ? "" : "-"}{money(Math.abs(region.operatingProfitCents))}
            </div>
          </div>
        </div>

        {expenseRows.length > 0 && (
          <>
            <div style={{ fontSize: 14, fontWeight: 900, color: muted, textTransform: "uppercase", marginBottom: 4 }}>
              Detalhamento das despesas
            </div>
            {expenseRows.map(({ label, cents }) => (
              <ExpenseBar
                key={label}
                label={label}
                cents={cents}
                total={region.grossRevenueCents}
                muted={muted}
                isDark={theme.isDark}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default function InvestorRelatorioPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : "#f3f6fb";
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [regionReport, setRegionReport] = useState<RegionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar relatório.");

      setRegionReport((json?.regionReport as RegionReport[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalRevenueCents = regionReport.reduce((s, r) => s + r.grossRevenueCents, 0);
  const totalExpensesCents = regionReport.reduce((s, r) =>
    s + r.cmvCents + r.logisticsCents + r.commissionCents + r.taxesCents + r.administrativeCents, 0);
  const totalProfitCents = regionReport.reduce((s, r) => s + r.operatingProfitCents, 0);
  const currentPeriod = regionReport[0] ? formatMonthYear(regionReport[0].month, regionReport[0].year) : "";

  if (loading) {
    return (
      <div style={{ minHeight: "calc(100vh - 74px)", display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, fontWeight: 700 }}>
        Carregando relatório...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "calc(100vh - 74px)", background: pageBg, padding: 24, color: theme.text }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: muted, marginBottom: 8 }}>Portal do investidor</div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 900 }}>Relatório financeiro</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: muted }}>
              Receitas e despesas detalhadas por região{currentPeriod ? ` · ${currentPeriod}` : ""} · dados em tempo real
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <PageButton label={refreshing ? "Atualizando..." : "Atualizar"} icon={<RefreshCw size={16} />} theme={theme} onClick={() => load(true)} disabled={refreshing} />
            <PageButton label="Voltar ao painel" icon={<ArrowLeft size={16} />} theme={theme} onClick={() => router.push("/investor/dashboard")} />
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 18, padding: 12, borderRadius: 12, border: "1px solid #ef4444", color: "#ef4444", background: theme.isDark ? "#0f172a" : "#ffffff", fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Consolidated summary */}
        {regionReport.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Receita bruta total", value: money(totalRevenueCents), accent: "#16a34a", bg: theme.isDark ? "#052e16" : "#f0fdf4", border: "#bbf7d0" },
              { label: "Total despesas", value: money(totalExpensesCents), accent: "#ef4444", bg: theme.isDark ? "#2d0707" : "#fef2f2", border: "#fecaca" },
              {
                label: "Resultado operacional",
                value: (totalProfitCents < 0 ? "-" : "") + money(Math.abs(totalProfitCents)),
                accent: totalProfitCents >= 0 ? "#16a34a" : "#ef4444",
                bg: totalProfitCents >= 0 ? (theme.isDark ? "#052e16" : "#f0fdf4") : (theme.isDark ? "#2d0707" : "#fef2f2"),
                border: totalProfitCents >= 0 ? "#bbf7d0" : "#fecaca",
              },
            ].map(({ label, value, accent, bg, border }) => (
              <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: accent, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: accent }}>{value}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{regionReport.length} região(ões) consolidadas</div>
              </div>
            ))}
          </div>
        )}

        {regionReport.length === 0 ? (
          <div style={{ background: theme.isDark ? "#0f172a" : "#ffffff", border: `1px solid ${theme.border}`, borderRadius: 18, padding: 24, color: muted, fontWeight: 700 }}>
            Nenhuma região vinculada com dados disponíveis.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {regionReport.map((region) => (
              <RegionCard key={region.regionId} region={region} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
