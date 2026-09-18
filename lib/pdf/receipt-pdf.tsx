import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

export type ReceiptPdfData = {
  receiptId: string;
  orderNumber: number | null;
  amountCents: number;
  paymentMethod: string;
  receivedAt: string;
  installmentNumber: number | null;
  installmentCount: number | null;
  notes: string | null;
  logoDataUrl: string | null;
  client: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    cpf: string | null;
  };
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  BOLETO: "Boleto",
  CARD_DEBIT: "Cartão de débito",
  CARD_CREDIT: "Cartão de crédito",
};

function formatMoneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 26,
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
    borderBottomWidth: 1,
    borderBottomColor: "#dbe3ef",
    paddingBottom: 14,
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  logoImage: {
    width: 52,
    height: 52,
    objectFit: "contain",
  },
  logoText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2563eb",
  },
  companyBlock: {
    flex: 1,
    justifyContent: "flex-start",
  },
  companyName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 3,
  },
  companySubline: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 2,
  },
  companySmall: {
    fontSize: 9,
    color: "#475569",
  },
  headerRight: {
    width: 160,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  rightLine: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 3,
    textAlign: "right",
  },
  rightStrong: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 4,
    textAlign: "right",
  },
  titleBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#16a34a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  amountCard: {
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 10,
    color: "#166534",
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#15803d",
  },
  detailsCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 9,
    color: "#64748b",
  },
  detailValue: {
    fontSize: 10,
    color: "#0f172a",
    fontWeight: 700,
  },
  thanksCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  thanksTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 6,
  },
  thanksText: {
    fontSize: 9.5,
    color: "#1e40af",
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8.5,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 1.4,
  },
});

export function ReceiptPdfDocument({ data }: { data: ReceiptPdfData }) {
  const installmentLabel =
    data.installmentNumber && data.installmentCount
      ? `${data.installmentNumber}/${data.installmentCount}`
      : "Pagamento à vista";

  return (
    <Document title={`Recibo ${data.receiptId}`}>
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

            <View style={styles.companyBlock}>
              <Text style={styles.companyName}>V2 COMÉRCIO DE ELETRÔNICOS</Text>
              <Text style={styles.companySubline}>MP COMÉRCIO E SERVIÇOS LTDA</Text>
              <Text style={styles.companySmall}>CNPJ: 39.531.220/0001-87 | IE: 262278243</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.rightLine}>{formatDate(data.receivedAt)}</Text>
            {data.orderNumber ? (
              <Text style={styles.rightStrong}>Pedido {data.orderNumber}</Text>
            ) : null}
            <Text style={styles.rightLine}>(49) 9809-6085</Text>
            <Text style={styles.rightLine}>contato@v2distribuidora.com</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Recibo de Pagamento</Text>
          <Text style={styles.subtitle}>
            {data.client.name}
            {data.client.cnpj ? ` - CNPJ: ${data.client.cnpj}` : data.client.cpf ? ` - CPF: ${data.client.cpf}` : ""}
          </Text>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Valor recebido</Text>
          <Text style={styles.amountValue}>{formatMoneyFromCents(data.amountCents)}</Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Forma de pagamento</Text>
            <Text style={styles.detailValue}>
              {PAYMENT_METHOD_LABEL[data.paymentMethod] ?? data.paymentMethod}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Data do pagamento</Text>
            <Text style={styles.detailValue}>{formatDate(data.receivedAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Parcela</Text>
            <Text style={styles.detailValue}>{installmentLabel}</Text>
          </View>
          {data.orderNumber ? (
            <View style={[styles.detailRow, styles.lastDetailRow]}>
              <Text style={styles.detailLabel}>Pedido</Text>
              <Text style={styles.detailValue}>Nº {data.orderNumber}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.thanksCard}>
          <Text style={styles.thanksTitle}>Obrigado pela parceria!</Text>
          <Text style={styles.thanksText}>
            Agradecemos a confiança e a preferência pela V2 Distribuidora. Este documento
            confirma o recebimento do valor acima referente ao seu pedido. Continuamos à
            disposição para o que precisar.
          </Text>
        </View>

        <Text style={styles.footer}>
          Este recibo foi gerado automaticamente pelo sistema V2 no momento da confirmação
          do pagamento e não substitui a nota fiscal, quando aplicável.
        </Text>
      </Page>
    </Document>
  );
}
