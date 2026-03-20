import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const body = await request.json();
    const investorId = String(body.investorId ?? "").trim();
    const password = String(body.password ?? "");

    if (!investorId || !password) {
      return NextResponse.json(
        { error: "investorId e password são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres." },
        { status: 400 }
      );
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!investor) {
      return NextResponse.json(
        { error: "Investidor não encontrado." },
        { status: 404 }
      );
    }

    if (!investor.email) {
      return NextResponse.json(
        { error: "O investidor precisa ter e-mail para acessar o portal." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (investor.userId && investor.user) {
      await prisma.user.update({
        where: { id: investor.userId },
        data: {
          email: investor.email,
          name: investor.name,
          role: "INVESTOR",
          active: true,
          passwordHash,
        },
      });

      return NextResponse.json({ success: true });
    }

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: investor.email },
      select: { id: true },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        {
          error: "Já existe um usuário com este e-mail. Ajuste o e-mail do investidor ou vincule manualmente.",
        },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name: investor.name,
        email: investor.email,
        role: "INVESTOR",
        active: true,
        passwordHash,
      },
      select: {
        id: true,
      },
    });

    await prisma.investor.update({
      where: { id: investor.id },
      data: {
        userId: user.id,
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

    console.error("POST /api/settings/access/investor-access error:", error);

    return NextResponse.json(
      { error: "Não foi possível criar/atualizar o acesso do investidor." },
      { status: 500 }
    );
  }
}