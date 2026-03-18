import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const investor = await prisma.investor.create({
      data: {
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        document: body.document || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(investor);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao criar investidor." },
      { status: 500 }
    );
  }
}