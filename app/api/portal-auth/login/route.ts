import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

function expiredCookie(name: string) {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeText(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

type PortalClientLoginCandidate = {
  id: string;
  name: string;
  tradeName: string | null;
  code: string | null;
  portalEnabled: boolean;
  portalPasswordHash: string | null;
  active: boolean;
};

const clientSelect = {
  id: true,
  name: true,
  tradeName: true,
  code: true,
  portalEnabled: true,
  portalPasswordHash: true,
  active: true,
};

async function findClientByExactIdentifier(
  username: string,
  normalizedEmail: string,
  normalizedDigits: string
): Promise<PortalClientLoginCandidate | null> {
  return prisma.client.findFirst({
    where: {
      portalEnabled: true,
      active: true,
      OR: [
        { code: username },
        { email: normalizedEmail },
        { billingEmail: normalizedEmail },
        ...(normalizedDigits
          ? [{ cnpj: normalizedDigits }, { cpf: normalizedDigits }]
          : []),
      ],
    },
    select: clientSelect,
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function findClientByExactName(
  username: string
): Promise<PortalClientLoginCandidate | null | "AMBIGUOUS"> {
  const clients = await prisma.client.findMany({
    where: {
      portalEnabled: true,
      active: true,
      OR: [
        { name: { equals: username, mode: "insensitive" } },
        { tradeName: { equals: username, mode: "insensitive" } },
      ],
    },
    select: clientSelect,
    orderBy: {
      createdAt: "asc",
    },
    take: 2,
  });

  if (clients.length > 1) {
    return "AMBIGUOUS";
  }

  return clients[0] || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const username = normalizeText(body?.username);
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(username);
    const normalizedDigits = onlyDigits(username);

    const clientByIdentifier = await findClientByExactIdentifier(
      username,
      normalizedEmail,
      normalizedDigits
    );

    const client =
      clientByIdentifier || (await findClientByExactName(username));

    if (client === "AMBIGUOUS") {
      return NextResponse.json(
        {
          error:
            "Encontramos mais de um cliente com esse nome. Use o código do cliente, CPF/CNPJ ou e-mail para acessar.",
        },
        { status: 409 }
      );
    }

    if (!client || !client.portalPasswordHash) {
      return NextResponse.json(
        { error: "Usuário inválido" },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      client.portalPasswordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: "Senha inválida" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();

    cookieStore.set(expiredCookie("crm_session"));
    cookieStore.set(expiredCookie("investor_session"));
    cookieStore.set(expiredCookie("portal_session"));

    cookieStore.set({
      name: "portal_session",
      value: client.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({
      ok: true,
      destination: "/portal",
      clientId: client.id,
      name: client.tradeName || client.name,
      code: client.code || null,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao realizar login do portal." },
      { status: 500 }
    );
  }
}
