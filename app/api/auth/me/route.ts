import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("crm_session")?.value?.trim();

    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    if (!isUuid(session)) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.set("crm_session", "", {
        path: "/",
        expires: new Date(0),
      });
      return response;
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
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.set("crm_session", "", {
        path: "/",
        expires: new Date(0),
      });
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("AUTH ME ERROR:", error);

    return NextResponse.json(
      {
        error: "Erro ao buscar usuário logado.",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}