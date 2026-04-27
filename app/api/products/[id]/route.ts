import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 1];

  if (!id) {
    return NextResponse.json({ error: "ID não recebido" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];

    if (!id) {
      return NextResponse.json({ error: "ID não recebido" }, { status: 400 });
    }

    const body = await request.json();

    const sku = String(body.sku ?? "").trim();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const barcode = body.barcode ? String(body.barcode).trim() : null;
    const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;

    const purchaseCostCents = Number(body.purchaseCostCents ?? 0);
    const packagingCostCents = Number(body.packagingCostCents ?? 0);
    const extraCostCents = Number(body.extraCostCents ?? 0);
    const taxCostCents = Number(body.taxCostCents ?? 0);
    const freightCostCents = Number(body.freightCostCents ?? 0);

    const priceCents = Number(body.priceCents ?? 0);

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

    const product = await prisma.product.update({
      where: { id },
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

    return NextResponse.json(product);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar produto", details: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}