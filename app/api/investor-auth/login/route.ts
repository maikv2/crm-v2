import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

function expiredCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: string) {
  return value.toLowerCase().trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const username = normalizeText(body?.username);
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const email = normalizeEmail(username);

    const user = await prisma.user.findFirst({
      where: {
        email,
        role: "INVESTOR",
      },
      include: {
        investorProfile: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Usuário inativo." },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Senha inválida" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(expiredCookie("crm_session"));
    cookieStore.set(expiredCookie("portal_session"));
    cookieStore.set(expiredCookie("investor_session"));

    cookieStore.set({
      name: "investor_session",
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      ok: true,
      destination: "/investor",
    });
  } catch (error) {
    console.error("INVESTOR LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao realizar login do investidor." },
      { status: 500 }
    );
  }
}