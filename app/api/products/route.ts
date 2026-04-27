import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function buildResolvedImageUrl(
  imageUrl: string | null | undefined,
  sku: string | null | undefined,
  name: string | null | undefined
) {
  if (imageUrl && String(imageUrl).trim()) {
    return String(imageUrl).trim();
  }

  const params = new URLSearchParams();

  if (sku) {
    params.set("sku", String(sku));
  }

  if (name) {
    params.set("name", String(name));
  }

  if (!params.toString()) {
    return null;
  }

  return `/api/product-image?${params.toString()}`;
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    const productsWithImages = products.map((product) => {
      return {
        ...product,
        imageUrl: buildResolvedImageUrl(
          product.imageUrl,
          product.sku,
          product.name
        ),
      };
    });

    return NextResponse.json(productsWithImages);
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar produtos",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sku = String(body.sku ?? "").trim();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const barcode = body.barcode ? String(body.barcode).trim() : null;
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;

    const priceCents = Number(body.priceCents ?? 0);

    const purchaseCostCents = Number(body.purchaseCostCents ?? 0);
    const packagingCostCents = Number(body.packagingCostCents ?? 0);
    const extraCostCents = Number(body.extraCostCents ?? 0);
    const taxCostCents = Number(body.taxCostCents ?? 0);
    const freightCostCents = Number(body.freightCostCents ?? 0);

    const commissionCents = Number(body.commissionCents ?? 0);

    const ncm = body.ncm ? String(body.ncm).trim() : null;
    const cest = body.cest ? String(body.cest).trim() : null;
    const origem = body.origem ? String(body.origem) : "2";

    const active = body.active === false ? false : true;

    if (!sku || !name || !category) {
      return NextResponse.json(
        { error: "sku, name e category são obrigatórios" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        category,
        barcode,
        imageUrl,
        priceCents,
        purchaseCostCents,
        packagingCostCents,
        extraCostCents,
        taxCostCents,
        freightCostCents,
        commissionCents,
        ncm,
        cest,
        origem,
        active,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao criar produto", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}