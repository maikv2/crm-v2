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
      return NextResponse.json({ items: [] });
    }

    const items = await prisma.client.findMany({
      where: {
        regionId: user.regionId,
      },
      select: {
        id: true,
        name: true,
        legalName: true,
        city: true,
        state: true,
        phone: true,
        email: true,
        code: true,
        active: true,
        regionId: true,
        region: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            exhibitors: true,
            orders: true,
          },
        },
        orders: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      items: items.map((client) => ({
        id: client.id,
        name: client.name,
        legalName: client.legalName,
        city: client.city,
        state: client.state,
        phone: client.phone,
        email: client.email,
        code: client.code,
        active: client.active,
        regionId: client.regionId,
        region: client.region,
        exhibitorCount: client._count.exhibitors,
        totalOrders: client._count.orders,
        lastOrderAt: client.orders[0]?.createdAt ?? null,
      })),
    });
  } catch (error) {
    console.error("REP CLIENTS ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar clientes do representante." },
      { status: 500 }
    );
  }
}