import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type AiReportTable = {
  title: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
  footer?: Record<string, string>;
};

export type AiReportPdfData = {
  title: string;
  question: string | null;
  analysis: string;
  tables: AiReportTable[];
  generatedAt: string;
  generatedBy: string;
  logoDataUrl: string | null;
};

const styles = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 40, paddingHorizontal: 26, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dbe3ef",
    paddingBottom: 10,
    marginBottom: 12,
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  company: { fontSize: 12, fontWeight: 700, color: "#0f172a" },
  sub: { fontSize: 8, color: "#64748b", marginTop: 2 },
  title: { fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 },
  question: { fontSize: 9, color: "#475569", marginBottom: 10 },
  analysisBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 3,
    borderLeftColor: "#7c3aed",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    backgroundColor: "#faf5ff",
  },
  analysisLabel: { fontSize: 8, color: "#7c3aed", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" },
  analysisText: { fontSize: 9.5, lineHeight: 1.45, color: "#1f2937" },
  tableTitle: { fontSize: 10, fontWeight: 700, color: "#1e3a8a", marginBottom: 6 },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6 },
  thRow: { flexDirection: "row", backgroundColor: "#eff6ff", borderBottomWidth: 1, borderBottomColor: "#dbeafe" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  footRow: { flexDirection: "row", backgroundColor: "#f8fafc" },
  th: { padding: 5, fontSize: 8, fontWeight: 700, color: "#1e3a8a" },
  td: { padding: 5, fontSize: 8.5 },
  tf: { padding: 5, fontSize: 8.5, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#94a3b8",
  },
});

function stripMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[-•]\s+/gm, "• ");
}

// Primeira coluna (texto) fica mais larga; colunas numericas mais estreitas.
function columnFlex(index: number, align?: string) {
  if (index === 0) return 3;
  return align === "right" ? 1.3 : 1.6;
}

export function AiReportPdfDocument({ data }: { data: AiReportPdfData }) {
  return (
    <Document title={data.title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {data.logoDataUrl ? <Image src={data.logoDataUrl} style={styles.logo} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.company}>V2 COMÉRCIO DE ELETRÔNICOS</Text>
            <Text style={styles.sub}>Relatório gerado pelo Assistente V2 (IA)</Text>
          </View>
          <View>
            <Text style={styles.sub}>{data.generatedAt}</Text>
            <Text style={styles.sub}>{data.generatedBy}</Text>
          </View>
        </View>

        <Text style={styles.title}>{data.title}</Text>
        {data.question ? <Text style={styles.question}>Pedido: “{data.question}”</Text> : null}

        {data.analysis ? (
          <View style={styles.analysisBox} wrap={false}>
            <Text style={styles.analysisLabel}>Análise</Text>
            <Text style={styles.analysisText}>{stripMarkdown(data.analysis)}</Text>
          </View>
        ) : null}

        {data.tables.map((table, ti) => (
          // Espaco so ENTRE tabelas: margem depois da ultima gerava pagina em branco.
          <View key={ti} style={ti > 0 ? { marginTop: 14 } : undefined}>
            <Text style={styles.tableTitle} minPresenceAhead={40}>
              {table.title}
            </Text>
            <View style={styles.table}>
              <View style={styles.thRow} fixed>
                {table.columns.map((c, ci) => (
                  <Text key={c.key} style={[styles.th, { flex: columnFlex(ci, c.align), textAlign: c.align ?? "left" }]}>
                    {c.label}
                  </Text>
                ))}
              </View>
              {table.rows.map((row, ri) => (
                <View key={ri} style={styles.row} wrap={false}>
                  {table.columns.map((c, ci) => (
                    <Text key={c.key} style={[styles.td, { flex: columnFlex(ci, c.align), textAlign: c.align ?? "left" }]}>
                      {row[c.key] ?? ""}
                    </Text>
                  ))}
                </View>
              ))}
              {table.footer ? (
                <View style={styles.footRow} wrap={false}>
                  {table.columns.map((c, ci) => (
                    <Text key={c.key} style={[styles.tf, { flex: columnFlex(ci, c.align), textAlign: c.align ?? "left" }]}>
                      {table.footer?.[c.key] ?? ""}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>V2 Distribuidora - CRM</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
