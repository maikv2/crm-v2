import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const installments = await prisma.accountsReceivableInstallment.findMany({
    orderBy: {
      dueDate: "asc",
    },
    include: {
      accountsReceivable: {
        include: {
          region: true,
          order: {
            include: {
              client: true,
            },
          },
        },
      },
      externalPayments: {
        where: {
          provider: "EFI",
          type: { in: ["BOLETO", "BOLIX"] },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return NextResponse.json(installments);
}
