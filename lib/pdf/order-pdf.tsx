import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

type OrderPdfInstallment = {
  installmentNumber: number;
  amountCents: number;
  dueDate: string | null;
};

type OrderPdfItem = {
  id: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitCents: number;
  subtotalCents: number;
  imageUrl: string | null;
};

export type OrderPdfData = {
  orderId: string;
  orderNumber: number;
  createdAt: string;
  notes: string | null;
  paymentMethod: string;
  paymentStatus: string;
  type: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  baseUrl: string;
  logoDataUrl: string | null;
  client: {
    name: string;
    legalName: string | null;
    cnpj: string | null;
    cpf: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    street: string | null;
    number: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
  };
  region: {
    name: string;
  } | null;
  seller: {
    name: string;
  } | null;
  items: OrderPdfItem[];
  installments: OrderPdfInstallment[];
};

function formatMoneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTimeShort(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

function buildClientAddress(data: OrderPdfData["client"]) {
  const parts = [
    data.street,
    data.number,
    data.district,
    data.city,
    data.state,
    data.cep ? `CEP: ${data.cep}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" - ") : "-";
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 26,
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
    paddingBottom: 12,
    marginBottom: 12,
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
    marginBottom: 2,
  },
  headerRight: {
    width: 150,
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
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 4,
    textAlign: "right",
  },
  clientCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#ffffff",
  },
  clientName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 6,
  },
  clientText: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 3,
    lineHeight: 1.35,
  },
  sectionTitle: {
    fontSize: 9,
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#dbeafe",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    minHeight: 54,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  colImage: {
    width: 52,
    paddingRight: 8,
  },
  colProduct: {
    flex: 1,
    paddingRight: 8,
  },
  colQty: {
    width: 42,
    textAlign: "center",
  },
  colUnit: {
    width: 78,
    textAlign: "right",
  },
  colTotal: {
    width: 82,
    textAlign: "right",
  },
  th: {
    fontSize: 8,
    fontWeight: 700,
    color: "#1e3a8a",
  },
  td: {
    fontSize: 9,
    color: "#111827",
  },
  productName: {
    fontSize: 9,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  productSku: {
    fontSize: 8,
    color: "#64748b",
  },
  itemImageBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemImage: {
    width: 38,
    height: 38,
    objectFit: "contain",
  },
  noImage: {
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
  bottomGrid: {
    flexDirection: "row",
    gap: 14,
  },
  paymentCard: {
    flex: 1.2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
  },
  totalsCard: {
    width: 220,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  sectionText: {
    fontSize: 9,
    color: "#334155",
    marginBottom: 3,
    lineHeight: 1.35,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 9,
    color: "#475569",
  },
  totalValue: {
    fontSize: 9,
    color: "#0f172a",
    fontWeight: 700,
  },
  grandTotalWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2563eb",
  },
  paymentTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
    marginBottom: 6,
  },
  paymentRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  payCol1: {
    width: 56,
    fontSize: 9,
    color: "#334155",
  },
  payCol2: {
    flex: 1,
    fontSize: 9,
    color: "#334155",
  },
  payCol3: {
    width: 84,
    textAlign: "right",
    fontSize: 9,
    color: "#0f172a",
    fontWeight: 700,
  },
  observations: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  footer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 9,
    color: "#475569",
    textAlign: "center",
    lineHeight: 1.45,
  },
});

export function OrderPdfDocument({ data }: { data: OrderPdfData }) {
  const clientAddress = buildClientAddress(data.client);

  return (
    <Document title={`Pedido ${data.orderNumber}`}>
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
              <Text style={styles.companySubline}>
                MP COMÉRCIO E SERVIÇOS LTDA
              </Text>
              <Text style={styles.companySmall}>
                CNPJ: 39.531.220/0001-87 | IE: 262278243
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.rightLine}>{formatDateTimeShort(data.createdAt)}</Text>
            <Text style={styles.rightStrong}>Venda {data.orderNumber}</Text>
            <Text style={styles.rightLine}>(49) 9809-6085</Text>
            <Text style={styles.rightLine}>contato@v2distribuidora.com</Text>
          </View>
        </View>

        <View style={styles.clientCard}>
          <Text style={styles.clientName}>
            {data.client.name || data.client.legalName || "-"}
          </Text>
          <Text style={styles.clientText}>
            Razão social: {data.client.legalName || "-"}
          </Text>
          <Text style={styles.clientText}>CNPJ: {data.client.cnpj || "-"}</Text>
          <Text style={styles.clientText}>CPF: {data.client.cpf || "-"}</Text>
          <Text style={styles.clientText}>
            WhatsApp: {data.client.whatsapp || data.client.phone || "-"}
          </Text>
          <Text style={styles.clientText}>E-mail: {data.client.email || "-"}</Text>
          <Text style={styles.clientText}>Endereço: {clientAddress}</Text>
        </View>

        <Text style={styles.sectionTitle}>Itens do pedido</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colImage]}>Foto</Text>
            <Text style={[styles.th, styles.colProduct]}>Produto</Text>
            <Text style={[styles.th, styles.colQty]}>Qtd</Text>
            <Text style={[styles.th, styles.colUnit]}>Unitário</Text>
            <Text style={[styles.th, styles.colTotal]}>Subtotal</Text>
          </View>

          {data.items.map((item, index) => {
            const isLast = index === data.items.length - 1;

            return (
              <View
                key={item.id}
                style={[styles.row, ...(isLast ? [styles.lastRow] : [])]}
              >
                <View style={styles.colImage}>
                  <View style={styles.itemImageBox}>
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} style={styles.itemImage} />
                    ) : (
                      <Text style={styles.noImage}>Sem foto</Text>
                    )}
                  </View>
                </View>

                <View style={styles.colProduct}>
                  <Text style={styles.productName}>{item.productName}</Text>
                  <Text style={styles.productSku}>
                    SKU: {item.productSku || "-"}
                  </Text>
                </View>

                <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.td, styles.colUnit]}>
                  {formatMoneyFromCents(item.unitCents)}
                </Text>
                <Text style={[styles.td, styles.colTotal]}>
                  {formatMoneyFromCents(item.subtotalCents)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomGrid}>
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Condição de pagamento</Text>
            <Text style={styles.sectionText}>
              Forma de pagamento: {data.paymentMethod}
            </Text>

            <View style={styles.paymentTableHeader}>
              <Text style={styles.payCol1}>Parcela</Text>
              <Text style={styles.payCol2}>Vencimento</Text>
              <Text style={styles.payCol3}>Valor</Text>
            </View>

            {data.installments.length > 0 ? (
              data.installments.map((item) => (
                <View key={item.installmentNumber} style={styles.paymentRow}>
                  <Text style={styles.payCol1}>{item.installmentNumber}ª</Text>
                  <Text style={styles.payCol2}>{formatDate(item.dueDate)}</Text>
                  <Text style={styles.payCol3}>
                    {formatMoneyFromCents(item.amountCents)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.paymentRow}>
                <Text style={styles.payCol1}>1ª</Text>
                <Text style={styles.payCol2}>Sem parcelamento registrado</Text>
                <Text style={styles.payCol3}>
                  {formatMoneyFromCents(data.totalCents)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.totalsCard}>
            <Text style={styles.sectionTitle}>Totais</Text>

            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Valor líquido</Text>
              <Text style={styles.totalValue}>
                {formatMoneyFromCents(data.subtotalCents)}
              </Text>
            </View>

            <View style={styles.totalLine}>
              <Text style={styles.totalLabel}>Desconto</Text>
              <Text style={styles.totalValue}>
                {formatMoneyFromCents(data.discountCents)}
              </Text>
            </View>

            <View style={styles.grandTotalWrap}>
              <View style={styles.totalLine}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatMoneyFromCents(data.totalCents)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.observations}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <Text style={styles.sectionText}>
            {data.notes?.trim() ? data.notes : "Sem observações informadas."}
          </Text>
        </View>

        <Text style={styles.footer}>
          Agradecemos pela preferência. Estamos à disposição para maiores
          informações e para continuar atendendo você com qualidade e confiança.
        </Text>
      </Page>
    </Document>
  );
}