import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const id = String(body.id ?? "").trim();
    const password = String(body.password ?? "");

    if (!id || !password) {
      return NextResponse.json(
        { error: "ID e nova senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("POST /api/settings/access/user-password error:", error);

    return NextResponse.json(
      { error: "Não foi possível alterar a senha do usuário." },
      { status: 500 }
    );
  }
}