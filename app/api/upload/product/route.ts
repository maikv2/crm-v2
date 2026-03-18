import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const data = await req.formData();
  const file: File | null = data.get("file") as unknown as File;

  if (!file) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileName = Date.now() + "-" + file.name;

  const uploadPath = path.join(process.cwd(), "public/products", fileName);

  fs.writeFileSync(uploadPath, buffer);

  return NextResponse.json({
    url: `/products/${fileName}`,
  });
}