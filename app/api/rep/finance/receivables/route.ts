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
        region: null,
        items: [],
      });
    }

    const [region, items] = await Promise.all([
      prisma.region.findUnique({
        where: { id: user.regionId },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.accountsReceivableInstallment.findMany({
        where: {
          accountsReceivable: {
            regionId: user.regionId,
          },
        },
        select: {
          id: true,
          amountCents: true,
          dueDate: true,
          status: true,
          accountsReceivable: {
            select: {
              id: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
              order: {
                select: {
                  id: true,
                  number: true,
                },
              },
            },
          },
        },
        orderBy: [{ dueDate: "asc" }],
        take: 300,
      }),
    ]);

    return NextResponse.json({
      region,
      items: items.map((item) => ({
        id: item.id,
        amountCents: item.amountCents,
        dueDate: item.dueDate,
        status: item.status,
        client: item.accountsReceivable.client,
        order: item.accountsReceivable.order,
      })),
    });
  } catch (error) {
    console.error("REP FINANCE RECEIVABLES ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar contas a receber do representante." },
      { status: 500 }
    );
  }
}