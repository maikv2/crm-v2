import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getExhibitorTypeLabel } from "@/lib/exhibitors";
import { ExhibitorPdfDocument, type ExhibitorPdfData } from "@/lib/pdf/exhibitor-pdf";

async function readLogoAsDataUrl() {
  const publicDir = path.join(process.cwd(), "public");
  const candidates = ["logo.png", "logo.jpg", "logo.jpeg", "logo.webp"];

  for (const fileName of candidates) {
    try {
      const fileBuffer = await fs.readFile(path.join(publicDir, fileName));
      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return `data:${mime};base64,${fileBuffer.toString("base64")}`;
    } catch {
      continue;
    }
  }

  return null;
}

const productSelect = {
  quantity: true,
  product: { select: { name: true, sku: true, priceCents: true } },
} as const;

/**
 * Monta o PDF com o que ficou nos expositores do cliente. Mesma regra do
 * portal: estoque atual do expositor, ou os itens iniciais enquanto o
 * estoque ainda nao foi registrado. Expositores retirados/inativos ficam fora.
 */
export async function buildClientExhibitorPdf(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      tradeName: true,
      legalName: true,
      code: true,
      cnpj: true,
      cpf: true,
      city: true,
      state: true,
      whatsapp: true,
      phone: true,
      regionId: true,
      exhibitors: {
        where: { status: { notIn: ["REMOVED", "INACTIVE"] }, removedAt: null },
        orderBy: { installedAt: "asc" },
        select: {
          code: true,
          name: true,
          type: true,
          installedAt: true,
          lastVisitAt: true,
          nextVisitAt: true,
          stocks: { select: productSelect, orderBy: { product: { name: "asc" } } },
          initialItems: { select: productSelect, orderBy: { product: { name: "asc" } } },
        },
      },
    },
  });

  if (!client) return null;

  const data: ExhibitorPdfData = {
    generatedAt: new Date().toISOString(),
    logoDataUrl: await readLogoAsDataUrl(),
    client: {
      name: client.tradeName || client.name,
      legalName: client.legalName || client.name,
      code: client.code,
      document: client.cnpj ? `CNPJ: ${client.cnpj}` : client.cpf ? `CPF: ${client.cpf}` : null,
      city: client.city,
      state: client.state,
    },
    exhibitors: client.exhibitors.map((exhibitor, index) => {
      const items = exhibitor.stocks.length > 0 ? exhibitor.stocks : exhibitor.initialItems;
      const typeLabel = exhibitor.type ? getExhibitorTypeLabel(exhibitor.type) : null;
      return {
        label:
          exhibitor.name ||
          (exhibitor.code ? `Expositor ${exhibitor.code}` : `Expositor ${index + 1}`),
        typeLabel: typeLabel && typeLabel !== "-" ? typeLabel : null,
        installedAt: exhibitor.installedAt.toISOString(),
        lastVisitAt: exhibitor.lastVisitAt?.toISOString() ?? null,
        nextVisitAt: exhibitor.nextVisitAt?.toISOString() ?? null,
        products: items
          .filter((item) => item.quantity > 0)
          .map((item) => ({
            name: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unitCents: item.product.priceCents ?? 0,
          })),
      };
    }),
  };

  const buffer = await renderToBuffer(<ExhibitorPdfDocument data={data} />);

  return { client, data, buffer };
}
