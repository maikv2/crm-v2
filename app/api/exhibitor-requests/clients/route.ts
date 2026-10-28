import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

/** Clientes que podem receber uma solicitacao (representante: so da regiao dele) */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }
    if (user.role === "INVESTOR") {
      return NextResponse.json({ error: "Acesso não permitido." }, { status: 403 });
    }
    if (user.role === "REPRESENTATIVE" && !user.regionId) {
      return NextResponse.json([]);
    }

    const clients = await prisma.client.findMany({
      where: {
        active: true,
        ...(user.role === "REPRESENTATIVE" ? { regionId: user.regionId } : {}),
      },
      select: {
        id: true,
        name: true,
        tradeName: true,
        code: true,
        city: true,
        state: true,
        whatsapp: true,
        phone: true,
        latitude: true,
        longitude: true,
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/exhibitor-requests/clients error:", error);
    return NextResponse.json(
      { error: "Não foi possível carregar os clientes." },
      { status: 500 }
    );
  }
}
