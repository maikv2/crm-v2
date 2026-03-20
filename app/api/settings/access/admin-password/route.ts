import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();

    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Senha atual e nova senha são obrigatórias." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const fullAdmin = await prisma.user.findUnique({
      where: {
        id: admin.id,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!fullAdmin) {
      return NextResponse.json(
        { error: "Administrador não encontrado." },
        { status: 404 }
      );
    }

    const passwordMatches = await bcrypt.compare(currentPassword, fullAdmin.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "A senha atual está incorreta." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: admin.id,
      },
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

    console.error("POST /api/settings/access/admin-password error:", error);

    return NextResponse.json(
      { error: "Não foi possível alterar a senha." },
      { status: 500 }
    );
  }
}