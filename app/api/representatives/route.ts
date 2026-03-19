import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text === "undefined" || text === "null") {
    return null;
  }
  return text;
}

export async function GET() {
  try {
    const representatives = await prisma.user.findMany({
      where: {
        role: UserRole.REPRESENTATIVE,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        regionId: true,
        stockLocationId: true,
        region: {
          select: {
            id: true,
            name: true,
            active: true,
            stockLocationId: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
        stockLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    const items = representatives.map((rep) => ({
      id: rep.id,
      name: rep.name,
      email: rep.email,
      phone: rep.phone,
      active: rep.active,
      createdAt: rep.createdAt,
      regionId: rep.regionId,
      stockLocationId: rep.stockLocationId,
      regionName: rep.region?.name ?? null,
      stockLocationName:
        rep.stockLocation?.name ??
        rep.region?.stockLocation?.name ??
        null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET REPRESENTATIVES ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar representantes." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = normalizeText(body?.name);
    const email = normalizeText(body?.email)?.toLowerCase() ?? null;
    const password = normalizeText(body?.password);
    const phone = normalizeText(body?.phone);
    const regionId = normalizeText(body?.regionId);

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome do representante." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do representante." },
        { status: 400 }
      );
    }

    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    if (!regionId) {
      return NextResponse.json(
        { error: "Selecione uma região para o representante." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse e-mail." },
        { status: 400 }
      );
    }

    const region = await prisma.region.findUnique({
      where: { id: regionId },
      select: {
        id: true,
        name: true,
        active: true,
        stockLocationId: true,
        stockLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Região selecionada não encontrada." },
        { status: 400 }
      );
    }

    if (!region.active) {
      return NextResponse.json(
        { error: "A região selecionada está inativa." },
        { status: 400 }
      );
    }

    if (!region.stockLocationId) {
      return NextResponse.json(
        {
          error:
            "A região selecionada não possui local de estoque vinculado. Vincule um estoque à região antes de criar o representante.",
        },
        { status: 400 }
      );
    }

    if (!region.stockLocation || !region.stockLocation.active) {
      return NextResponse.json(
        {
          error:
            "O local de estoque vinculado à região não foi encontrado ou está inativo.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        role: UserRole.REPRESENTATIVE,
        active: true,
        regionId: region.id,
        stockLocationId: region.stockLocationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        regionId: true,
        stockLocationId: true,
        region: {
          select: {
            id: true,
            name: true,
            active: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
        stockLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        active: created.active,
        createdAt: created.createdAt,
        regionId: created.regionId,
        stockLocationId: created.stockLocationId,
        regionName: created.region?.name ?? null,
        stockLocationName:
          created.stockLocation?.name ??
          created.region?.stockLocation?.name ??
          null,
      },
    });
  } catch (error) {
    console.error("POST REPRESENTATIVES ERROR:", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse e-mail." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar representante." },
      { status: 500 }
    );
  }
}