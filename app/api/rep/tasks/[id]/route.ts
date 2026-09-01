import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const completed = Boolean(body.completed);

    const existing = await prisma.repTask.findFirst({
      where: {
        id,
        representativeId: user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Tarefa não encontrada." },
        { status: 404 }
      );
    }

    const task = await prisma.repTask.update({
      where: { id },
      data: {
        status: completed ? "DONE" : "OPEN",
        completedAt: completed ? new Date() : null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            city: true,
            state: true,
            phone: true,
            whatsapp: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    console.error("PATCH /api/rep/tasks/[id] error:", error);

    return NextResponse.json(
      { error: "Erro ao atualizar tarefa." },
      { status: 500 }
    );
  }
}
