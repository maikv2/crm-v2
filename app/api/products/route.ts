import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function getProductsImageMap() {
  const productsDir = path.join(process.cwd(), "public", "products");

  try {
    const files = await fs.readdir(productsDir);

    const imageFiles = files.filter((file) =>
      /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file)
    );

    const map: Record<string, string> = {};

    for (const file of imageFiles) {
      const name = normalize(file);

      if (name.includes("cabo v8")) {
        map["CB001"] = `/products/${encodeURIComponent(file)}`;
      } else if (name.includes("cabo tc + ios")) {
        map["CB005"] = `/products/${encodeURIComponent(file)}`;
      } else if (name.includes("cabo tc +")) {
        map["CB004"] = `/products/${encodeURIComponent(file)}`;
      } else if (name.includes("cabo ios")) {
        map["CB003"] = `/products/${encodeURIComponent(file)}`;
      } else if (name.includes("cabo tc")) {
        map["CB002"] = `/products/${encodeURIComponent(file)}`;
      }
    }

    return map;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    const imageMap = await getProductsImageMap();

    const productsWithImages = products.map((product) => {
      const sku = String(product.sku ?? "").trim().toUpperCase();

      return {
        ...product,
        imageUrl: product.imageUrl || imageMap[sku] || null,
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