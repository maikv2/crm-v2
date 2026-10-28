import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  sendExhibitorRequestWhatsapp,
  whatsappErrorMessage,
} from "@/lib/exhibitor-request-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envia (ou reenvia) a copia da solicitacao para o WhatsApp do cliente */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }
    if (user.role === "INVESTOR") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const { id } = await context.params;
    const current = await prisma.exhibitorRequest.findUnique({
      where: { id },
      select: { regionId: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }
    if (user.role === "REPRESENTATIVE" && (!user.regionId || current.regionId !== user.regionId)) {
      return NextResponse.json({ error: "Solicitação fora da sua região." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const phone = typeof body.phone === "string" ? body.phone : null;
    const sent = await sendExhibitorRequestWhatsapp(id, phone);

    return NextResponse.json({ ok: true, phone: sent.phone });
  } catch (error) {
    console.error("POST /api/exhibitor-requests/[id]/whatsapp error:", error);
    return NextResponse.json({ error: whatsappErrorMessage(error) }, { status: 502 });
  }
}
