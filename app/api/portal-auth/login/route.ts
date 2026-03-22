import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const client = await prisma.client.findFirst({
    where: {
      portalEnabled: true,
      OR: [
        { code: username },
        { email: username },
      ],
    },
  });

  if (!client || !client.portalPasswordHash) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, client.portalPasswordHash);

  if (!valid) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: "portal_session",
    value: client.id,
    httpOnly: true,
    path: "/",
  });

  return NextResponse.json({
    ok: true,
    destination: "/portal",
  });
}