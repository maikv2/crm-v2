import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Informe usuário e senha." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        OR: [
          {
            tradeName: {
              equals: username,
              mode: "insensitive",
            },
          },
          {
            name: {
              equals: username,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        code: true,
        portalEnabled: true,
        portalPasswordHash: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 401 }
      );
    }

    if (!client.portalEnabled) {
      return NextResponse.json(
        { error: "Portal ainda não liberado para este cliente." },
        { status: 403 }
      );
    }

    const passwordHash = String(client.portalPasswordHash ?? "");

    if (!passwordHash) {
      return NextResponse.json(
        { error: "Cliente sem senha cadastrada." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set("portal_session", client.id, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return NextResponse.json({
      ok: true,
      clientId: client.id,
      name: client.tradeName || client.name,
    });
  } catch (error) {
    console.error("PORTAL LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Erro interno de autenticação do portal." },
      { status: 500 }
    );
  }
}