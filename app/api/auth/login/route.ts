import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

type AccessType = "CRM" | "CLIENT" | "INVESTOR";

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

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

async function passwordMatches(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  if (isBcryptHash(storedHash)) {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  return storedHash === password;
}

async function clearAllSessions() {
  const cookieStore = await cookies();
  cookieStore.set(expiredCookie("portal_session"));
  cookieStore.set(expiredCookie("investor_session"));
  cookieStore.set(expiredCookie("crm_session"));
  return cookieStore;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const access = normalizeAccess(body?.access);
    const rawIdentifier = normalizeIdentifier(
      body?.identifier ?? body?.email ?? body?.user ?? body?.username ?? ""
    );
    const password = String(body?.password || "");
   const rememberMe = Boolean(body?.rememberMe ?? body?.remember);
    const sessionMaxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 12;

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (access === "CRM") {
      const email = normalizeEmail(rawIdentifier);

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: "Usuário ou senha inválidos." },
          { status: 401 }
        );
      }

      const role = user.role as string;

      if (
        role !== "ADMIN" &&
        role !== "REPRESENTATIVE" &&
        role !== "ADMINISTRATIVE"
      ) {
        return NextResponse.json(
          { error: "Este usuário não possui acesso ao CRM." },
          { status: 403 }
        );
      }

      if (!user.active) {
        return NextResponse.json(
          { error: "Usuário inativo." },
          { status: 403 }
        );
      }

      const passwordMatch = await passwordMatches(password, user.passwordHash);

      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Usuário ou senha inválidos." },
          { status: 401 }
        );
      }

      if (!isBcryptHash(user.passwordHash)) {
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      }

      const cookieStore = await clearAllSessions();

      cookieStore.set({
        name: "crm_session",
        value: user.id,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      });

      const destination =
        role === "ADMINISTRATIVE" ? "/finance" : "/choose/crm";

      return NextResponse.json({
        ok: true,
        destination,
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
        },
      });
    }

    if (access === "INVESTOR") {
      const email = normalizeEmail(rawIdentifier);

      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        include: { investorProfile: true },
      });

      if (!user || !user.passwordHash) {
        return NextResponse.json(
          { error: "Usuário ou senha inválidos." },
          { status: 401 }
        );
      }

      if (user.role !== "INVESTOR") {
        return NextResponse.json(
          { error: "Este usuário não possui acesso ao portal do investidor." },
          { status: 403 }
        );
      }

      if (!user.active) {
        return NextResponse.json(
          { error: "Usuário inativo." },
          { status: 403 }
        );
      }

      const passwordMatch = await passwordMatches(password, user.passwordHash);

      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Usuário ou senha inválidos." },
          { status: 401 }
        );
      }

      if (!isBcryptHash(user.passwordHash)) {
        const newHash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      }

      const cookieStore = await clearAllSessions();

      cookieStore.set({
        name: "investor_session",
        value: user.id,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      });

      return NextResponse.json({
        ok: true,
        destination: "/investor",
        user: {
          id: user.id,
          role: user.role,
          name: user.name,
          investorId: user.investorProfile?.id ?? null,
        },
      });
    }

    const identifier = rawIdentifier.trim();
    const identifierEmail = normalizeEmail(identifier);
    const identifierDigits = onlyDigits(identifier);

    const client = await prisma.client.findFirst({
      where: {
        portalEnabled: true,
        active: true,
        OR: [
          { code: identifier },
          { email: identifierEmail },
          { billingEmail: identifierEmail },
          ...(identifierDigits
            ? [{ cnpj: identifierDigits }, { cpf: identifierDigits }]
            : []),
        ],
      },
    });

    if (!client || !client.portalPasswordHash) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    const passwordMatch = await passwordMatches(
      password,
      client.portalPasswordHash
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos." },
        { status: 401 }
      );
    }

    if (!isBcryptHash(client.portalPasswordHash)) {
      const newHash = await bcrypt.hash(password, 10);
      await prisma.client.update({
        where: { id: client.id },
        data: { portalPasswordHash: newHash },
      });
    }

    const cookieStore = await clearAllSessions();

    cookieStore.set({
      name: "portal_session",
      value: client.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });

    return NextResponse.json({
      ok: true,
      destination: "/portal",
      client: {
        id: client.id,
        name: client.name,
        code: client.code,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao realizar login." },
      { status: 500 }
    );
  }
}
