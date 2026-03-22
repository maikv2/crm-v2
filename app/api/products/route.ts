import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

function normalize(value: string) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeSku(value: string) {
  return normalize(value).replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/i, "");
}

function buildPublicImagePath(fileName: string) {
  return `/products/${encodeURIComponent(fileName)}`;
}

function containsAll(text: string, terms: string[]) {
  return terms.every((term) => text.includes(term));
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function buildSearchTerms(product: { sku?: string | null; name?: string | null }) {
  const skuRaw = String(product.sku ?? "").trim();
  const nameRaw = String(product.name ?? "").trim();

  const sku = normalize(skuRaw);
  const skuCompact = normalizeSku(skuRaw);
  const name = normalize(nameRaw);
  const nameCompact = normalizeSku(nameRaw);

  const terms = new Set<string>();

  if (sku) terms.add(sku);
  if (skuCompact) terms.add(skuCompact);
  if (name) terms.add(name);
  if (nameCompact) terms.add(nameCompact);

  const isCable =
    sku.includes("cb") ||
    name.includes("cabo") ||
    name.includes("type c") ||
    name.includes("usb-c") ||
    name.includes("lightning") ||
    name.includes("ios") ||
    name.includes("v8");

  if (isCable) {
    terms.add("cabo");

    if (containsAny(name, ["v8", "micro usb", "micro-usb"])) {
      terms.add("v8");
      terms.add("micro usb");
      terms.add("microusb");
    }

    if (containsAny(name, ["ios", "lightning"])) {
      terms.add("ios");
      terms.add("lightning");
    }

    if (
      containsAny(name, [
        "type c",
        "tipo c",
        "usb-c",
        "usbc",
        "tc",
      ])
    ) {
      terms.add("type c");
      terms.add("tipo c");
      terms.add("usb-c");
      terms.add("usbc");
      terms.add("tc");
    }

    if (
      (containsAny(name, ["ios", "lightning"]) &&
        containsAny(name, ["type c", "tipo c", "usb-c", "usbc", "tc"])) ||
      containsAll(name, ["ios", "tc"])
    ) {
      terms.add("tc ios");
      terms.add("type c ios");
      terms.add("lightning type c");
      terms.add("cabo tc + ios");
    }
  }

  return Array.from(terms).filter(Boolean);
}

function scoreImageMatch(
  fileName: string,
  product: { sku?: string | null; name?: string | null }
) {
  const normalizedFile = normalize(removeExtension(fileName));
  const compactFile = normalizeSku(removeExtension(fileName));
  const sku = String(product.sku ?? "").trim();
  const name = String(product.name ?? "").trim();
  const normalizedSku = normalize(sku);
  const compactSku = normalizeSku(sku);
  const normalizedName = normalize(name);
  const compactName = normalizeSku(name);
  const searchTerms = buildSearchTerms(product);

  let score = 0;

  if (!normalizedFile) return score;

  if (normalizedSku && normalizedFile === normalizedSku) score += 200;
  if (compactSku && compactFile === compactSku) score += 220;

  if (normalizedName && normalizedFile === normalizedName) score += 180;
  if (compactName && compactFile === compactName) score += 200;

  if (normalizedSku && normalizedFile.includes(normalizedSku)) score += 60;
  if (compactSku && compactFile.includes(compactSku)) score += 80;

  if (normalizedName && normalizedFile.includes(normalizedName)) score += 40;
  if (compactName && compactFile.includes(compactName)) score += 60;

  for (const term of searchTerms) {
    const normalizedTerm = normalize(term);
    const compactTerm = normalizeSku(term);

    if (normalizedTerm && normalizedFile.includes(normalizedTerm)) {
      score += 18;
    }

    if (compactTerm && compactFile.includes(compactTerm)) {
      score += 20;
    }
  }

  const isCableProduct =
    normalizedName.includes("cabo") ||
    normalizedSku.includes("cb") ||
    containsAny(normalizedName, ["type c", "usb-c", "ios", "lightning", "v8"]);

  if (isCableProduct && normalizedFile.includes("cabo")) {
    score += 30;
  }

  return score;
}

async function resolveProductImage(
  product: { sku?: string | null; name?: string | null; imageUrl?: string | null },
  imageFiles: string[]
) {
  if (product.imageUrl) {
    return product.imageUrl;
  }

  let bestFile: string | null = null;
  let bestScore = 0;

  for (const file of imageFiles) {
    const score = scoreImageMatch(file, product);

    if (score > bestScore) {
      bestScore = score;
      bestFile = file;
    }
  }

  if (!bestFile || bestScore < 35) {
    return null;
  }

  return buildPublicImagePath(bestFile);
}

async function getProductsImageFiles() {
  const productsDir = path.join(process.cwd(), "public", "products");

  try {
    const files = await fs.readdir(productsDir);

    return files.filter((file) => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file));
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
    });

    const imageFiles = await getProductsImageFiles();

    const productsWithImages = await Promise.all(
      products.map(async (product) => {
        const imageUrl = await resolveProductImage(product, imageFiles);

        return {
          ...product,
          imageUrl,
        };
      })
    );

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