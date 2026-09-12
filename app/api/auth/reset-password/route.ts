import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { readPasswordResetToken } from "@/lib/password-reset";

/**
 * Segunda metade do fluxo de "esqueci minha senha" - a tela
 * app/reset-password/page.tsx ja chamava esse endpoint, mas ele nao
 * existia ainda (o link do e-mail era gerado certinho, so faltava quem
 * recebesse o token + nova senha e de fato gravasse no banco).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const payload = readPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (payload.subjectType === "CLIENT") {
      const client = await prisma.client.findUnique({ where: { id: payload.subjectId }, select: { id: true } });
      if (!client) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }
      await prisma.client.update({ where: { id: client.id }, data: { portalPasswordHash: passwordHash } });
    } else {
      const user = await prisma.user.findUnique({ where: { id: payload.subjectId }, select: { id: true } });
      if (!user) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ error: "Não foi possível redefinir a senha." }, { status: 500 });
  }
}
