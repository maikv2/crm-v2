"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import MobilePageFrame from "@/app/components/mobile/mobile-page-frame";
import { MobileCard, MobileSectionTitle, MobileStatCard, formatDateBR, formatMoneyBR } from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type FinanceItem = { id: string; type?: string; status?: string; amountCents?: number | null };
type ReceivableItem = { id: string; amountCents?: number | null; receivedCents?: number | null; status?: string | null };
type RegionCashItem = { id: string; amountCents?: number | null; status?: string | null };
type TransferItem = { id: string; amountCents?: number | null; status?: string | null };

function openAmount(amountCents?: number | null, receivedCents?: number | null) {
  return Math.max(0, Number(amountCents ?? 0) - Number(receivedCents ?? 0));
}

export default function MobileFinanceReportsPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [finance, setFinance] = useState<FinanceItem[]>([]);
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [regionCash, setRegionCash] = useState<RegionCashItem[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [financeRes, receivablesRes, regionCashRes, transfersRes] = await Promise.all([
          fetch("/api/finance", { cache: "no-store" }),
          fetch("/api/finance/receivables", { cache: "no-store" }),
          fetch("/api/finance/region-cash", { cache: "no-store" }),
          fetch("/api/finance/transfers", { cache: "no-store" }),
        ]);

        const [financeJson, receivablesJson, regionCashJson, transfersJson] = await Promise.all([
          financeRes.json().catch(() => null),
          receivablesRes.json().catch(() => null),
          regionCashRes.json().catch(() => null),
          transfersRes.json().catch(() => null),
        ]);

        if (!financeRes.ok || !receivablesRes.ok || !regionCashRes.ok || !transfersRes.ok) {
          throw new Error("Erro ao carregar relatórios financeiros.");
        }

        if (!active) return;

        setFinance(Array.isArray(financeJson) ? financeJson : Array.isArray(financeJson?.items) ? financeJson.items : []);
        setReceivables(Array.isArray(receivablesJson) ? receivablesJson : Array.isArray(receivablesJson?.items) ? receivablesJson.items : []);
        setRegionCash(Array.isArray(regionCashJson) ? regionCashJson : Array.isArray(regionCashJson?.items) ? regionCashJson.items : []);
        setTransfers(Array.isArray(transfersJson) ? transfersJson : Array.isArray(transfersJson?.items) ? transfersJson.items : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar relatórios financeiros.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const income = finance.filter((item) => item.type === "INCOME" && item.status !== "CANCELLED");
    const expense = finance.filter((item) => item.type === "EXPENSE" && item.status !== "CANCELLED");
    const openReceivables = receivables.filter((item) => ["PENDING", "PARTIAL", "OVERDUE"].includes(String(item.status ?? "")));
    const pendingCash = regionCash.filter((item) => item.status === "PENDING");
    const pendingTransfers = transfers.filter((item) => item.status === "PENDING");

    return {
      incomeValue: income.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      expenseValue: expense.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      openReceivablesValue: openReceivables.reduce((sum, item) => sum + openAmount(item.amountCents, item.receivedCents), 0),
      pendingCashValue: pendingCash.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      pendingTransfersValue: pendingTransfers.reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0),
      pendingTransfersCount: pendingTransfers.length,
      pendingCashCount: pendingCash.length,
    };
  }, [finance, receivables, regionCash, transfers]);

  return (
    <MobilePageFrame title="Relatórios financeiros" subtitle="Resumo financeiro mobile" desktopHref="/reports">
      {loading ? (
        <MobileCard>Carregando relatórios financeiros...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            <MobileStatCard label="Receitas" value={formatMoneyBR(summary.incomeValue)} helper="Lançamentos" />
            <MobileStatCard label="Despesas" value={formatMoneyBR(summary.expenseValue)} helper="Contas a pagar" />
            <MobileStatCard label="A receber" value={formatMoneyBR(summary.openReceivablesValue)} helper="Em aberto" />
            <MobileStatCard label="Caixa região" value={formatMoneyBR(summary.pendingCashValue)} helper={`${summary.pendingCashCount} pendentes`} />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Indicadores" />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 800 }}>Resultado financeiro</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color: summary.incomeValue - summary.expenseValue >= 0 ? "#16a34a" : "#dc2626" }}>{formatMoneyBR(summary.incomeValue - summary.expenseValue)}</div>
              </div>
              <div style={{ borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.isDark ? "#111827" : "#f8fafc", padding: 14 }}>
                <div style={{ fontSize: 12, color: colors.subtext, fontWeight: 800 }}>Repasses pendentes</div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color: "#ea580c" }}>{formatMoneyBR(summary.pendingTransfersValue)}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: colors.subtext }}>{summary.pendingTransfersCount} movimentações</div>
              </div>
            </div>
          </MobileCard>
        </>
      )}
    </MobilePageFrame>
  );
}
