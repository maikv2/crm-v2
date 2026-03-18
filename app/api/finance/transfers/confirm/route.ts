import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const id = body.id as string;

    const transfer = await prisma.cashTransfer.update({
      where: { id },
      data: {
        status: "TRANSFERRED",
        transferredAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      transfer,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao confirmar repasse" },
      { status: 500 }
    );
  }
}