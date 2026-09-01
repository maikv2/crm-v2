import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

const VALID_TYPES = new Set(["TASK", "CALL", "VISIT", "FOLLOW_UP", "NOTE"]);
const VALID_PRIORITIES = new Set(["LOW", "NORMAL", "HIGH"]);

function parseDate(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeType(value: unknown) {
  const type = String(value ?? "TASK").toUpperCase();
  return VALID_TYPES.has(type) ? type : "TASK";
}

function normalizePriority(value: unknown) {
  const priority = String(value ?? "NORMAL").toUpperCase();
  return VALID_PRIORITIES.has(priority) ? priority : "NORMAL";
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");

    const tasks = await prisma.repTask.findMany({
      where: {
        representativeId: user.id,
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
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
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: 250,
    });

    return NextResponse.json({ items: tasks });
  } catch (error) {
    console.error("GET /api/rep/tasks error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar tarefas do representante." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const notes = String(body.notes ?? "").trim() || null;
    const clientId = String(body.clientId ?? "").trim() || null;
    const dueAt = parseDate(body.dueAt);

    if (!title) {
      return NextResponse.json(
        { error: "Informe o título da tarefa." },
        { status: 400 }
      );
    }

    let clientRegionId: string | null = null;

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          ...(user.regionId ? { regionId: user.regionId } : {}),
        },
        select: { id: true, regionId: true },
      });

      if (!client) {
        return NextResponse.json(
          { error: "Cliente não encontrado para este representante." },
          { status: 404 }
        );
      }

      clientRegionId = client.regionId;
    }

    const task = await prisma.repTask.create({
      data: {
        title,
        notes,
        clientId,
        dueAt,
        type: normalizeType(body.type),
        priority: normalizePriority(body.priority),
        representativeId: user.id,
        regionId: clientRegionId ?? user.regionId,
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

    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/rep/tasks error:", error);

    return NextResponse.json(
      { error: "Erro ao criar tarefa do representante." },
      { status: 500 }
    );
  }
}
