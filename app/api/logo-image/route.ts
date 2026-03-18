import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const LOGO_CANDIDATES = [
  "logo.png",
  "logo.jpg",
  "logo.jpeg",
  "logo.webp",
  "logo.svg",
];

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), "public");

    for (const fileName of LOGO_CANDIDATES) {
      const filePath = path.join(publicDir, fileName);

      try {
        await fs.access(filePath);
        const fileBuffer = await fs.readFile(filePath);

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": getContentType(filePath),
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        continue;
      }
    }

    return new NextResponse("Logo não encontrada", { status: 404 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Erro ao carregar logo", { status: 500 });
  }
}