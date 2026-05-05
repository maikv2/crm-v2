import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = normalizeText(body?.name);
    const email = normalizeText(body?.email)?.toLowerCase() ?? null;
    const phone = normalizeText(body?.phone);
    const document = normalizeText(body?.document);
    const notes = normalizeText(body?.notes);
    const password = String(body?.password ?? "");

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome do investidor." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          error:
            "E-mail é obrigatório para que o investidor possa acessar o portal.",
        },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "Já existe um usuário com este e-mail. Use outro e-mail ou vincule manualmente.",
        },
        { status: 409 }
      );
    }

    const existingInvestorEmail = await prisma.investor.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingInvestorEmail) {
      return NextResponse.json(
        { error: "Já existe um investidor com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          phone,
          role: "INVESTOR",
          active: true,
        },
        select: {
          id: true,
        },
      });

      const investor = await tx.investor.create({
        data: {
          name,
          email,
          phone,
          document,
          notes,
          userId: user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          notes: true,
          userId: true,
        },
      });

      return { user, investor };
    });

    return NextResponse.json({
      ok: true,
      investor: result.investor,
      userId: result.user.id,
    });
  } catch (error) {
    console.error("POST /api/investors/new error:", error);

    return NextResponse.json(
      { error: "Erro ao criar investidor." },
      { status: 500 }
    );
  }
}
