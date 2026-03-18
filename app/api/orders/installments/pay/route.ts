import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const installmentId = body.installmentId as string;

    if (!installmentId) {
      return NextResponse.json(
        { error: "Parcela inválida." },
        { status: 400 }
      );
    }

    const installment = await prisma.accountsReceivableInstallment.findUnique({
      where: { id: installmentId },
      include: {
        accountsReceivable: true,
      },
    });

    if (!installment) {
      return NextResponse.json(
        { error: "Parcela não encontrada." },
        { status: 404 }
      );
    }

    if (installment.status === "PAID") {
      return NextResponse.json(
        { error: "Parcela já está paga." },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.accountsReceivableInstallment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidAt: now,
        receivedCents: installment.amountCents,
      },
    });

    const installments = await prisma.accountsReceivableInstallment.findMany({
      where: {
        accountsReceivableId: installment.accountsReceivableId,
      },
    });

    const total = installments.reduce(
      (sum, i) => sum + i.amountCents,
      0
    );

    const received = installments.reduce(
      (sum, i) => sum + (i.receivedCents ?? 0),
      0
    );

    await prisma.accountsReceivable.update({
      where: { id: installment.accountsReceivableId },
      data: {
        receivedCents: received,
        status:
          received === 0
            ? "PENDING"
            : received < total
            ? "PARTIAL"
            : "PAID",
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao registrar pagamento." },
      { status: 500 }
    );
  }
}