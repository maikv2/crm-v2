import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// Relacao do que ficou no expositor do cliente (estoque em consignacao).
// Visual verde-azulado e aviso "nao e pedido" para nao confundir com o PDF do pedido.

export type ExhibitorPdfProduct = {
  name: string;
  sku: string | null;
  quantity: number;
  unitCents: number;
};

export type ExhibitorPdfExhibitor = {
  label: string;
  typeLabel: string | null;
  installedAt: string | null;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  products: ExhibitorPdfProduct[];
};

export type ExhibitorPdfData = {
  generatedAt: string;
  logoDataUrl: string | null;
  client: {
    name: string;
    legalName: string | null;
    code: string | null;
    document: string | null;
    city: string | null;
    state: string | null;
  };
  exhibitors: ExhibitorPdfExhibitor[];
};

const ACCENT = "#0f766e";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function date(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 14,
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12, flex: 1 },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: { width: 52, height: 52, objectFit: "contain" },
  logoText: { fontSize: 13, fontWeight: 700, color: ACCENT },
  companyName: { fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3 },
  companySubline: { fontSize: 9, color: "#334155", marginBottom: 2 },
  companySmall: { fontSize: 9, color: "#475569" },
  headerRight: { width: 170, alignItems: "flex-end" },
  rightLine: { fontSize: 9, color: "#334155", marginBottom: 3, textAlign: "right" },
  titleBlock: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: 17, fontWeight: 700, color: ACCENT, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#64748b" },
  notice: {
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#f0fdfa",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    fontSize: 9,
    color: "#115e59",
    lineHeight: 1.45,
  },
  clientCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  clientName: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
  clientLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
  exhibitorBlock: { marginBottom: 18 },
  exhibitorHeader: {
    backgroundColor: ACCENT,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  exhibitorTitle: { fontSize: 11, fontWeight: 700, color: "#ffffff" },
  exhibitorMeta: { fontSize: 8.5, color: "#ccfbf1", marginTop: 2 },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: "#e5e7eb",
    borderRightColor: "#e5e7eb",
  },
  headRow: { backgroundColor: "#f8fafc" },
  colName: { flex: 1, paddingRight: 8 },
  colQty: { width: 44, textAlign: "right" },
  colUnit: { width: 80, textAlign: "right" },
  colTotal: { width: 86, textAlign: "right" },
  headText: { fontSize: 8.5, fontWeight: 700, color: "#64748b" },
  cellText: { fontSize: 9.5, color: "#0f172a" },
  cellStrong: { fontSize: 9.5, color: "#0f172a", fontWeight: 700 },
  sku: { fontSize: 7.5, color: "#94a3b8", marginTop: 1 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#99f6e4",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  totalLabel: { fontSize: 10, fontWeight: 700, color: "#115e59" },
  totalValue: { fontSize: 11, fontWeight: 700, color: ACCENT },
  empty: {
    padding: 10,
    fontSize: 9,
    color: "#64748b",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    paddingTop: 10,
    marginTop: 4,
  },
  grandLabel: { fontSize: 11, fontWeight: 700 },
  grandValue: { fontSize: 13, fontWeight: 700, color: ACCENT },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export function ExhibitorPdfDocument({ data }: { data: ExhibitorPdfData }) {
  const allProducts = data.exhibitors.flatMap((e) => e.products);
  const grandUnits = allProducts.reduce((sum, p) => sum + p.quantity, 0);
  const grandCents = allProducts.reduce((sum, p) => sum + p.quantity * p.unitCents, 0);
  const place = [data.client.city, data.client.state].filter(Boolean).join(" / ");

  return (
    <Document title={`Expositor - ${data.client.name}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              {data.logoDataUrl ? (
                <Image src={data.logoDataUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoText}>V2</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>V2 COMÉRCIO DE ELETRÔNICOS</Text>
              <Text style={styles.companySubline}>MP COMÉRCIO E SERVIÇOS LTDA</Text>
              <Text style={styles.companySmall}>CNPJ: 39.531.220/0001-87 | IE: 262278243</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.rightLine}>Emitido em {date(data.generatedAt)}</Text>
            <Text style={styles.rightLine}>(49) 9809-6085</Text>
            <Text style={styles.rightLine}>contato@v2distribuidora.com</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Relação de Produtos do Expositor</Text>
          <Text style={styles.subtitle}>Mercadorias em consignação no seu estabelecimento</Text>
        </View>

        <Text style={styles.notice}>
          Este documento NÃO é um pedido nem uma cobrança. Ele mostra os produtos da V2 que estão
          no seu expositor, com o valor de cada item, para você conferir. Os valores só são
          cobrados conforme as vendas e reposições registradas nos pedidos.
        </Text>

        <View style={styles.clientCard}>
          <Text style={styles.clientName}>{data.client.name}</Text>
          {data.client.legalName && data.client.legalName !== data.client.name ? (
            <Text style={styles.clientLine}>{data.client.legalName}</Text>
          ) : null}
          {data.client.document ? <Text style={styles.clientLine}>{data.client.document}</Text> : null}
          <Text style={styles.clientLine}>
            {[data.client.code ? `Código: ${data.client.code}` : null, place || null]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
        </View>

        {data.exhibitors.map((exhibitor, index) => {
          const units = exhibitor.products.reduce((sum, p) => sum + p.quantity, 0);
          const cents = exhibitor.products.reduce((sum, p) => sum + p.quantity * p.unitCents, 0);

          return (
            <View key={index} style={styles.exhibitorBlock} wrap>
              <View style={styles.exhibitorHeader} wrap={false}>
                <Text style={styles.exhibitorTitle}>{exhibitor.label}</Text>
                <Text style={styles.exhibitorMeta}>
                  {[
                    exhibitor.typeLabel,
                    `Instalado em ${date(exhibitor.installedAt)}`,
                    exhibitor.lastVisitAt ? `Última visita ${date(exhibitor.lastVisitAt)}` : null,
                    exhibitor.nextVisitAt ? `Próxima visita ${date(exhibitor.nextVisitAt)}` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              </View>

              {exhibitor.products.length === 0 ? (
                <Text style={styles.empty}>Nenhum produto registrado neste expositor.</Text>
              ) : (
                <>
                  <View style={[styles.row, styles.headRow]}>
                    <Text style={[styles.colName, styles.headText]}>PRODUTO</Text>
                    <Text style={[styles.colQty, styles.headText]}>QTD.</Text>
                    <Text style={[styles.colUnit, styles.headText]}>VALOR UNIT.</Text>
                    <Text style={[styles.colTotal, styles.headText]}>TOTAL</Text>
                  </View>
                  {exhibitor.products.map((product, i) => (
                    <View key={i} style={styles.row} wrap={false}>
                      <View style={styles.colName}>
                        <Text style={styles.cellStrong}>{product.name}</Text>
                        {product.sku ? <Text style={styles.sku}>SKU: {product.sku}</Text> : null}
                      </View>
                      <Text style={[styles.colQty, styles.cellStrong]}>{product.quantity}</Text>
                      <Text style={[styles.colUnit, styles.cellText]}>{money(product.unitCents)}</Text>
                      <Text style={[styles.colTotal, styles.cellStrong]}>
                        {money(product.unitCents * product.quantity)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.totalRow} wrap={false}>
                    <Text style={styles.totalLabel}>Total do expositor ({units} un)</Text>
                    <Text style={styles.totalValue}>{money(cents)}</Text>
                  </View>
                </>
              )}
            </View>
          );
        })}

        {data.exhibitors.length > 1 ? (
          <View style={styles.grandTotal} wrap={false}>
            <Text style={styles.grandLabel}>Total geral ({grandUnits} un)</Text>
            <Text style={styles.grandValue}>{money(grandCents)}</Text>
          </View>
        ) : null}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Relação do expositor gerada pelo sistema V2 · não é pedido nem cobrança · página ${pageNumber} de ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
