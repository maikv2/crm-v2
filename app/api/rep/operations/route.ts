import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json({
        portalOrders: [],
        maintenanceRequests: [],
        visitRequests: [],
      });
    }

    const [portalOrders, maintenanceRequests] = await Promise.all([
      prisma.portalOrderRequest.findMany({
        where: {
          regionId: user.regionId,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  priceCents: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.exhibitorMaintenance.findMany({
        where: {
          notes: "Solicitado pelo portal do cliente.",
          exhibitor: {
            regionId: user.regionId,
          },
        },
        include: {
          exhibitor: {
            select: {
              id: true,
              name: true,
              code: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      portalOrders: portalOrders.map((request) => ({
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
        notes: request.notes,
        client: request.client
          ? {
              id: request.client.id,
              name: request.client.name,
              city: request.client.city,
              state: request.client.state,
              phone: request.client.phone,
            }
          : null,
        items: request.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          product: item.product
            ? {
                id: item.product.id,
                name: item.product.name,
                sku: item.product.sku,
                priceCents: item.product.priceCents,
              }
            : null,
        })),
      })),

      maintenanceRequests: maintenanceRequests.map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        performedAt: item.performedAt,
        type: item.type,
        description: item.description,
        solution: item.solution,
        notes: item.notes,
        exhibitor: item.exhibitor
          ? {
              id: item.exhibitor.id,
              name: item.exhibitor.name,
              code: item.exhibitor.code,
            }
          : null,
        client: item.exhibitor?.client
          ? {
              id: item.exhibitor.client.id,
              name: item.exhibitor.client.name,
              city: item.exhibitor.client.city,
              state: item.exhibitor.client.state,
              phone: item.exhibitor.client.phone,
            }
          : null,
      })),

      visitRequests: [],
    });
  } catch (error) {
    console.error("GET /api/rep/operations error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar centro de operações." },
      { status: 500 }
    );
  }
}