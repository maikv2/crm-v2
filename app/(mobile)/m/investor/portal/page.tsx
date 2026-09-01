"use client";

import { useCallback, useEffect, useState } from "react";
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
  ebitdaDistributionId?: string | null;
  ebitdaReceivableCents: number;
  ebitdaStatus?: string | null;
  ebitdaPaymentRequestId?: string | null;
  ebitdaPaymentRequestedAt?: string | null;
  quarterlyFundDistributionId?: string | null;
  quarterlyFundTotalCents: number;
  quarterlyFundReceivableCents: number;
  quarterlyFundStatus?: string | null;
  quarterlyFundPaymentRequestId?: string | null;
  quarterlyFundPaymentRequestedAt?: string | null;
  quarter: number;
  ordersCount: number;
  ordersTotalCents: number;
  averageOrderCents: number;
};

function formatMonthYear(month?: number, year?: number) {
  if (!month || !year) return "-";
  return `${String(month).padStart(2, "0")}/${year}`;
}

function fifthBusinessDay(year: number, month: number): Date {
  let count = 0;
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
      if (count === 5) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }
  return new Date(year, month - 1, 7);
}

function getMonthlyAvailableAt(month: number, year: number): Date {
  const payoutMonth = month === 12 ? 1 : month + 1;
  const payoutYear = month === 12 ? year + 1 : year;
  return fifthBusinessDay(payoutYear, payoutMonth);
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

function RegionCard({
  region,
  colors,
  requestingId,
  onRequestPayment,
}: {
  region: RegionReport;
  colors: ReturnType<typeof getThemeColors>;
  requestingId: string | null;
  onRequestPayment: (distributionId: string) => void;
}) {
  const totalExpenses =
    region.cmvCents +
    region.logisticsCents +
    region.commissionCents +
    region.taxesCents +
    region.administrativeCents;

  const isPositive = region.operatingProfitCents >= 0;
  const availableAt = getMonthlyAvailableAt(region.month, region.year);
  const hasDistribution = Boolean(region.ebitdaDistributionId);
  const alreadyPaid = region.ebitdaStatus === "PAID";
  const alreadyRequested = Boolean(region.ebitdaPaymentRequestId || region.ebitdaPaymentRequestedAt);
  const notAvailable = new Date() < availableAt;
  const requestDisabled =
    !hasDistribution ||
    alreadyPaid ||
    alreadyRequested ||
    notAvailable ||
    requestingId === region.ebitdaDistributionId;
  const requestLabel = !hasDistribution
    ? "Gerar distribuicao primeiro"
    : alreadyPaid
      ? "Pago"
      : alreadyRequested
        ? "Solicitado"
        : notAvailable
          ? `Disponivel em ${availableAt.toLocaleDateString("pt-BR")}`
          : requestingId === region.ebitdaDistributionId
            ? "Solicitando..."
            : "Solicitar pagamento";

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <div style={{ borderRadius: 12, padding: 12, background: colors.isDark ? "#1c1917" : "#fffbeb", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>EBITDA a receber</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#f59e0b", marginTop: 4 }}>{formatMoneyBR(region.ebitdaReceivableCents)}</div>
          </div>
          <div style={{ borderRadius: 12, padding: 12, background: colors.isDark ? "#172554" : "#eef2ff", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#3730a3", textTransform: "uppercase" }}>Sua fatia do fundo</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#4f46e5", marginTop: 4 }}>{formatMoneyBR(region.quarterlyFundReceivableCents)}</div>
            <div style={{ fontSize: 10, color: colors.subtext, marginTop: 2 }}>{region.quarter}º trim/{region.year} · total: {formatMoneyBR(region.quarterlyFundTotalCents)}</div>
          </div>
          <div style={{ borderRadius: 12, padding: 12, background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1e40af", textTransform: "uppercase" }}>Pedidos</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#2563eb", marginTop: 4 }}>{region.ordersCount}</div>
          </div>
          <div style={{ borderRadius: 12, padding: 12, background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: colors.subtext, textTransform: "uppercase" }}>Valor medio</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: colors.text, marginTop: 4 }}>{formatMoneyBR(region.averageOrderCents)}</div>
          </div>
        </div>

        <button
          type="button"
          disabled={requestDisabled}
          onClick={() => region.ebitdaDistributionId && onRequestPayment(region.ebitdaDistributionId)}
          style={{
            width: "100%",
            minHeight: 38,
            borderRadius: 12,
            border: `1px solid ${requestDisabled ? colors.border : "#16a34a"}`,
            background: requestDisabled ? (colors.isDark ? "#111827" : "#f8fafc") : "#16a34a",
            color: requestDisabled ? colors.subtext : "#ffffff",
            fontWeight: 900,
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          {requestLabel}
        </button>

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
  const [success, setSuccess] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [regionReport, setRegionReport] = useState<RegionReport[]>([]);
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());

  const load = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setSuccess(null);

      const params = new URLSearchParams({
        month: String(currentMonth),
        year: String(currentYear),
      });
      const res = await fetch(`/api/investor-auth/me?${params.toString()}`, { cache: "no-store" });
      if (res.status === 401) { router.push("/investor/login"); return; }

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao carregar relatório.");

      const report = (json?.regionReport as RegionReport[]) ?? [];
      setRegionReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar relatório.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, currentMonth, currentYear]);

  useEffect(() => { load(); }, [load]);

  async function requestPayment(distributionId: string) {
    try {
      setRequestingId(distributionId);
      setError(null);
      setSuccess(null);
      const res = await fetch("/api/investor-auth/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "monthly", id: distributionId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erro ao solicitar pagamento.");
      setSuccess(json?.message || "Solicitacao enviada ao financeiro.");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar pagamento.");
    } finally {
      setRequestingId(null);
    }
  }

  const totalRevenueCents = regionReport.reduce((s, r) => s + r.grossRevenueCents, 0);
  const totalExpensesCents = regionReport.reduce((s, r) =>
    s + r.cmvCents + r.logisticsCents + r.commissionCents + r.taxesCents + r.administrativeCents, 0);
  const totalProfitCents = regionReport.reduce((s, r) => s + r.operatingProfitCents, 0);
  const totalEbitdaReceivableCents = regionReport.reduce((s, r) => s + (r.ebitdaReceivableCents ?? 0), 0);
  const totalQuarterlyFundCents = regionReport.reduce((s, r) => s + (r.quarterlyFundTotalCents ?? 0), 0);
  const totalQuarterlyFundReceivableCents = regionReport.reduce((s, r) => s + (r.quarterlyFundReceivableCents ?? 0), 0);
  const totalOrdersCount = regionReport.reduce((s, r) => s + (r.ordersCount ?? 0), 0);
  const totalOrdersCents = regionReport.reduce((s, r) => s + (r.ordersTotalCents ?? 0), 0);
  const averageOrderCents = totalOrdersCount > 0 ? Math.round(totalOrdersCents / totalOrdersCount) : 0;

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
            <button
              onClick={() => load(true)}
              style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#f8fafc", fontSize: 11, fontWeight: 800, cursor: "pointer", color: colors.text }}
            >
              {refreshing ? "..." : "↻"}
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 86px", gap: 8, marginTop: 10 }}>
          <select
            value={currentMonth}
            onChange={(event) => setCurrentMonth(Number(event.target.value))}
            style={{ height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#ffffff", color: colors.text, padding: "0 10px", fontWeight: 800 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>{formatMonthYear(month, currentYear)}</option>
            ))}
          </select>
          <input
            type="number"
            value={currentYear}
            onChange={(event) => setCurrentYear(Number(event.target.value))}
            min={2000}
            max={2100}
            style={{ height: 36, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.isDark ? "#0f172a" : "#ffffff", color: colors.text, padding: "0 10px", fontWeight: 800 }}
          />
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#1c1917" : "#fffbeb", border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>EBITDA</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#f59e0b", marginTop: 3 }}>{formatMoneyBR(totalEbitdaReceivableCents)}</div>
          </div>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#172554" : "#eef2ff", border: "1px solid #c7d2fe" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#3730a3", textTransform: "uppercase" }}>Sua fatia</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#4f46e5", marginTop: 3 }}>{formatMoneyBR(totalQuarterlyFundReceivableCents)}</div>
            <div style={{ fontSize: 9, color: colors.subtext, marginTop: 2 }}>Total: {formatMoneyBR(totalQuarterlyFundCents)}</div>
          </div>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#0c1a2e" : "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>Pedidos</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: "#2563eb", marginTop: 3 }}>{totalOrdersCount}</div>
          </div>
          <div style={{ borderRadius: 10, padding: "8px 10px", background: colors.isDark ? "#111827" : "#f8fafc", border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: colors.subtext, textTransform: "uppercase" }}>Medio</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: colors.text, marginTop: 3 }}>{formatMoneyBR(averageOrderCents)}</div>
          </div>
        </div>
      </MobileCard>
      {success && (
        <MobileCard>
          <div style={{ color: "#166534", fontSize: 13, fontWeight: 800 }}>{success}</div>
        </MobileCard>
      )}

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
            <RegionCard
              key={region.regionId}
              region={region}
              colors={colors}
              requestingId={requestingId}
              onRequestPayment={requestPayment}
            />
          ))}
        </>
      )}
    </MobileInvestorPageFrame>
  );
}
