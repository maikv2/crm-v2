import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ExhibitorMaintenanceType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const clientId = cookieStore.get("portal_session")?.value;

    if (!clientId) {
      return NextResponse.json(
        { error: "Sessão do portal não encontrada." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const message = String(body?.message ?? "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Informe a mensagem da solicitação." },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        exhibitors: {
          orderBy: {
            installedAt: "desc",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 }
      );
    }

    if (!client.exhibitors.length) {
      return NextResponse.json(
        { error: "Nenhum expositor encontrado para este cliente." },
        { status: 400 }
      );
    }

    const exhibitor = client.exhibitors[0];

    const maintenance = await prisma.exhibitorMaintenance.create({
      data: {
        exhibitorId: exhibitor.id,
        type: ExhibitorMaintenanceType.CORRECTIVE,
        description: message,
        notes: "Solicitado pelo portal do cliente.",
      },
    });

    return NextResponse.json({
      ok: true,
      maintenanceId: maintenance.id,
    });
  } catch (error: any) {
    console.error("POST /api/portal/maintenance error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível registrar a solicitação de manutenção.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}