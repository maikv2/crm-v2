"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileInvestorPageFrame from "@/app/components/mobile/mobile-investor-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

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

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function ExpenseRow({
  label,
  cents,
  total,
  colors,
  last,
}: {
  label: string;
  cents: number;
  total: number;
  colors: ReturnType<typeof getThemeColors>;
  last?: boolean;
}) {
  const pct = total > 0 ? Math.round((cents / total) * 100) : 0;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 0",
      borderBottom: last ? "none" : `1px solid ${colors.isDark ? "#1e293b" : "#f1f5f9"}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{label}</div>
        <div style={{ marginTop: 3, height: 4, borderRadius: 999, background: colors.isDark ? "#1e293b" : "#e2e8f0", overflow: "hidden", width: "80%" }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: "#ef4444", borderRadius: 999 }} />
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#ef4444" }}>{formatMoneyBR(cents)}</div>
        <div style={{ fontSize: 10, color: colors.subtext }}>{pct}% da receita</div>
      </div>
    </div>
  );
}

function RegionCard({ region, colors }: { region: RegionReport; colors: ReturnType<typeof getThemeColors> }) {
  const totalExpenses =
    region.cmvCents +
    region.logisticsCents +
    region.commissionCents +
    region.taxesCents +
    region.administrativeCents;

  const isPositive = region.operatingProfitCents >= 0;

  return (
    <MobileCard style={{ padding: 0, overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        background: colors.isDark ? "#111827" : "#f8fafc",
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: colors.text }}>{region.regionName}</div>
            <div style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
              Competência: {formatMonthYear(region.month, region.year)} · ao vivo
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999,
            background: isPositive ? "#f0fdf4" : "#fef2f2",
            color: isPositive ? "#166534" : "#dc2626",
            border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`,
            textTransform: "uppercase",
          }}>
            {isPositive ? "Positivo" : "Negativo"}
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Receita */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", borderRadius: 12,
          background: colors.isDark ? "#052e16" : "#f0fdf4",
          border: "1px solid #bbf7d0", marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>Receita bruta</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>{formatMoneyBR(region.grossRevenueCents)}</div>
        </div>

        {/* Despesas */}
        <div style={{ fontSize: 11, fontWeight: 900, color: colors.subtext, textTransform: "uppercase", marginBottom: 8 }}>
          Despesas — {formatMoneyBR(totalExpenses)} total
        </div>

        {region.cmvCents > 0 && (
          <ExpenseRow label="CMV (custo dos produtos)" cents={region.cmvCents} total={region.grossRevenueCents} colors={colors} />
        )}
        {region.logisticsCents > 0 && (
          <ExpenseRow label="Logística" cents={region.logisticsCents} total={region.grossRevenueCents} colors={colors} />
        )}
        {region.commissionCents > 0 && (
          <ExpenseRow label="Comissões" cents={region.commissionCents} total={region.grossRevenueCents} colors={colors} />
        )}
        {region.taxesCents > 0 && (
          <ExpenseRow label="Impostos" cents={region.taxesCents} total={region.grossRevenueCents} colors={colors} />
        )}
        <ExpenseRow
          label="Despesas administrativas"
          cents={region.administrativeCents}
          total={region.grossRevenueCents}
          colors={colors}
          last
        />

        {/* Resultado */}
        <div style={{
          marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", borderRadius: 12,
          background: isPositive ? (colors.isDark ? "#052e16" : "#f0fdf4") : (colors.isDark ? "#2d0707" : "#fef2f2"),
          border: `1px solid ${isPositive ? "#bbf7d0" : "#fecaca"}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: isPositive ? "#166534" : "#dc2626" }}>Resultado operacional</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: isPositive ? "#16a34a" : "#ef4444" }}>
            {isPositive ? "" : "-"}{formatMoneyBR(Math.abs(region.operatingProfitCents))}
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

export default function MobileInvestorReportPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const colors = getThemeColors(mode);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionReport, setRegionReport] = useState<RegionReport[]>([]);
  const [currentMonth, setCurrentMonth] = useState<number>(0);
  const [currentYear, setCurrentYear] = useState<number>(0);

  async function load(showRefreshing = false) {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/investor-auth/me", { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar relatório.");

      const report = (json?.regionReport as RegionReport[]) ?? [];
      setRegionReport(report);
      if (report.length > 0) {
        setCurrentMonth(report[0].month);
        setCurrentYear(report[0].year);
      }
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

  return (
    <MobileInvestorPageFrame
      title="Relatório"
      subtitle="Receitas e despesas por região"
      desktopHref="/investor/relatorio"
    >
      <MobileCard style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: colors.text }}>Resumo geral</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {currentMonth > 0 && (
              <div style={{ fontSize: 11, color: colors.subtext }}>{formatMonthYear(currentMonth, currentYear)}</div>
            )}
            <button
              onClick={() => load(true)}
              style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}
            >
              {refreshing ? "..." : "↻"}
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#052e16" : "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Receita</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#16a34a", marginTop: 3 }}>{formatMoneyBR(totalRevenueCents)}</div>
          </div>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#2d0707" : "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Despesas</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#ef4444", marginTop: 3 }}>{formatMoneyBR(totalExpensesCents)}</div>
          </div>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: totalProfitCents >= 0 ? (colors.isDark ? "#0c1a2e" : "#eff6ff") : (colors.isDark ? "#2d0707" : "#fef2f2"), border: `1px solid ${totalProfitCents >= 0 ? "#bfdbfe" : "#fecaca"}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: totalProfitCents >= 0 ? "#1e40af" : "#dc2626", textTransform: "uppercase" }}>Resultado</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: totalProfitCents >= 0 ? "#2563eb" : "#ef4444", marginTop: 3 }}>{totalProfitCents < 0 ? "-" : ""}{formatMoneyBR(Math.abs(totalProfitCents))}</div>
          </div>
        </div>
      </MobileCard>

      {loading ? (
        <MobileCard>Carregando relatório...</MobileCard>
      ) : error ? (
        <MobileCard><div style={{ color: "#dc2626", fontSize: 13 }}>{error}</div></MobileCard>
      ) : regionReport.length === 0 ? (
        <MobileCard>
          <div style={{ fontSize: 13, color: colors.subtext }}>Nenhuma região vinculada com dados disponíveis.</div>
        </MobileCard>
      ) : (
        <>
          <MobileSectionTitle title="Por região" />
          {regionReport.map((region) => (
            <RegionCard key={region.regionId} region={region} colors={colors} />
          ))}
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
