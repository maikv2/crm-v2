import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccountingData = {
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
  transactions: Array<{ id: string; type: string; categoryLabel: string; description: string; amountCents: number; status: string; paymentMethod: string | null; regionName: string | null; dueDate: string | null; createdAt: string }>;
  orders: Array<{ id: string; number: number; issuedAt: string; clientName: string; clientDocument: string | null; regionName: string; totalCents: number; paymentMethod: string; nfeNumber: string | null; nfeKey: string | null; nfeStatus: string | null }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 8.5, color: "#1e293b", backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, paddingBottom: 10, borderBottom: "2 solid #2563eb" },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  companyMeta: { fontSize: 8, color: "#64748b", marginTop: 2 },
  reportTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#2563eb", textAlign: "right" },
  reportPeriod: { fontSize: 9, color: "#0f172a", textAlign: "right", marginTop: 2 },
  reportMeta: { fontSize: 7.5, color: "#94a3b8", textAlign: "right", marginTop: 2 },
  sectionTitle: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#2563eb", textTransform: "uppercase", letterSpacing: 1, marginTop: 14, marginBottom: 5, paddingBottom: 3, borderBottom: "1 solid #e2e8f0" },
  grid4: { flexDirection: "row", gap: 6, marginBottom: 10 },
  grid3: { flexDirection: "row", gap: 6, marginBottom: 10 },
  summaryCard: { flex: 1, border: "1 solid #e2e8f0", borderRadius: 4, padding: "8 10", backgroundColor: "#f8fafc" },
  summaryLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
  summaryValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  summarySub: { fontSize: 7, color: "#94a3b8", marginTop: 2 },
  tableWrap: { border: "1 solid #e2e8f0", borderRadius: 4, marginBottom: 10, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottom: "1 solid #e2e8f0" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #f1f5f9" },
  tableRowAlt: { flexDirection: "row", borderBottom: "1 solid #f1f5f9", backgroundColor: "#fafafa" },
  tableTotal: { flexDirection: "row", backgroundColor: "#f1f5f9", borderTop: "1 solid #cbd5e1" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#475569", textTransform: "uppercase", padding: "5 6" },
  td: { fontSize: 8, color: "#1e293b", padding: "5 6" },
  tdBold: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0f172a", padding: "5 6" },
  tdMuted: { fontSize: 8, color: "#64748b", padding: "5 6" },
  tdGreen: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#16a34a", padding: "5 6" },
  tdRed: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#dc2626", padding: "5 6" },
  tdOrange: { fontSize: 8, color: "#ea580c", padding: "5 6" },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#94a3b8", borderTop: "1 solid #e2e8f0", paddingTop: 6 },
});

// ─── Document ─────────────────────────────────────────────────────────────────

