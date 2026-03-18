import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[parts.length - 1];

    if (!id) {
      return NextResponse.json(
        { error: "ID do expositor não recebido" },
        { status: 400 }
      );
    }

    const exhibitor = await prisma.exhibitor.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        maintenances: {
          orderBy: {
            performedAt: "desc",
          },
        },
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!exhibitor) {
      return NextResponse.json(
        { error: "Expositor não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: exhibitor.id,
      name: exhibitor.name,
      code: exhibitor.code,
      model: exhibitor.model,
      status: exhibitor.status,
      type: exhibitor.type,
      installedAt: exhibitor.installedAt,
      lastVisitAt: exhibitor.lastVisitAt,
      nextVisitAt: exhibitor.nextVisitAt,
      notes: exhibitor.notes,

      client: exhibitor.client
        ? {
            id: exhibitor.client.id,
            name: exhibitor.client.name,
            city: exhibitor.client.city,
            state: exhibitor.client.state,
            phone: exhibitor.client.phone,
            email: exhibitor.client.email,
          }
        : null,

      region: exhibitor.region
        ? {
            id: exhibitor.region.id,
            name: exhibitor.region.name,
          }
        : null,

      products: Array.isArray(exhibitor.stocks)
        ? exhibitor.stocks.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  sku: item.product.sku,
                }
              : null,
          }))
        : [],

      maintenances: Array.isArray(exhibitor.maintenances)
        ? exhibitor.maintenances.map((maintenance) => ({
            id: maintenance.id,
            status: maintenance.type,
            createdAt:
              maintenance.performedAt ?? maintenance.createdAt ?? null,
            notes: maintenance.notes,
          }))
        : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Erro ao buscar expositor",
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}