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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
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

    const normalizedEmail = username.toLowerCase();
    const normalizedDigits = onlyDigits(username);

    const client = await prisma.client.findFirst({
      where: {
        portalEnabled: true,
        active: true,
        OR: [
          { code: username },
          { email: normalizedEmail },
          { billingEmail: normalizedEmail },
          ...(normalizedDigits
            ? [{ cnpj: normalizedDigits }, { cpf: normalizedDigits }]
            : []),
          { name: { contains: username, mode: "insensitive" } },
          { tradeName: { contains: username, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        code: true,
        portalEnabled: true,
        portalPasswordHash: true,
        active: true,
      },
    });

    if (!client || !client.portalPasswordHash) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, client.portalPasswordHash);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Senha inválida" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(expiredCookie("crm_session"));
    cookieStore.set(expiredCookie("investor_session"));
    cookieStore.set(expiredCookie("portal_session"));

    cookieStore.set({
      name: "portal_session",
      value: client.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      ok: true,
      destination: "/portal",
      clientId: client.id,
      name: client.tradeName || client.name,
      code: client.code || null,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao realizar login do portal." },
      { status: 500 }
    );
  }
}