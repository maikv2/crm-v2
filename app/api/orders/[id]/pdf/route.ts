import React from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { OrderPdfDocument, OrderPdfData } from "@/lib/pdf/order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeText(value: string | null | undefined) {
  return value ?? null;
}

function buildProductImageUrl(baseUrl: string, sku: string | null, name: string | null) {
  const params = new URLSearchParams();

  if (sku) params.set("sku", sku);
  if (name) params.set("name", name);

  return `${baseUrl}/api/product-image?${params.toString()}`;
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const requestUrl = new URL(request.url);
    const baseUrl = requestUrl.origin;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        seller: true,
        items: {
          include: {
            product: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        accountsReceivables: {
          include: {
            installments: {
              orderBy: {
                installmentNumber: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const installments = order.accountsReceivables.flatMap((receivable) =>
      receivable.installments.map((item) => ({
        installmentNumber: item.installmentNumber,
        amountCents: item.amountCents,
        dueDate: item.dueDate.toISOString(),
      }))
    );

    const logoDataUrl = await readLogoAsDataUrl();

    const data: OrderPdfData = {
      orderId: order.id,
      orderNumber: order.number,
      createdAt: order.createdAt.toISOString(),
      notes: normalizeText(order.notes),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      type: order.type,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      totalCents: order.totalCents,
      baseUrl,
      logoDataUrl,
      client: {
        name: order.client.name,
        legalName: normalizeText(order.client.legalName),
        cnpj: normalizeText(order.client.cnpj),
        cpf: normalizeText(order.client.cpf),
        email: normalizeText(order.client.email),
        phone: normalizeText(order.client.phone),
        whatsapp: normalizeText(order.client.whatsapp),
        street: normalizeText(order.client.street),
        number: normalizeText(order.client.number),
        district: normalizeText(order.client.district),
        city: normalizeText(order.client.city),
        state: normalizeText(order.client.state),
        cep: normalizeText(order.client.cep),
      },
      region: order.region
        ? {
            name: order.region.name,
          }
        : null,
      seller: order.seller
        ? {
            name: order.seller.name,
          }
        : null,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        productSku: item.product.sku ?? null,
        quantity: item.qty,
        unitCents: item.unitCents,
        subtotalCents: item.qty * item.unitCents,
        imageUrl: buildProductImageUrl(
          baseUrl,
          item.product.sku ?? null,
          item.product.name ?? null
        ),
      })),
      installments,
    };

    const pdfElement = React.createElement(
      OrderPdfDocument as React.ComponentType<any>,
      { data }
    );

    const pdfBuffer = await renderToBuffer(pdfElement);
    const pdfBytes = new Uint8Array(pdfBuffer);

    const fileName = `pedido-${order.number}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating order PDF:", error);

    return NextResponse.json(
      { error: "Não foi possível gerar o PDF do pedido." },
      { status: 500 }
    );
  }
}