import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const installmentId = body.installmentId;

    if (!installmentId) {
      return NextResponse.json(
        { error: "installmentId obrigatório" },
        { status: 400 }
      );
    }

    const installment = await prisma.accountsReceivableInstallment.findUnique({
      where: {
        id: installmentId,
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: "Parcela não encontrada" },
        { status: 404 }
      );
    }

    const updated = await prisma.accountsReceivableInstallment.update({
      where: {
        id: installmentId,
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao registrar pagamento" },
      { status: 500 }
    );
  }
}