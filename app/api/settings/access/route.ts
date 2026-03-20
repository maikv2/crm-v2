import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();

    const [users, investors, clients] = await Promise.all([
      prisma.user.findMany({
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.investor.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              active: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),
      prisma.client.findMany({
        where: {
          roleClient: true,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          billingEmail: true,
          region: {
            select: {
              name: true,
            },
          },
          portalEnabled: true,
        },
      }),
    ]);

    const adminAndRepresentatives = users
      .filter((user) => user.role === "ADMIN" || user.role === "REPRESENTATIVE")
      .map((user) => ({
        id: user.id,
        type: user.role as "ADMIN" | "REPRESENTATIVE",
        name: user.name,
        email: user.email,
        loginEmail: user.email,
        regionName: user.region?.name ?? null,
        active: user.active,
        hasAccess: true,
      }));

    const investorItems = investors.map((investor) => ({
      id: investor.id,
      type: "INVESTOR" as const,
      name: investor.name,
      email: investor.email ?? null,
      loginEmail: investor.user?.email ?? investor.email ?? null,
      regionName: null,
      active: investor.user?.active ?? false,
      hasAccess: Boolean(investor.userId && investor.user),
    }));

    const clientItems = clients.map((client) => ({
      id: client.id,
      type: "CLIENT" as const,
      name: client.name,
      email: client.billingEmail ?? client.email ?? null,
      loginEmail: client.name,
      regionName: client.region?.name ?? null,
      active: client.portalEnabled,
      hasAccess: Boolean(client.portalEnabled),
    }));

    return NextResponse.json({
      items: [...adminAndRepresentatives, ...investorItems, ...clientItems],
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    console.error("GET /api/settings/access error:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os acessos." },
      { status: 500 }
    );
  }
}