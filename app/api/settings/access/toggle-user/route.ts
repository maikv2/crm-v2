import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser();
    const body = await request.json();

    const userId = String(body.userId ?? "").trim();
    const active = Boolean(body.active);

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório." },
        { status: 400 }
      );
    }

    if (userId === admin.id && !active) {
      return NextResponse.json(
        { error: "Você não pode desativar seu próprio usuário administrador." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { active },
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

    console.error("PATCH /api/settings/access/toggle-user error:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o status do usuário." },
      { status: 500 }
    );
  }
}