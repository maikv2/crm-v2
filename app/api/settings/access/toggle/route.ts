import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const userId = body?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        active: !existing.active,
      },
      select: {
        id: true,
        active: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("toggle user error:", error);

    return NextResponse.json(
      { error: "Erro ao alterar status do usuário" },
      { status: 500 }
    );
  }
}