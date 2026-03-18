import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentMethod,
  ReceiptLocation,
  ReceivableStatus,
  TransferStatus,
} from "@prisma/client";

function isValidUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const installmentId = body.installmentId as string | undefined;
    const paymentMethodRaw = String(body.paymentMethod ?? "").toUpperCase();

    if (!isValidUuid(installmentId)) {
      return NextResponse.json(
        { error: "Parcela inválida." },
        { status: 400 }
      );
    }

    const paymentMethod =
      paymentMethodRaw === "PIX"
        ? PaymentMethod.PIX
        : paymentMethodRaw === "CASH"
        ? PaymentMethod.CASH
        : paymentMethodRaw === "CARD_DEBIT"
        ? PaymentMethod.CARD_DEBIT
        : paymentMethodRaw === "CARD_CREDIT"
        ? PaymentMethod.CARD_CREDIT
        : paymentMethodRaw === "BOLETO"
        ? PaymentMethod.BOLETO
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.accountsReceivableInstallment.findUnique({
        where: { id: installmentId },
        include: {
          accountsReceivable: {
            include: {
              order: true,
              region: true,
            },
          },
        },
      });

      if (!installment) {
        throw new Error("Parcela não encontrada.");
      }

      if (installment.status === ReceivableStatus.PAID) {
        throw new Error("Esta parcela já está paga.");
      }

      const receivable = installment.accountsReceivable;
      const finalPaymentMethod = paymentMethod ?? receivable.paymentMethod;
      const paidAt = new Date();

      await tx.accountsReceivableInstallment.update({
        where: { id: installment.id },
        data: {
          status: ReceivableStatus.PAID,
          paidAt,
          receivedCents: installment.amountCents,
        },
      });

      const allInstallments = await tx.accountsReceivableInstallment.findMany({
        where: {
          accountsReceivableId: receivable.id,
        },
        orderBy: {
          installmentNumber: "asc",
        },
      });

      const updatedReceivedCents = allInstallments.reduce((acc, item) => {
        if (item.id === installment.id) {
          return acc + installment.amountCents;
        }
        return acc + item.receivedCents;
      }, 0);

      const allPaid = allInstallments.every((item) =>
        item.id === installment.id
          ? true
          : item.status === ReceivableStatus.PAID
      );

      await tx.accountsReceivable.update({
        where: { id: receivable.id },
        data: {
          receivedCents: updatedReceivedCents,
          status: allPaid ? ReceivableStatus.PAID : ReceivableStatus.PARTIAL,
          paidAt: allPaid ? paidAt : null,
        },
      });

      const location =
        finalPaymentMethod === PaymentMethod.CASH
          ? ReceiptLocation.REGION
          : ReceiptLocation.MATRIX;

      const receipt = await tx.receipt.create({
        data: {
          accountsReceivableId: receivable.id,
          orderId: receivable.orderId,
          regionId: receivable.regionId ?? null,
          receivedById: receivable.sellerId ?? null,
          amountCents: installment.amountCents,
          paymentMethod: finalPaymentMethod,
          receivedAt: paidAt,
          location,
          notes: `Baixa manual da parcela ${installment.installmentNumber}/${receivable.installmentCount}.`,
        },
      });

      if (finalPaymentMethod === PaymentMethod.CASH) {
        await tx.cashTransfer.create({
          data: {
            receiptId: receipt.id,
            regionId: receivable.regionId ?? null,
            transferredById: null,
            amountCents: installment.amountCents,
            status: TransferStatus.PENDING,
            notes: "Valor recebido em dinheiro e aguardando repasse para a matriz.",
          },
        });
      }

      return {
        installmentId: installment.id,
        receiptId: receipt.id,
      };
    });

    return NextResponse.json({
      ok: true,
      message: "Parcela recebida com sucesso.",
      result,
    });
  } catch (error) {
    console.error("POST /api/finance/receivables/receive error:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao dar baixa na parcela.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}