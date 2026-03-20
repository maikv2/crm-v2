import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();
    const password = String(body.password ?? "");

    if (!clientId || !password) {
      return NextResponse.json(
        { error: "clientId e password são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    const portalPasswordHash = await bcrypt.hash(password, 10);

    await prisma.client.update({
      where: { id: clientId },
      data: {
        portalEnabled: true,
        portalPasswordHash,
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

    console.error("POST /api/settings/access/client-password error:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar a senha do cliente." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId é obrigatório." },
        { status: 400 }
      );
    }

    const portalEnabled = Boolean(body.portalEnabled);

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    await prisma.client.update({
      where: { id: clientId },
      data: {
        portalEnabled,
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

    console.error("PATCH /api/settings/access/client-password error:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar o portal do cliente." },
      { status: 500 }
    );
  }
}