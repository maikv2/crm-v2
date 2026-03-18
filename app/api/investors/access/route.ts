import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const investorId = String(body?.investorId ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    if (!investorId) {
      return NextResponse.json(
        { error: "Informe o investidor." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Informe o e-mail do investidor." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
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
      },
    });

    if (!investor) {
      return NextResponse.json(
        { error: "Investidor não encontrado." },
        { status: 404 }
      );
    }

    const emailOwner = await prisma.user.findFirst({
      where: {
        email,
        NOT: investor.userId ? { id: investor.userId } : undefined,
      },
      select: {
        id: true,
      },
    });

    if (emailOwner) {
      return NextResponse.json(
        { error: "Já existe outro usuário com este e-mail." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = investor.userId
      ? await prisma.user.update({
          where: { id: investor.userId },
          data: {
            name: investor.name,
            email,
            role: "INVESTOR",
            active: true,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
          },
        })
      : await prisma.user.create({
          data: {
            name: investor.name,
            email,
            role: "INVESTOR",
            active: true,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
          },
        });

    await prisma.investor.update({
      where: { id: investor.id },
      data: {
        email,
        userId: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      investorId: investor.id,
      userId: user.id,
      email: user.email,
      message: "Acesso do investidor salvo com sucesso.",
    });
  } catch (error) {
    console.error("INVESTOR ACCESS ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao salvar acesso do investidor." },
      { status: 500 }
    );
  }
}