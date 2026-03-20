import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAdminSession } from "@/lib/admin-settings-auth";

export const dynamic = "force-dynamic";

type PasswordTargetKind = "USER" | "INVESTOR" | "CLIENT";

function normalizeText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  const admin = await requireAdminSession();

  if (!admin.ok) {
    return admin.response;
  }

  try {
    const body = await request.json();

    const kind = String(body.kind ?? "").trim() as PasswordTargetKind;
    const targetId = normalizeText(body.targetId);
    const newPassword = String(body.newPassword ?? "").trim();

    if (!targetId) {
      return NextResponse.json(
        { error: "O alvo da alteração é obrigatório." },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 4 caracteres." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (kind === "USER") {
      const existing = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id: targetId },
        data: {
          passwordHash,
          active: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Senha do usuário atualizada com sucesso.",
      });
    }

    if (kind === "INVESTOR") {
      const investor = await prisma.investor.findUnique({
        where: { id: targetId },
        include: {
          user: true,
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
          { error: "O investidor precisa ter e-mail para receber acesso ao portal." },
          { status: 400 }
        );
      }

      if (investor.userId && investor.user) {
        await prisma.user.update({
          where: { id: investor.userId },
          data: {
            passwordHash,
            active: true,
            email: investor.email.toLowerCase(),
            name: investor.name,
            role: "INVESTOR",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Acesso do investidor atualizado com sucesso.",
        });
      }

      const existingUserByEmail = await prisma.user.findUnique({
        where: { email: investor.email.toLowerCase() },
        select: { id: true },
      });

      if (existingUserByEmail) {
        return NextResponse.json(
          {
            error:
              "Já existe um usuário com este e-mail. Ajuste o e-mail do investidor ou vincule manualmente.",
          },
          { status: 409 }
        );
      }

      const createdUser = await prisma.user.create({
        data: {
          name: investor.name,
          email: investor.email.toLowerCase(),
          role: "INVESTOR",
          active: true,
          phone: investor.phone ?? null,
          passwordHash,
        },
        select: {
          id: true,
        },
      });

      await prisma.investor.update({
        where: { id: investor.id },
        data: {
          userId: createdUser.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Acesso do investidor criado com sucesso.",
      });
    }

    if (kind === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { id: targetId },
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
        where: { id: targetId },
        data: {
          portalPasswordHash: passwordHash,
          portalEnabled: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Senha do portal do cliente atualizada com sucesso.",
      });
    }

    return NextResponse.json(
      { error: "Tipo de alvo inválido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/settings/access/password error:", error);

    return NextResponse.json(
      { error: "Não foi possível atualizar a senha." },
      { status: 500 }
    );
  }
}