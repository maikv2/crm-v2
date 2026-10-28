import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  isExhibitorRequestMaterial,
  isExhibitorRequestMounting,
  isExhibitorRequestStatus,
  parseExpectedDate,
} from "@/lib/exhibitor-requests";
import { exhibitorRequestInclude } from "@/lib/exhibitor-request-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Atualiza status (entregue/cancelada), data prevista ou dados da solicitacao */
export async function PATCH(
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
      select: { id: true, regionId: true, status: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
    }
    if (user.role === "REPRESENTATIVE" && (!user.regionId || current.regionId !== user.regionId)) {
      return NextResponse.json({ error: "Solicitação fora da sua região." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!isExhibitorRequestStatus(body.status)) {
        return NextResponse.json({ error: "Status inválido." }, { status: 400 });
      }
      data.status = body.status;
      data.deliveredAt = body.status === "DELIVERED" ? new Date() : null;
    }
    if (body.expectedAt !== undefined) {
      const expectedAt = parseExpectedDate(body.expectedAt);
      if (!expectedAt) {
        return NextResponse.json({ error: "Data prevista inválida." }, { status: 400 });
      }
      data.expectedAt = expectedAt;
    }
    if (body.material !== undefined) {
      if (!isExhibitorRequestMaterial(body.material)) {
        return NextResponse.json({ error: "Material inválido." }, { status: 400 });
      }
      data.material = body.material;
    }
    if (body.mounting !== undefined) {
      if (!isExhibitorRequestMounting(body.mounting)) {
        return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
      }
      data.mounting = body.mounting;
    }
    if (body.quantity !== undefined) {
      data.quantity = Math.max(1, Math.min(99, Math.trunc(Number(body.quantity) || 1)));
    }
    if (body.notes !== undefined) {
      const notes = String(body.notes ?? "").trim();
      data.notes = notes || null;
    }

    const updated = await prisma.exhibitorRequest.update({
      where: { id },
      data,
      include: exhibitorRequestInclude,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/exhibitor-requests/[id] error:", error);
    return NextResponse.json(
      { error: "Não foi possível atualizar a solicitação." },
      { status: 500 }
    );
  }
}
