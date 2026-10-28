import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { buildClientExhibitorPdf } from "@/lib/exhibitor-pdf-builder";
import {
  sendDocument,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value?: string | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Envia ao cliente, pelo WhatsApp, o PDF com o que ficou no expositor dele */
export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }
    if (authUser.role === "INVESTOR") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const clientId = cleanText(typeof body.clientId === "string" ? body.clientId : "");
    if (!clientId) {
      return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });
    }

    const access = await prisma.client.findUnique({
      where: { id: clientId },
      select: { regionId: true },
    });
    if (!access) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    if (
      authUser.role === "REPRESENTATIVE" &&
      (!authUser.regionId || access.regionId !== authUser.regionId)
    ) {
      return NextResponse.json({ error: "Cliente fora da sua região." }, { status: 403 });
    }

    const built = await buildClientExhibitorPdf(clientId);
    if (!built) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    if (built.data.exhibitors.length === 0) {
      return NextResponse.json(
        { error: "Este cliente não tem expositor instalado." },
        { status: 400 }
      );
    }

    const phone = cleanText(
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone
        : built.client.whatsapp || built.client.phone
    );
    if (!phone) {
      return NextResponse.json(
        { error: "Cliente sem WhatsApp/telefone cadastrado." },
        { status: 400 }
      );
    }

    const clientName = built.data.client.name;
    const fileName = `expositor-${slug(clientName) || "cliente"}.pdf`;
    const caption =
      `Olá, ${clientName}! 😊\n\n` +
      "Segue em anexo a *relação dos produtos do seu expositor V2*, com a quantidade e o valor de cada item.\n" +
      "_Este documento não é um pedido nem uma cobrança_, é só para você conferir o que está no expositor.\n\n" +
      "Qualquer dúvida, estamos à disposição.";

    const result = await sendDocument({
      phone,
      document: built.buffer,
      extension: "pdf",
      fileName,
      caption,
    });

    return NextResponse.json({
      ok: true,
      message: "PDF do expositor enviado pelo WhatsApp.",
      phone,
      fileName,
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
    console.error("POST /api/whatsapp/send-exhibitor-pdf error:", error);
    return NextResponse.json(
      { error: "Erro ao enviar o PDF do expositor por WhatsApp." },
      { status: 500 }
    );
  }
}
