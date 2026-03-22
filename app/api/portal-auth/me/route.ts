import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const clientId = cookieStore.get("portal_session")?.value;

    if (!clientId) {
      return NextResponse.json(
        { error: "Sessão do portal não encontrada." },
        { status: 401 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        code: true,
        city: true,
        district: true,
        cpf: true,
        cnpj: true,
        exhibitors: {
          orderBy: {
            installedAt: "desc",
          },
          select: {
            id: true,
            code: true,
            name: true,
            model: true,
            type: true,
            status: true,
            installedAt: true,
            nextVisitAt: true,
            stocks: {
              select: {
                id: true,
                quantity: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            initialItems: {
              select: {
                id: true,
                quantity: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            maintenances: {
              orderBy: {
                performedAt: "desc",
              },
              select: {
                id: true,
                type: true,
                description: true,
                solution: true,
                notes: true,
                performedAt: true,
                nextActionAt: true,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      client: {
        ...client,
        exhibitors: client.exhibitors.map((exhibitor) => ({
          ...exhibitor,
          products:
            exhibitor.stocks && exhibitor.stocks.length > 0
              ? exhibitor.stocks
              : exhibitor.initialItems,
        })),
      },
    });
  } catch (error: any) {
    console.error("GET /api/portal-auth/me error:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os dados do portal.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}