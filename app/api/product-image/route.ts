import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];

const STOP_WORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "com",
  "sem",
  "para",
  "por",
  "produto",
  "produtos",
  "dados",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\+/g, " plus ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalize(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !STOP_WORDS.has(part));
}

function removeLeadingTimestamp(fileName: string) {
  return fileName.replace(/^\d+\s*-\s*/i, "").trim();
}

function removeExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function cleanImageName(fileName: string) {
  return removeExtension(removeLeadingTimestamp(fileName));
}

function isImageFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getSkuPrefix(sku: string) {
  const match = String(sku).trim().toUpperCase().match(/^[A-Z]+/);
  return match?.[0] ?? "";
}

async function getProductImageFiles() {
  const dirs = [
    path.join(process.cwd(), "public", "products"),
    path.join(process.cwd(), "public"),
  ];

  const files: { dir: string; file: string }[] = [];

  for (const dir of dirs) {
    try {
      const dirFiles = await fs.readdir(dir);
      dirFiles
        .filter(isImageFile)
        .forEach((file) => files.push({ dir, file }));
    } catch {
      continue;
    }
  }

  return files;
}

function buildAliases(sku: string, name: string) {
  const aliases = new Set<string>();
  const normalizedName = normalize(name);
  const nameTokens = tokenize(name);
  const skuPrefix = getSkuPrefix(sku);

  aliases.add(normalizedName);
  nameTokens.forEach((token) => aliases.add(token));

  if (skuPrefix === "CB") aliases.add("cabo");
  if (skuPrefix === "CR") aliases.add("carregador");
  if (skuPrefix === "FN") aliases.add("fone");

  if (normalizedName.includes("veicular")) {
    aliases.add("veicular");
    aliases.add("carregador veicular");
  }

  if (normalizedName.includes("tomada")) {
    aliases.add("tomada");
    aliases.add("carregador tomada");
  }

  if (normalizedName.includes("v8")) {
    aliases.add("v8");
    aliases.add("cabo v8");
    aliases.add("carregador v8");
  }

  if (normalizedName.includes("tc")) {
    aliases.add("tc");
    aliases.add("tipo c");
    aliases.add("type c");
    aliases.add("cabo tc");
    aliases.add("carregador tc");
    aliases.add("fone tc");
  }

  if (normalizedName.includes("ios")) {
    aliases.add("ios");
    aliases.add("lightning");
    aliases.add("cabo ios");
    aliases.add("carregador ios");
    aliases.add("fone ios");
  }

  if (normalizedName.includes("blu")) {
    aliases.add("blu");
    aliases.add("bluetooth");
  }

  if (normalizedName.includes("bluetooth")) {
    aliases.add("bluetooth");
    aliases.add("fone bluetooth");
  }

  if (normalizedName.includes("premium")) {
    aliases.add("premium");
    aliases.add("fone bluetooth premium");
  }

  if (normalizedName.includes("p2")) {
    aliases.add("p2");
    aliases.add("fone p2");
  }

  if (normalizedName.includes("tc plus") || normalizedName.includes("tc+")) {
    aliases.add("tc plus");
    aliases.add("tc +");
    aliases.add("tc+");
  }

  if (normalizedName.includes("ios plus") || normalizedName.includes("ios+")) {
    aliases.add("ios plus");
    aliases.add("ios +");
    aliases.add("ios+");
  }

  return Array.from(aliases).filter(Boolean);
}

function scoreFile(fileName: string, sku: string, name: string) {
  const cleanFileName = cleanImageName(fileName);
  const normalizedFile = normalize(cleanFileName);
  const normalizedName = normalize(name);
  const fileTokens = tokenize(cleanFileName);

  const aliases = buildAliases(sku, name);
  const nameTokens = tokenize(name);
  const skuPrefix = getSkuPrefix(sku);

  let score = 0;

  if (normalizedName && normalizedFile === normalizedName) {
    score += 10000;
  }

  if (sku && normalizedFile === normalize(sku)) {
    score += 9000;
  }

  if (sku && normalizedFile.includes(normalize(sku))) {
    score += 3000;
  }

  for (const alias of aliases) {
    if (!alias) continue;
    const normalizedAlias = normalize(alias);

    if (normalizedFile === normalizedAlias) score += 200;
    else if (normalizedFile.includes(normalizedAlias)) score += 80;
  }

  for (const token of nameTokens) {
    if (fileTokens.includes(token)) score += 25;
  }

  if (skuPrefix === "CB" && normalizedFile.includes("cabo")) score += 40;
  if (skuPrefix === "CR" && normalizedFile.includes("carregador")) score += 40;
  if (skuPrefix === "FN" && normalizedFile.includes("fone")) score += 40;
  if (normalizedFile.includes("veicular") && normalize(name).includes("veicular")) score += 60;
  if (normalizedFile.includes("tomada") && normalize(name).includes("tomada")) score += 60;
  if (normalizedFile.includes("bluetooth") && normalize(name).includes("bluetooth")) score += 60;
  if (normalizedFile.includes("premium") && normalize(name).includes("premium")) score += 40;
  if (normalizedFile.includes("p2") && normalize(name).includes("p2")) score += 50;
  if (normalizedFile.includes("v8") && normalize(name).includes("v8")) score += 50;
  if (normalizedFile.includes("tc") && normalize(name).includes("tc")) score += 50;
  if (normalizedFile.includes("ios") && normalize(name).includes("ios")) score += 50;

  return score;
}

