import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set({
      name: "crm_session",
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao realizar login." },
      { status: 500 }
    );
  }
}