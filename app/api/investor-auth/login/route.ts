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

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Informe usuário e senha." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        role: "INVESTOR",
        active: true,
        email: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        investorProfile: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.investorProfile) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
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
      investorId: user.investorProfile.id,
      name: user.investorProfile.name || user.name,
    });
  } catch (error) {
    console.error("INVESTOR LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Erro interno de autenticação do investidor." },
      { status: 500 }
    );
  }
}