async function findExactImageByName(name: string) {
  if (!name) return null;

  const files = await getProductImageFiles();
  const normalizedTarget = normalize(name);

  const exactMatch = files.find(({ file }) => {
    const normalizedFile = normalize(cleanImageName(file));
    return normalizedFile === normalizedTarget;
  });

  if (!exactMatch) return null;

  return path.join(exactMatch.dir, exactMatch.file);
}

async function findExactImageBySku(sku: string) {
  if (!sku) return null;

  const files = await getProductImageFiles();
  const normalizedSku = normalize(sku);

  const exactMatch = files.find(({ file }) => {
    const normalizedFile = normalize(cleanImageName(file));
    return normalizedFile === normalizedSku || normalizedFile.includes(normalizedSku);
  });

  if (!exactMatch) return null;

  return path.join(exactMatch.dir, exactMatch.file);
}

async function findBestImageFile(sku: string, name: string) {
  const imageFiles = await getProductImageFiles();

  if (!imageFiles.length) return null;

  const exactByName = await findExactImageByName(name);
  if (exactByName) return exactByName;

  const exactBySku = await findExactImageBySku(sku);
  if (exactBySku) return exactBySku;

  let bestMatch: { dir: string; file: string; score: number } | null = null;

  for (const { dir, file } of imageFiles) {
    const score = scoreFile(file, sku, name);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { dir, file, score };
    }
  }

  if (!bestMatch || bestMatch.score <= 0) return null;

  return path.join(bestMatch.dir, bestMatch.file);
}

async function findImageByProductId(
  productId: string
): Promise<string | { type: "external"; url: string } | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  const productData = product as any;
  const rawImagePath: string | null =
    productData.imageUrl ||
    productData.image ||
    productData.photoUrl ||
    productData.photo ||
    productData.pictureUrl ||
    productData.picture ||
    null;

  if (!rawImagePath || typeof rawImagePath !== "string") return null;

  // External URL (e.g. Supabase Storage, S3, CDN) — proxy it
  if (rawImagePath.startsWith("http://") || rawImagePath.startsWith("https://")) {
    return { type: "external", url: rawImagePath };
  }

  const normalizedPath = rawImagePath.startsWith("/") ? rawImagePath.slice(1) : rawImagePath;
  return path.join(process.cwd(), "public", normalizedPath);
}

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = String(request.nextUrl.searchParams.get("id") ?? "").trim();
    const sku = String(request.nextUrl.searchParams.get("sku") ?? "").trim();
    const name = String(request.nextUrl.searchParams.get("name") ?? "").trim();

    if (!id && !sku && !name) {
      return new NextResponse("Parâmetros ausentes", { status: 400 });
    }

    let foundPath: string | null = null;
    let externalUrl: string | null = null;

    if (id) {
      const result = await findImageByProductId(id);
      if (result && typeof result === "object" && result.type === "external") {
        externalUrl = result.url;
      } else if (typeof result === "string") {
        foundPath = result;
      }
    }

    // Proxy external URL (Supabase Storage, S3, CDN, etc.)
    if (externalUrl) {
      const extRes = await fetch(externalUrl, { cache: "no-store" });
      if (!extRes.ok) {
        return new NextResponse("Imagem não encontrada", { status: 404 });
      }
      const buffer = Buffer.from(await extRes.arrayBuffer());
      const contentType = extRes.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (!foundPath && (sku || name)) {
      foundPath = await findBestImageFile(sku, name);
    }

    if (!foundPath) {
      return new NextResponse("Imagem não encontrada", { status: 404 });
    }

    const fileBuffer = await fs.readFile(foundPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": getContentType(foundPath),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Erro ao carregar imagem", { status: 500 });
  }
}