function AccountingPDF({ data, generatedAt }: { data: AccountingData; generatedAt: string }) {
  const incomeCategories = data.byCategory.filter((c) => c.type === "INCOME");
  const expenseCategories = data.byCategory.filter((c) => c.type === "EXPENSE");
  const nfes = data.orders.filter((o) => o.nfeNumber);
  const netPositive = data.net >= 0;
  const periodLabel = fmtPeriod(data.period.from, data.period.to);

  return (
    <Document title={`Relatório Contábil - ${periodLabel}`}>
      {/* ── Página 1: Resumo + Categorias ── */}
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.companyName}>{data.company?.tradeName ?? "Empresa"}</Text>
            {data.company?.legalName ? <Text style={S.companyMeta}>{data.company.legalName}</Text> : null}
            <Text style={S.companyMeta}>
              {data.company?.cnpj ? `CNPJ: ${data.company.cnpj}` : ""}
              {data.company?.taxRegime ? `  |  Regime: ${data.company.taxRegime}` : ""}
            </Text>
          </View>
          <View>
            <Text style={S.reportTitle}>RELATÓRIO CONTÁBIL</Text>
            <Text style={S.reportPeriod}>{periodLabel}</Text>
            <Text style={S.reportMeta}>Gerado em {generatedAt}</Text>
          </View>
        </View>

        {/* 1. Resumo Executivo */}
        <Text style={S.sectionTitle}>1. Resumo Executivo</Text>
        <View style={S.grid4}>
          {[
            { label: "Faturamento Bruto", value: money(data.sales.grossRevenueCents), sub: `${data.sales.orderCount} pedidos · ${data.sales.withNfeCount} com NF-e`, color: "#2563eb" },
            { label: "Total de Receitas", value: money(data.income.totalCents), sub: `Pago: ${money(data.income.paidCents)}`, color: "#16a34a" },
            { label: "Total de Despesas", value: money(data.expense.totalCents), sub: `Impostos: ${money(data.expense.taxCents)}`, color: "#dc2626" },
            { label: "Resultado Líquido", value: money(data.net), sub: netPositive ? "Superávit" : "Déficit", color: netPositive ? "#16a34a" : "#dc2626" },
          ].map((item) => (
            <View key={item.label} style={S.summaryCard}>
              <Text style={S.summaryLabel}>{item.label}</Text>
              <Text style={{ ...S.summaryValue, color: item.color }}>{item.value}</Text>
              <Text style={S.summarySub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        <View style={S.grid3}>
          {[
            { label: "Contas a Receber", value: money(data.receivables.totalCents), sub: `Recebido: ${money(data.receivables.receivedCents)}  Pendente: ${money(data.receivables.pendingCents)}  Vencido: ${money(data.receivables.overdueCents)}` },
            { label: "Comissões de Representantes", value: money(data.commissions.totalCents), sub: `Pago: ${money(data.commissions.paidCents)}  Pendente: ${money(data.commissions.pendingCents)}` },
            { label: "Distribuições a Investidores", value: money(data.distributions.totalCents), sub: `Pago: ${money(data.distributions.paidCents)}` },
          ].map((item) => (
            <View key={item.label} style={S.summaryCard}>
              <Text style={S.summaryLabel}>{item.label}</Text>
              <Text style={S.summaryValue}>{item.value}</Text>
              <Text style={S.summarySub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        {/* 2. Receitas por Categoria */}
        <Text style={S.sectionTitle}>2. Receitas por Categoria</Text>
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            {["Categoria", "Total", "Pago", "Pendente", "Qtd"].map((h, i) => (
              <Text key={h} style={{ ...S.th, flex: i === 0 ? 3 : 1, textAlign: i > 0 ? "right" : "left" }}>{h}</Text>
            ))}
          </View>
          {incomeCategories.map((c, idx) => (
            <View key={c.label} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ ...S.tdBold, flex: 3 }}>{c.label}</Text>
              <Text style={{ ...S.tdGreen, flex: 1, textAlign: "right" }}>{money(c.totalCents)}</Text>
              <Text style={{ ...S.td, flex: 1, textAlign: "right" }}>{money(c.paidCents)}</Text>
              <Text style={{ ...S.tdOrange, flex: 1, textAlign: "right" }}>{money(c.totalCents - c.paidCents)}</Text>
              <Text style={{ ...S.tdMuted, flex: 1, textAlign: "right" }}>{c.count}</Text>
            </View>
          ))}
          {incomeCategories.length > 0 && (
            <View style={S.tableTotal}>
              <Text style={{ ...S.th, flex: 3 }}>TOTAL</Text>
              <Text style={{ ...S.tdGreen, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{money(data.income.totalCents)}</Text>
              <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(data.income.paidCents)}</Text>
              <Text style={{ ...S.tdOrange, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{money(data.income.totalCents - data.income.paidCents)}</Text>
              <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{data.income.count}</Text>
            </View>
          )}
          {incomeCategories.length === 0 && (
            <View style={S.tableRow}><Text style={{ ...S.tdMuted, flex: 1, textAlign: "center" }}>Sem receitas no período</Text></View>
          )}
        </View>

        {/* 3. Despesas por Categoria */}
        <Text style={S.sectionTitle}>3. Despesas por Categoria</Text>
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            {["Categoria", "Total", "Pago", "Pendente", "Qtd"].map((h, i) => (
              <Text key={h} style={{ ...S.th, flex: i === 0 ? 3 : 1, textAlign: i > 0 ? "right" : "left" }}>{h}</Text>
            ))}
          </View>
          {expenseCategories.map((c, idx) => (
            <View key={c.label} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ ...S.tdBold, flex: 3 }}>{c.label}</Text>
              <Text style={{ ...S.tdRed, flex: 1, textAlign: "right" }}>{money(c.totalCents)}</Text>
              <Text style={{ ...S.td, flex: 1, textAlign: "right" }}>{money(c.paidCents)}</Text>
              <Text style={{ ...S.tdOrange, flex: 1, textAlign: "right" }}>{money(c.totalCents - c.paidCents)}</Text>
              <Text style={{ ...S.tdMuted, flex: 1, textAlign: "right" }}>{c.count}</Text>
            </View>
          ))}
          {expenseCategories.length > 0 && (
            <View style={S.tableTotal}>
              <Text style={{ ...S.th, flex: 3 }}>TOTAL</Text>
              <Text style={{ ...S.tdRed, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{money(data.expense.totalCents)}</Text>
              <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(data.expense.paidCents)}</Text>
              <Text style={{ ...S.tdOrange, flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{money(data.expense.totalCents - data.expense.paidCents)}</Text>
              <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{data.expense.count}</Text>
            </View>
          )}
          {expenseCategories.length === 0 && (
            <View style={S.tableRow}><Text style={{ ...S.tdMuted, flex: 1, textAlign: "center" }}>Sem despesas no período</Text></View>
          )}
        </View>

        {/* 4. Formas de recebimento */}
        {data.byPaymentMethod.length > 0 && (
          <>
            <Text style={S.sectionTitle}>4. Receitas por Forma de Recebimento</Text>
            <View style={S.tableWrap}>
              <View style={S.tableHeader}>
                <Text style={{ ...S.th, flex: 3 }}>Forma de Pagamento</Text>
                <Text style={{ ...S.th, flex: 1, textAlign: "right" }}>Total</Text>
                <Text style={{ ...S.th, flex: 1, textAlign: "right" }}>Qtd</Text>
              </View>
              {data.byPaymentMethod.map((p, idx) => (
                <View key={p.label} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={{ ...S.tdBold, flex: 3 }}>{p.label}</Text>
                  <Text style={{ ...S.tdGreen, flex: 1, textAlign: "right" }}>{money(p.totalCents)}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1, textAlign: "right" }}>{p.count}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={S.footer} fixed>
          <Text>{data.company?.tradeName ?? "Empresa"} · Relatório Contábil</Text>
          <Text>{periodLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>

      {/* ── Página 2: NF-e + Comissões + Lançamentos ── */}
      <Page size="A4" style={S.page}>
        {/* Comissões */}
        {data.commissions.count > 0 && (
          <>
            <Text style={S.sectionTitle}>5. Comissões de Representantes</Text>
            <View style={S.tableWrap}>
              <View style={S.tableHeader}>
                {["Representante", "Região", "Mês/Ano", "Faturamento", "% Com.", "Comissão", "Status"].map((h, i) => (
                  <Text key={h} style={{ ...S.th, flex: i === 0 ? 2 : 1, textAlign: i > 2 ? "right" : "left" }}>{h}</Text>
                ))}
              </View>
              {data.commissions.list.map((c, idx) => (
                <View key={c.id} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={{ ...S.tdBold, flex: 2 }}>{c.representativeName}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1 }}>{c.regionName}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1 }}>{MONTHS[c.month - 1]?.slice(0, 3)}/{c.year}</Text>
                  <Text style={{ ...S.td, flex: 1, textAlign: "right" }}>{money(c.grossRevenueCents)}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1, textAlign: "right" }}>{c.commissionPercent}%</Text>
                  <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(c.commissionCents)}</Text>
                  <Text style={{ ...S.td, flex: 1, color: c.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                    {c.status === "PAID" ? "Pago" : "Pendente"}
                  </Text>
                </View>
              ))}
              <View style={S.tableTotal}>
                <Text style={{ ...S.th, flex: 5 }}>TOTAL</Text>
                <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(data.commissions.totalCents)}</Text>
                <Text style={{ ...S.th, flex: 1 }} />
              </View>
            </View>
          </>
        )}

        {/* NF-e */}
        {nfes.length > 0 && (
          <>
            <Text style={S.sectionTitle}>6. Notas Fiscais Emitidas ({nfes.length})</Text>
            <View style={S.tableWrap}>
              <View style={S.tableHeader}>
                {["NF-e", "Data", "Cliente", "CNPJ/CPF", "Forma Pgto", "Total", "Status"].map((h, i) => (
                  <Text key={h} style={{ ...S.th, flex: i === 2 ? 2.5 : 1, textAlign: i === 5 ? "right" : "left" }}>{h}</Text>
                ))}
              </View>
              {nfes.map((o, idx) => (
                <View key={o.id} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
                  <Text style={{ ...S.tdBold, flex: 1 }}>#{o.nfeNumber}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1 }}>{fmtDate(o.issuedAt)}</Text>
                  <Text style={{ ...S.td, flex: 2.5 }}>{o.clientName}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1 }}>{o.clientDocument ?? "—"}</Text>
                  <Text style={{ ...S.tdMuted, flex: 1 }}>{o.paymentMethod}</Text>
                  <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(o.totalCents)}</Text>
                  <Text style={{ ...S.td, flex: 1, color: o.nfeStatus === "autorizada" ? "#16a34a" : "#ea580c" }}>{o.nfeStatus ?? "—"}</Text>
                </View>
              ))}
              <View style={S.tableTotal}>
                <Text style={{ ...S.th, flex: 5.5 }}>TOTAL FATURADO NF-e</Text>
                <Text style={{ ...S.tdBold, flex: 1, textAlign: "right" }}>{money(nfes.reduce((s, o) => s + o.totalCents, 0))}</Text>
                <Text style={{ ...S.th, flex: 1 }} />
              </View>
            </View>
          </>
        )}

        {/* Lançamentos */}
        <Text style={S.sectionTitle}>7. Todos os Lançamentos Financeiros ({data.transactions.length})</Text>
        <View style={S.tableWrap}>
          <View style={S.tableHeader}>
            {["Data", "Tipo", "Categoria", "Descrição", "Região", "Status", "Valor"].map((h, i) => (
              <Text key={h} style={{ ...S.th, flex: i === 3 ? 3 : 1, textAlign: i === 6 ? "right" : "left" }}>{h}</Text>
            ))}
          </View>
          {data.transactions.map((t, idx) => (
            <View key={t.id} style={idx % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={{ ...S.tdMuted, flex: 1 }}>{fmtDate(t.createdAt)}</Text>
              <Text style={{ ...S.td, flex: 1, color: t.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                {t.type === "INCOME" ? "Receita" : "Despesa"}
              </Text>
              <Text style={{ ...S.tdMuted, flex: 1 }}>{t.categoryLabel}</Text>
              <Text style={{ ...S.td, flex: 3 }}>{t.description}</Text>
              <Text style={{ ...S.tdMuted, flex: 1 }}>{t.regionName ?? "Matriz"}</Text>
              <Text style={{ ...S.td, flex: 1, color: t.status === "PAID" ? "#16a34a" : "#ea580c" }}>
                {t.status === "PAID" ? "Pago" : "Pendente"}
              </Text>
              <Text style={{ ...S.td, flex: 1, textAlign: "right", color: t.type === "INCOME" ? "#16a34a" : "#dc2626", fontFamily: "Helvetica-Bold" }}>
                {t.type === "INCOME" ? "+" : "-"}{money(t.amountCents)}
              </Text>
            </View>
          ))}
          {data.transactions.length === 0 && (
            <View style={S.tableRow}><Text style={{ ...S.tdMuted, flex: 1, textAlign: "center" }}>Nenhum lançamento no período</Text></View>
          )}
        </View>

        <View style={S.footer} fixed>
          <Text>{data.company?.tradeName ?? "Empresa"} · Relatório Contábil</Text>
          <Text>{periodLabel}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateAccountingPDF(data: AccountingData, generatedAt: string): Promise<Buffer> {
  const doc = <AccountingPDF data={data} generatedAt={generatedAt} />;
  return renderToBuffer(doc);
}
