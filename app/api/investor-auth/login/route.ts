import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = await request.json();

  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const user = await prisma.user.findFirst({
    where: {
      email: username,
      role: "INVESTOR",
    },
    include: {
      investorProfile: true,
    },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return NextResponse.json({ error: "Senha inválida" }, { status: 401 });
  }

  const cookieStore = await cookies();

  cookieStore.set({
    name: "investor_session",
    value: user.id,
    httpOnly: true,
    path: "/",
  });

  return NextResponse.json({
    ok: true,
    destination: "/investor",
  });
}