"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// ─── Types (same as accounting page) ─────────────────────────────────────────

type AccountingReport = {
  period: { from: string; to: string };
  company: { tradeName: string; legalName: string | null; cnpj: string | null; taxRegime: string | null } | null;
  sales: { grossRevenueCents: number; discountTotalCents: number; netRevenueCents: number; orderCount: number; withNfeCount: number };
  income: { totalCents: number; paidCents: number; count: number };
  expense: { totalCents: number; paidCents: number; taxCents: number; payrollCents: number; count: number };
  net: number;
  receivables: { totalCents: number; receivedCents: number; pendingCents: number; overdueCents: number; count: number };
  commissions: {
    totalCents: number; paidCents: number; pendingCents: number; count: number;
    list: Array<{ id: string; representativeName: string; regionName: string; month: number; year: number; grossRevenueCents: number; commissionPercent: number; commissionCents: number; status: string; paidAt: string | null }>;
  };
  distributions: { totalCents: number; paidCents: number; count: number };
  byCategory: Array<{ label: string; type: string; totalCents: number; paidCents: number; count: number }>;
  byPaymentMethod: Array<{ label: string; totalCents: number; count: number }>;
  transactions: Array<{ id: string; type: string; category: string; categoryLabel: string; description: string; amountCents: number; status: string; paymentMethod: string | null; regionName: string | null; dueDate: string | null; paidAt: string | null; createdAt: string; notes: string | null }>;
  orders: Array<{ id: string; number: number; issuedAt: string; clientName: string; clientDocument: string | null; regionName: string; sellerName: string | null; totalCents: number; discountCents: number; paymentMethod: string; paymentStatus: string; nfeNumber: string | null; nfeStatus: string | null }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtPeriod(from: string, to: string) {
  return `${fmtDate(from)} a ${fmtDate(to)}`;
}
function monthLabel(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

// ─── Print page ───────────────────────────────────────────────────────────────

export default function PrintAccountingPage() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [data, setData] = useState<AccountingReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    fetch(`/api/reports/accounting?from=${from}&to=${to}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, [from, to]);

  // Auto-print once data is loaded
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [data]);

  if (error) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#ef4444" }}>Erro ao carregar dados do relatório.</div>;
  }
  if (!data) {
    return <div style={{ padding: 40, fontFamily: "sans-serif", color: "#64748b" }}>Preparando relatório para impressão...</div>;
  }

  const incomeCategories = data.byCategory.filter((c) => c.type === "INCOME");
  const expenseCategories = data.byCategory.filter((c) => c.type === "EXPENSE");
  const netPositive = data.net >= 0;
  const periodLabel = fmtPeriod(data.period.from, data.period.to);
  const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const S = styles;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; }
        @page { size: A4; margin: 16mm 14mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
        }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; padding: 6px 8px; font-weight: 700; color: #475569; border-bottom: 1.5px solid #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
        td { padding: 7px 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #1e293b; }
        tr:last-child td { border-bottom: none; }
      `}</style>

      <div style={S.page}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <div style={S.companyName}>{data.company?.tradeName ?? "Empresa"}</div>
            {data.company?.legalName && <div style={S.companyMeta}>{data.company.legalName}</div>}
            <div style={S.companyMeta}>
              {data.company?.cnpj ? `CNPJ: ${data.company.cnpj}` : ""}
              {data.company?.taxRegime ? ` · Regime: ${data.company.taxRegime}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={S.reportTitle}>RELATÓRIO CONTÁBIL</div>
            <div style={S.periodBadge}>{periodLabel}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>Gerado em {generatedAt}</div>
          </div>
        </div>

        <div style={S.divider} />

        {/* ── Resumo Executivo ── */}
        <div style={S.sectionTitle}>1. RESUMO EXECUTIVO</div>
        <div style={{ ...S.grid4, marginBottom: 16 }}>
          {[
            { label: "Faturamento Bruto", value: money(data.sales.grossRevenueCents), sub: `${data.sales.orderCount} pedidos · ${data.sales.withNfeCount} com NF-e`, color: "#2563eb" },
            { label: "Total de Receitas", value: money(data.income.totalCents), sub: `Pago: ${money(data.income.paidCents)}`, color: "#16a34a" },
            { label: "Total de Despesas", value: money(data.expense.totalCents), sub: `Impostos: ${money(data.expense.taxCents)}`, color: "#dc2626" },
            { label: "Resultado Líquido", value: money(data.net), sub: netPositive ? "Superávit" : "Déficit", color: netPositive ? "#16a34a" : "#dc2626" },
          ].map((item) => (
            <div key={item.label} style={S.summaryCard}>
              <div style={S.summaryLabel}>{item.label}</div>
              <div style={{ ...S.summaryValue, color: item.color }}>{item.value}</div>
              <div style={S.summarySub}>{item.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ ...S.grid3, marginBottom: 20 }}>
          {[
            { label: "Contas a Receber", value: money(data.receivables.totalCents), sub: `Recebido: ${money(data.receivables.receivedCents)} · Pendente: ${money(data.receivables.pendingCents)} · Vencido: ${money(data.receivables.overdueCents)}` },
            { label: "Comissões de Representantes", value: money(data.commissions.totalCents), sub: `Pago: ${money(data.commissions.paidCents)} · Pendente: ${money(data.commissions.pendingCents)}` },
            { label: "Distribuições a Investidores", value: money(data.distributions.totalCents), sub: `Pago: ${money(data.distributions.paidCents)}` },
          ].map((item) => (
            <div key={item.label} style={S.summaryCard}>
              <div style={S.summaryLabel}>{item.label}</div>
              <div style={{ ...S.summaryValue, color: "#0f172a" }}>{item.value}</div>
              <div style={S.summarySub}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Receitas por Categoria ── */}
        <div style={S.sectionTitle}>2. RECEITAS POR CATEGORIA</div>
        <div style={{ ...S.tableWrap, marginBottom: 20 }} className="no-break">
          <table>
            <thead><tr><th>Categoria</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Pago</th><th style={{ textAlign: "right" }}>Pendente</th><th style={{ textAlign: "right" }}>Qtd</th></tr></thead>
            <tbody>
              {incomeCategories.length === 0
                ? <tr><td colSpan={5} style={{ color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>Sem receitas no período</td></tr>
                : incomeCategories.map((c) => (
                  <tr key={c.label}>
                    <td style={{ fontWeight: 600 }}>{c.label}</td>
                    <td style={{ textAlign: "right", color: "#16a34a", fontWeight: 700 }}>{money(c.totalCents)}</td>
                    <td style={{ textAlign: "right" }}>{money(c.paidCents)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c" }}>{money(c.totalCents - c.paidCents)}</td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{c.count}</td>
                  </tr>
                ))
              }
              {incomeCategories.length > 0 && (
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ fontWeight: 800 }}>TOTAL</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#16a34a" }}>{money(data.income.totalCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>{money(data.income.paidCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#ea580c" }}>{money(data.income.totalCents - data.income.paidCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>{data.income.count}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Despesas por Categoria ── */}
        <div style={S.sectionTitle}>3. DESPESAS POR CATEGORIA</div>
        <div style={{ ...S.tableWrap, marginBottom: 20 }} className="no-break">
          <table>
            <thead><tr><th>Categoria</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Pago</th><th style={{ textAlign: "right" }}>Pendente</th><th style={{ textAlign: "right" }}>Qtd</th></tr></thead>
            <tbody>
              {expenseCategories.length === 0
                ? <tr><td colSpan={5} style={{ color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>Sem despesas no período</td></tr>
                : expenseCategories.map((c) => (
                  <tr key={c.label}>
                    <td style={{ fontWeight: 600 }}>{c.label}</td>
                    <td style={{ textAlign: "right", color: "#dc2626", fontWeight: 700 }}>{money(c.totalCents)}</td>
                    <td style={{ textAlign: "right" }}>{money(c.paidCents)}</td>
                    <td style={{ textAlign: "right", color: "#ea580c" }}>{money(c.totalCents - c.paidCents)}</td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{c.count}</td>
                  </tr>
                ))
              }
              {expenseCategories.length > 0 && (
                <tr style={{ background: "#f8fafc" }}>
                  <td style={{ fontWeight: 800 }}>TOTAL</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#dc2626" }}>{money(data.expense.totalCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>{money(data.expense.paidCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800, color: "#ea580c" }}>{money(data.expense.totalCents - data.expense.paidCents)}</td>
                  <td style={{ textAlign: "right", fontWeight: 800 }}>{data.expense.count}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Contas a Receber ── */}
        <div style={S.sectionTitle}>4. CONTAS A RECEBER</div>
        <div style={{ ...S.grid4, marginBottom: 20 }} className="no-break">
          {[
            { label: "Total Gerado", value: money(data.receivables.totalCents), color: "#0f172a" },
            { label: "Recebido", value: money(data.receivables.receivedCents), color: "#16a34a" },
            { label: "Pendente", value: money(data.receivables.pendingCents), color: "#ea580c" },
            { label: "Vencido", value: money(data.receivables.overdueCents), color: "#dc2626" },
          ].map((item) => (
            <div key={item.label} style={S.summaryCard}>
              <div style={S.summaryLabel}>{item.label}</div>
              <div style={{ ...S.summaryValue, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── Formas de Recebimento ── */}
        {data.byPaymentMethod.length > 0 && (
          <>
            <div style={S.sectionTitle}>5. RECEITAS POR FORMA DE RECEBIMENTO</div>
            <div style={{ ...S.tableWrap, marginBottom: 20 }} className="no-break">
              <table>
                <thead><tr><th>Forma de Pagamento</th><th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Qtd de Lançamentos</th></tr></thead>
                <tbody>
                  {data.byPaymentMethod.map((p) => (
                    <tr key={p.label}>
                      <td style={{ fontWeight: 600 }}>{p.label}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(p.totalCents)}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Comissões ── */}
        {data.commissions.count > 0 && (
          <>
            <div style={S.sectionTitle}>6. COMISSÕES DE REPRESENTANTES</div>
            <div style={{ ...S.tableWrap, marginBottom: 20 }} className="no-break">
              <table>
                <thead>
                  <tr>
                    <th>Representante</th><th>Região</th><th>Mês/Ano</th>
                    <th style={{ textAlign: "right" }}>Faturamento</th>
                    <th style={{ textAlign: "right" }}>% Comissão</th>
                    <th style={{ textAlign: "right" }}>Comissão</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.list.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.representativeName}</td>
                      <td>{c.regionName}</td>
                      <td>{monthLabel(c.month, c.year)}</td>
                      <td style={{ textAlign: "right" }}>{money(c.grossRevenueCents)}</td>
                      <td style={{ textAlign: "right" }}>{c.commissionPercent}%</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(c.commissionCents)}</td>
                      <td style={{ color: c.status === "PAID" ? "#16a34a" : "#ea580c", fontWeight: 700 }}>
                        {c.status === "PAID" ? "Pago" : "Pendente"}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc" }}>
                    <td colSpan={5} style={{ fontWeight: 800 }}>TOTAL</td>
                    <td style={{ textAlign: "right", fontWeight: 800 }}>{money(data.commissions.totalCents)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Lançamentos completos ── */}
        <div className="page-break" />
        <div style={S.sectionTitle}>7. TODOS OS LANÇAMENTOS FINANCEIROS ({data.transactions.length})</div>
        <div style={S.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th>
                <th>Região</th><th>Forma</th><th>Vencimento</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0
                ? <tr><td colSpan={9} style={{ textAlign: "center", color: "#94a3b8", padding: "12px 0" }}>Nenhum lançamento no período</td></tr>
                : data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                    <td style={{ fontWeight: 700, color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "INCOME" ? "Receita" : "Despesa"}
                    </td>
                    <td>{t.categoryLabel}</td>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</td>
                    <td>{t.regionName ?? "Matriz"}</td>
                    <td>{t.paymentMethod ?? "—"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.dueDate)}</td>
                    <td style={{ fontWeight: 700, color: t.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                      {t.status === "PAID" ? "Pago" : "Pendente"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "INCOME" ? "+" : "-"}{money(t.amountCents)}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <div>Sistema V2 CRM · Relatório Contábil</div>
          <div>{periodLabel}</div>
          <div>Gerado em {generatedAt}</div>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 40px",
    background: "#fff",
    color: "#0f172a",
  } as React.CSSProperties,
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  } as React.CSSProperties,
  companyName: {
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  companyMeta: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  } as React.CSSProperties,
  reportTitle: {
    fontSize: 13,
    fontWeight: 900,
    color: "#2563eb",
    letterSpacing: "0.08em",
  } as React.CSSProperties,
  periodBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    marginTop: 4,
  } as React.CSSProperties,
  divider: {
    borderTop: "2px solid #2563eb",
    marginBottom: 20,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 10,
    fontWeight: 900,
    color: "#2563eb",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    marginBottom: 8,
    marginTop: 4,
    paddingBottom: 4,
    borderBottom: "1px solid #e2e8f0",
  } as React.CSSProperties,
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
  } as React.CSSProperties,
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  } as React.CSSProperties,
  summaryCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#f8fafc",
  } as React.CSSProperties,
  summaryLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 4,
  } as React.CSSProperties,
  summaryValue: {
    fontSize: 16,
    fontWeight: 900,
    lineHeight: 1.1,
  } as React.CSSProperties,
  summarySub: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 3,
  } as React.CSSProperties,
  tableWrap: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  } as React.CSSProperties,
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#94a3b8",
  } as React.CSSProperties,
};
