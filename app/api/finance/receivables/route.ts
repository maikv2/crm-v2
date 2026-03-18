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
    },
  });

  return NextResponse.json(installments);
}