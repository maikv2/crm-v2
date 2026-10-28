import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  isExhibitorRequestMaterial,
  isExhibitorRequestMounting,
  isExhibitorRequestStatus,
  parseExpectedDate,
} from "@/lib/exhibitor-requests";
import {
  exhibitorRequestInclude,
  sendExhibitorRequestWhatsapp,
  whatsappErrorMessage,
} from "@/lib/exhibitor-request-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }
    if (user.role === "INVESTOR") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const regionId = cleanText(searchParams.get("regionId"));

    // Representante so ve as solicitacoes da propria regiao
    const scopedRegionId = user.role === "REPRESENTATIVE" ? user.regionId : regionId;
    if (user.role === "REPRESENTATIVE" && !user.regionId) {
      return NextResponse.json([]);
    }

    const requests = await prisma.exhibitorRequest.findMany({
      where: {
        ...(scopedRegionId ? { regionId: scopedRegionId } : {}),
        ...(isExhibitorRequestStatus(status) ? { status } : {}),
      },
      include: exhibitorRequestInclude,
      orderBy: [{ expectedAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("GET /api/exhibitor-requests error:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as solicitações de expositor." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }
    if (user.role === "INVESTOR") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const clientId = cleanText(body.clientId);
    if (!clientId) {
      return NextResponse.json({ error: "Selecione o cliente." }, { status: 400 });
    }
    if (!isExhibitorRequestMaterial(body.material)) {
      return NextResponse.json({ error: "Escolha o material: acrílico ou ferro." }, { status: 400 });
    }
    if (!isExhibitorRequestMounting(body.mounting)) {
      return NextResponse.json({ error: "Escolha o tipo: chão, balcão ou parede." }, { status: 400 });
    }

    const expectedAt = parseExpectedDate(body.expectedAt);
    if (!expectedAt) {
      return NextResponse.json({ error: "Informe a data prevista para levar o expositor." }, { status: 400 });
    }

    const quantity = Math.max(1, Math.min(99, Math.trunc(Number(body.quantity) || 1)));

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, regionId: true, active: true },
    });
    if (!client || !client.active) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    }
    if (user.role === "REPRESENTATIVE" && (!user.regionId || client.regionId !== user.regionId)) {
      return NextResponse.json({ error: "Cliente fora da sua região." }, { status: 403 });
    }

    const created = await prisma.exhibitorRequest.create({
      data: {
        clientId: client.id,
        regionId: client.regionId,
        requestedById: user.id,
        material: body.material,
        mounting: body.mounting,
        quantity,
        expectedAt,
        notes: cleanText(body.notes),
      },
    });

    // A solicitacao fica salva mesmo se o WhatsApp falhar - da para reenviar depois
    let whatsapp: { ok: boolean; error?: string; phone?: string } | null = null;
    if (body.sendWhatsapp !== false) {
      try {
        const sent = await sendExhibitorRequestWhatsapp(created.id, cleanText(body.phone));
        whatsapp = { ok: true, phone: sent.phone };
      } catch (error) {
        console.error("Envio WhatsApp da solicitacao de expositor falhou:", error);
        whatsapp = { ok: false, error: whatsappErrorMessage(error) };
      }
    }

    const saved = await prisma.exhibitorRequest.findUnique({
      where: { id: created.id },
      include: exhibitorRequestInclude,
    });

    return NextResponse.json({ request: saved, whatsapp }, { status: 201 });
  } catch (error) {
    console.error("POST /api/exhibitor-requests error:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a solicitação de expositor." },
      { status: 500 }
    );
  }
}
