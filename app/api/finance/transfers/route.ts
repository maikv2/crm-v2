import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const transfers = await prisma.cashTransfer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      region: true,
      receipt: {
        include: {
          order: true,
        },
      },
    },
  });

  return NextResponse.json(transfers);
}
