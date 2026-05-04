import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "REPRESENTATIVE" &&
      user.role !== "ADMINISTRATIVE"
    ) {
      return NextResponse.json(
        { error: "Este tipo de usuário não pode ser editado por esta tela." },
        { status: 400 }
      );
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("GET /api/settings/users/[id] error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar o usuário." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();

    const { id } = await params;

    const body = await request.json().catch(() => null);

    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").toLowerCase().trim();
    const phone = onlyDigits(body?.phone) || null;
    const active = Boolean(body?.active);

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    if (
      user.role !== "ADMIN" &&
      user.role !== "REPRESENTATIVE" &&
      user.role !== "ADMINISTRATIVE"
    ) {
      return NextResponse.json(
        { error: "Este tipo de usuário não pode ser editado por esta tela." },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingEmail && existingEmail.id !== id) {
      return NextResponse.json(
        { error: "Já existe outro usuário com este e-mail." },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        email,
        phone,
        active,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
      },
    });

    return NextResponse.json({ ok: true, user: updatedUser });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("PATCH /api/settings/users/[id] error:", error);

    return NextResponse.json(
      { error: "Não foi possível salvar o usuário." },
      { status: 500 }
    );
  }
}