import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";
import { buildPortalAccessMessage } from "@/lib/portal-access-message";
import {
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value?: string | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function getPortalUrl(request: Request, body: Record<string, unknown>) {
  const bodyUrl = cleanText(typeof body.portalUrl === "string" ? body.portalUrl : "");
  if (bodyUrl) return bodyUrl;

  const url = new URL(request.url);
  return `${url.origin}/portal/login`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : null;
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const clientId = cleanText(typeof body.clientId === "string" ? body.clientId : "");

    if (!clientId) {
      return NextResponse.json(
        { error: "ID do cliente é obrigatório." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        code: true,
        phone: true,
        whatsapp: true,
        active: true,
        portalEnabled: true,
        portalPasswordHash: true,
        regionId: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    if (
      authUser.role === "REPRESENTATIVE" &&
      (!authUser.regionId || client.regionId !== authUser.regionId)
    ) {
      return NextResponse.json(
        { error: "Cliente fora da sua região." },
        { status: 403 }
      );
    }

    if (!client.active) {
      return NextResponse.json(
        { error: "Cliente inativo." },
        { status: 400 }
      );
    }

    if (!client.portalEnabled || !client.portalPasswordHash) {
      return NextResponse.json(
        { error: "Este cliente ainda não está com acesso ao portal habilitado." },
        { status: 400 }
      );
    }

    const password = cleanText(client.code);
    if (!password) {
      return NextResponse.json(
        { error: "Este cliente ainda não possui código de acesso cadastrado." },
        { status: 400 }
      );
    }

    const username = cleanText(client.tradeName);
    if (!username) {
      return NextResponse.json(
        { error: "Este cliente ainda não possui nome fantasia cadastrado." },
        { status: 400 }
      );
    }

    const phone = cleanText(
      typeof body.phone === "string" ? body.phone : client.whatsapp || client.phone
    );

    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const message = buildPortalAccessMessage({
      clientName: username || cleanText(client.name),
      username,
      password,
      portalUrl: getPortalUrl(request, body),
    });

    const result = await sendText({
      phone,
      message,
    });

    return NextResponse.json({
      ok: true,
      message: "Acesso ao portal enviado pelo WhatsApp.",
      phone,
      zapi: result,
    });
  } catch (error: unknown) {
    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("POST /api/whatsapp/send-portal-access error:", error);

    return NextResponse.json(
      {
        error:
          getErrorMessage(error) ||
          "Erro ao enviar acesso do portal por WhatsApp.",
      },
      { status: 500 }
    );
  }
}
