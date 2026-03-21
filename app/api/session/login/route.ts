import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

function normalize(value?: string | null) {
  return String(value ?? "").trim();
}

function normalizeEmail(value?: string | null) {
  return normalize(value).toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const identifierRaw = normalize(body?.identifier);
    const password = normalize(body?.password);
    const mobile = Boolean(body?.mobile);

    if (!identifierRaw || !password) {
      return NextResponse.json(
        { error: "Informe usuário e senha." },
        { status: 400 }
      );
    }

    const identifierEmail = normalizeEmail(identifierRaw);
    const cookieStore = await cookies();

    const expireOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      expires: new Date(0),
    };

    cookieStore.set("crm_session", "", expireOptions);
    cookieStore.set("investor_session", "", expireOptions);
    cookieStore.set("portal_session", "", expireOptions);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: identifierEmail,
          mode: "insensitive",
        },
      },
      include: {
        investorProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (user?.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);

      if (valid) {
        if (!user.active) {
          return NextResponse.json(
            { error: "Usuário inativo." },
            { status: 403 }
          );
        }

        if (user.role === "ADMIN" || user.role === "REPRESENTATIVE") {
          cookieStore.set("crm_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });

          return NextResponse.json({
            ok: true,
            kind: "crm",
            role: user.role,
            destination:
              user.role === "ADMIN"
                ? mobile
                  ? "/m/admin"
                  : "/dashboard"
                : mobile
                ? "/m/rep"
                : "/rep",
            user: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
          });
        }

        if (user.role === "INVESTOR" && user.investorProfile) {
          cookieStore.set("investor_session", user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });

          return NextResponse.json({
            ok: true,
            kind: "investor",
            role: user.role,
            destination: mobile ? "/m/investor" : "/investor",
            user: {
              id: user.id,
              name: user.name,
              role: user.role,
            },
          });
        }

        return NextResponse.json(
          { error: "Perfil de acesso não suportado." },
          { status: 403 }
        );
      }
    }

    const client = await prisma.client.findFirst({
      where: {
        OR: [
          {
            tradeName: {
              equals: identifierRaw,
              mode: "insensitive",
            },
          },
          {
            name: {
              equals: identifierRaw,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        portalEnabled: true,
        portalPasswordHash: true,
      },
    });

    if (client) {
      if (!client.portalEnabled) {
        return NextResponse.json(
          { error: "Portal ainda não liberado para este cliente." },
          { status: 403 }
        );
      }

      const passwordHash = String(client.portalPasswordHash ?? "");

      if (!passwordHash) {
        return NextResponse.json(
          { error: "Cliente sem senha cadastrada." },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, passwordHash);

      if (!valid) {
        return NextResponse.json(
          { error: "Usuário ou senha inválidos." },
          { status: 401 }
        );
      }

      cookieStore.set("portal_session", client.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({
        ok: true,
        kind: "portal",
        role: "CLIENT",
        destination: mobile ? "/m/client" : "/portal/dashboard",
        user: {
          id: client.id,
          name: client.tradeName || client.name,
          role: "CLIENT",
        },
      });
    }

    return NextResponse.json(
      { error: "Usuário ou senha inválidos." },
      { status: 401 }
    );
  } catch (error) {
    console.error("UNIFIED LOGIN ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao realizar login." },
      { status: 500 }
    );
  }
}