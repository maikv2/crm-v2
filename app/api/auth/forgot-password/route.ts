import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendEmail } from "@/lib/send-email";

type AccessType = "CRM" | "CLIENT" | "INVESTOR";

function normalizeAccess(value: unknown): AccessType {
  const access = String(value || "CRM").toUpperCase().trim();
  if (access === "CLIENT") return "CLIENT";
  if (access === "INVESTOR") return "INVESTOR";
  return "CRM";
}

function normalizeIdentifier(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: string) {
  return value.toLowerCase().trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const access = normalizeAccess(body?.access);
    const identifier = normalizeIdentifier(
      body?.identifier ?? body?.email ?? body?.user ?? body?.username ?? ""
    );

    if (!identifier) {
      return NextResponse.json(
        { error: "Informe o usuário ou e-mail para recuperar a senha." },
        { status: 400 }
      );
    }

    const email = normalizeEmail(identifier);
    const digits = onlyDigits(identifier);
    const baseUrl = buildBaseUrl(request);

    if (access === "CLIENT") {
      const client = await prisma.client.findFirst({
        where: {
          portalEnabled: true,
          active: true,
          OR: [
            { code: identifier },
            { email },
            { billingEmail: email },
            ...(digits ? [{ cnpj: digits }, { cpf: digits }] : []),
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          billingEmail: true,
        },
      });

      const targetEmail = client?.email || client?.billingEmail;

      if (client && targetEmail) {
        const token = createPasswordResetToken("CLIENT", client.id);
        const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

        await sendEmail({
          to: targetEmail,
          subject: "Redefinição de senha - Portal do Cliente V2",
          text: `Olá, ${client.name}. Acesse o link para criar uma nova senha: ${resetUrl}`,
          html: `<p>Olá, <strong>${client.name}</strong>.</p><p>Clique no botão abaixo para criar uma nova senha:</p><p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Criar nova senha</a></p><p>Este link expira em 30 minutos.</p>`,
        });
      }

      return NextResponse.json({
        ok: true,
        message:
          "Se houver um e-mail cadastrado para este usuário, enviaremos o link para redefinir a senha.",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        active: true,
        ...(access === "INVESTOR"
          ? { role: "INVESTOR" }
          : {
              role: {
                in: ["ADMIN", "REPRESENTATIVE", "ADMINISTRATIVE"],
              },
            }),
        OR: [
          {
            name: {
              equals: identifier,
              mode: "insensitive",
            },
          },
          {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (user?.email) {
      const token = createPasswordResetToken("USER", user.id);
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      await sendEmail({
        to: user.email,
        subject: "Redefinição de senha - CRM V2",
        text: `Olá, ${user.name}. Acesse o link para criar uma nova senha: ${resetUrl}`,
        html: `<p>Olá, <strong>${user.name}</strong>.</p><p>Clique no botão abaixo para criar uma nova senha:</p><p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block">Criar nova senha</a></p><p>Este link expira em 30 minutos.</p>`,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        "Se houver um e-mail cadastrado para este usuário, enviaremos o link para redefinir a senha.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao solicitar recuperação de senha." },
      { status: 500 }
    );
  }
}
