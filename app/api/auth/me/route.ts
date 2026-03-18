import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("crm_session")?.value;

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        regionId: true,
        stockLocationId: true,
        region: {
          select: {
            id: true,
            name: true,
            active: true,
            stockLocationId: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        },
        stockLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      cookieStore.set("crm_session", "", {
        path: "/",
        expires: new Date(0),
      });

      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("AUTH ME ERROR:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuário logado." },
      { status: 500 }
    );
  }
}