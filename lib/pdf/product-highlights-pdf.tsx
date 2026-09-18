import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Link } from "@react-pdf/renderer";

export type ProductHighlightItem = {
  sku: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  productUrl: string;
};

export type ProductHighlightsPdfData = {
  logoDataUrl: string | null;
  storeUrl: string;
  items: ProductHighlightItem[];
};

function formatMoneyFromCents(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#dbe3ef",
    paddingBottom: 14,
    marginBottom: 20,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dbe3ef",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 46,
    height: 46,
    objectFit: "contain",
  },
  logoText: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2563eb",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 9.5,
    color: "#64748b",
  },
  grid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  cardImageBox: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  noImage: {
    fontSize: 8,
    color: "#94a3b8",
  },
  cardName: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  cardPrice: {
    fontSize: 13,
    fontWeight: 700,
    color: "#2563eb",
    marginBottom: 6,
  },
  cardLink: {
    fontSize: 8,
    color: "#2563eb",
    textDecoration: "none",
    textAlign: "center",
  },
  ctaCard: {
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 6,
    textAlign: "center",
  },
  ctaText: {
    fontSize: 9.5,
    color: "#1e40af",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 1.5,
  },
  ctaLink: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2563eb",
    textDecoration: "none",
  },
  footer: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 8.5,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export function ProductHighlightsPdfDocument({ data }: { data: ProductHighlightsPdfData }) {
  return (
    <Document title="Ofertas V2 Distribuidora">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            {data.logoDataUrl ? (
              <Image src={data.logoDataUrl} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoText}>V2</Text>
            )}
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle}>Separamos algumas novidades pra você</Text>
            <Text style={styles.headerSubtitle}>
              Confira também na nossa loja online
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {data.items.map((item) => (
            <View key={item.sku} style={styles.card}>
              <View style={styles.cardImageBox}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} style={styles.cardImage} />
                ) : (
                  <Text style={styles.noImage}>Sem foto</Text>
                )}
              </View>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardPrice}>{formatMoneyFromCents(item.priceCents)}</Text>
              <Link src={item.productUrl} style={styles.cardLink}>
                Ver na loja
              </Link>
            </View>
          ))}
        </View>

        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Quer ver mais opções?</Text>
          <Text style={styles.ctaText}>
            Acesse nossa loja online e confira o catálogo completo, com preços especiais de
            atacado pra você revender com tranquilidade.
          </Text>
          <Link src={data.storeUrl} style={styles.ctaLink}>
            {data.storeUrl}
          </Link>
        </View>

        <Text style={styles.footer}>V2 Distribuidora - MP Comércio e Serviços LTDA</Text>
      </Page>
    </Document>
  );
}
