import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { sendDocument, ZApiConfigError } from "@/lib/zapi";
import { ReceiptPdfDocument, ReceiptPdfData } from "@/lib/pdf/receipt-pdf";
import { ProductHighlightsPdfDocument, ProductHighlightsPdfData } from "@/lib/pdf/product-highlights-pdf";

const STORE_URL = "https://v2distribuidora.com/loja";

function buildSiteImageUrl(sku: string) {
  return `https://v2distribuidora.com/produtos/${sku.toLowerCase()}/1.jpg`;
}

/**
 * Busca a foto do produto no site e converte pra data URL - @react-pdf
 * as vezes recusa imagem remota (formato nao reconhecido, 404, etc), entao
 * baixamos e validamos antes de colocar no PDF. Retorna null se a foto nao
 * existir ou nao for uma imagem valida, pra esse produto ser pulado.
 */
async function fetchProductImageAsDataUrl(sku: string): Promise<string | null> {
  try {
    const res = await fetch(buildSiteImageUrl(sku), { cache: "no-store" });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) return null;

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Manda um PDF com 3 produtos aleatorios do catalogo do site e o link da
 * loja - disparado depois do recibo, como um empurrãozinho pra proxima
 * compra. Nunca lanca erro pra fora.
 */
async function sendProductHighlights(params: { whatsapp: string; logoDataUrl: string | null }) {
  try {
    const products = await prisma.product.findMany({
      where: { active: true, sitePriceCents: { not: null } },
      select: { sku: true, name: true, sitePriceCents: true },
    });

    if (products.length < 3) return;

    // Tenta ate 10 candidatos aleatorios pra achar 3 com foto valida no
    // site - alguns produtos ainda nao tem foto cadastrada.
    const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, 10);

    const items: ProductHighlightsPdfData["items"] = [];
    for (const product of shuffled) {
      if (items.length >= 3) break;

      const imageUrl = await fetchProductImageAsDataUrl(product.sku);
      if (!imageUrl) continue;

      items.push({
        sku: product.sku,
        name: product.name,
        priceCents: product.sitePriceCents ?? 0,
        imageUrl,
      });
    }

    if (items.length < 3) return;

    const data: ProductHighlightsPdfData = {
      logoDataUrl: params.logoDataUrl,
      storeUrl: STORE_URL,
      items,
    };

    const pdfElement = React.createElement(ProductHighlightsPdfDocument as React.ComponentType<any>, { data });
    const pdfBuffer = await renderToBuffer(pdfElement);

    await sendDocument({
      phone: params.whatsapp,
      document: pdfBuffer,
      fileName: "ofertas-v2-distribuidora.pdf",
      extension: "pdf",
      caption: `🛍️ Separamos algumas novidades pra você! Confira mais na nossa loja: ${STORE_URL}`,
    });
  } catch (error) {
    if (error instanceof ZApiConfigError) {
      console.warn("WhatsApp nao configurado - destaques de produtos nao enviados.");
    } else {
      console.error("Falha ao gerar/enviar destaques de produtos:", error);
    }
  }
}

async function readLogoAsDataUrl() {
  const publicDir = path.join(process.cwd(), "public");
  const candidates = ["logo.png", "logo.jpg", "logo.jpeg", "logo.webp", "logo.svg"];

  for (const fileName of candidates) {
    const filePath = path.join(publicDir, fileName);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(fileName).toLowerCase();

      let mime = "application/octet-stream";
      if (ext === ".png") mime = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
      if (ext === ".webp") mime = "image/webp";
      if (ext === ".svg") mime = "image/svg+xml";

      return `data:${mime};base64,${fileBuffer.toString("base64")}`;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Gera o PDF do recibo e manda pro WhatsApp do cliente - chamado sempre que
 * um pagamento e confirmado (webhook Efi, conciliacao automatica ou baixa
 * manual no CRM), a partir do Receipt ja criado por markReceivableInstallmentPaid.
 * Nunca lanca erro pra fora: falha aqui nao pode derrubar a confirmacao do
 * pagamento em si.
 */
export async function sendPaymentReceipt(receiptId: string) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        order: { select: { number: true } },
        accountsReceivable: {
          include: {
            client: { select: { name: true, legalName: true, cnpj: true, cpf: true, whatsapp: true, phone: true } },
          },
        },
      },
    });

    if (!receipt) return;

    const client = receipt.accountsReceivable.client;
    const whatsapp = client.whatsapp || client.phone;

    if (!whatsapp) {
      console.warn("Cliente sem WhatsApp cadastrado - recibo nao enviado.", { receiptId });
      return;
    }

    // Descobre o numero/total da parcela a partir das notas gravadas por
    // markReceivableInstallmentPaid ("Baixa da parcela X/Y."), sem precisar
    // de mais uma tabela - fallback pro total de parcelas da cobranca.
    const installmentMatch = receipt.notes?.match(/parcela (\d+)\/(\d+)/i);
    const installmentNumber = installmentMatch ? Number(installmentMatch[1]) : null;
    const installmentCount = installmentMatch
      ? Number(installmentMatch[2])
      : receipt.accountsReceivable.installmentCount;

    const logoDataUrl = await readLogoAsDataUrl();

    const data: ReceiptPdfData = {
      receiptId: receipt.id,
      orderNumber: receipt.order?.number ?? null,
      amountCents: receipt.amountCents,
      paymentMethod: receipt.paymentMethod,
      receivedAt: receipt.receivedAt.toISOString(),
      installmentNumber,
      installmentCount,
      notes: receipt.notes,
      logoDataUrl,
      client: {
        name: client.name,
        legalName: client.legalName,
        cnpj: client.cnpj,
        cpf: client.cpf,
      },
    };

    const pdfElement = React.createElement(ReceiptPdfDocument as React.ComponentType<any>, { data });
    const pdfBuffer = await renderToBuffer(pdfElement);

    await sendDocument({
      phone: whatsapp,
      document: pdfBuffer,
      fileName: `recibo-${receipt.order?.number ?? receipt.id.slice(0, 8)}.pdf`,
      extension: "pdf",
      caption:
        `✅ Recibo de pagamento - V2 Distribuidora\n\n` +
        `Recebemos seu pagamento, obrigado pela parceria e pela preferência! 🙏`,
    });

    await sendProductHighlights({ whatsapp, logoDataUrl });
  } catch (error) {
    if (error instanceof ZApiConfigError) {
      console.warn("WhatsApp nao configurado - recibo nao enviado.", { receiptId });
    } else {
      console.error("Falha ao gerar/enviar recibo de pagamento:", error);
    }
  }
}
