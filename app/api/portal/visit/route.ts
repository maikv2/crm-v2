import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("portal_session")?.value;

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const message = String(body?.message ?? "");

    await prisma.visit.create({
      data: {
        clientId: session,
        notes: message,
        negotiationDone: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PORTAL VISIT ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao solicitar visita." },
      { status: 500 }
    );
  }
}