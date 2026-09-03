import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ReceiptLocation,
  ReceivableStatus,
  TransferStatus,
} from "@prisma/client";

export type MarkInstallmentPaidInput = {
  installmentId: string;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  amountCents?: number;
  externalReference?: string | null;
  notes?: string | null;
  receivedById?: string | null;
};

/**
 * Recalcula o paymentStatus/status do pedido a partir de TODAS as
 * AccountsReceivable vinculadas a ele (suporta pedidos com forma de
 * pagamento dividida em várias parcelas/divisões).
 */
export async function recomputeOrderPaymentStatus(
  tx: Prisma.TransactionClient,
  orderId: string
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  const receivables = await tx.accountsReceivable.findMany({
    where: { orderId, status: { not: ReceivableStatus.CANCELED } },
    select: { status: true, receivedCents: true },
  });

  const allPaid =
    receivables.length > 0 &&
    receivables.every((item) => item.status === ReceivableStatus.PAID);
  const hasAnyPaid = receivables.some(
    (item) => (item.receivedCents ?? 0) > 0 || item.status === ReceivableStatus.PAID
  );

  const paymentStatus = allPaid
    ? PaymentStatus.PAID
    : hasAnyPaid
    ? PaymentStatus.PARTIAL
    : PaymentStatus.PENDING;

  await tx.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      ...(allPaid && order?.status === "PENDING" ? { status: "PAID" } : {}),
    },
  });

  return { paymentStatus, allPaid };
}

export async function markReceivableInstallmentPaid(
  tx: Prisma.TransactionClient,
  input: MarkInstallmentPaidInput
) {
  const externalReference = input.externalReference?.trim() || null;

  if (externalReference) {
    const existingReceipt = await tx.receipt.findFirst({
      where: { externalReference },
      select: { id: true },
    });

    if (existingReceipt) {
      return {
        alreadyProcessed: true,
        installmentId: input.installmentId,
        receiptId: existingReceipt.id,
      };
    }
  }

  const installment = await tx.accountsReceivableInstallment.findUnique({
    where: { id: input.installmentId },
    include: {
      accountsReceivable: {
        include: {
          order: true,
        },
      },
    },
  });

  if (!installment) {
    throw new Error("Parcela não encontrada.");
  }

  const receivable = installment.accountsReceivable;
  const finalPaymentMethod = input.paymentMethod ?? receivable.paymentMethod;
  const paidAt = input.paidAt ?? new Date();
  const amountCents = Math.max(0, input.amountCents ?? installment.amountCents);

  if (installment.status === ReceivableStatus.PAID) {
    return {
      alreadyProcessed: true,
      installmentId: installment.id,
      receiptId: null,
    };
  }

  await tx.accountsReceivableInstallment.update({
    where: { id: installment.id },
    data: {
      status: ReceivableStatus.PAID,
      paidAt,
      receivedCents: Math.max(installment.amountCents, amountCents),
    },
  });

  const allInstallments = await tx.accountsReceivableInstallment.findMany({
    where: { accountsReceivableId: receivable.id },
    orderBy: { installmentNumber: "asc" },
  });

  const updatedReceivedCents = allInstallments.reduce(
    (acc, item) => acc + (item.receivedCents ?? 0),
    0
  );
  const allPaid = allInstallments.every(
    (item) => item.status === ReceivableStatus.PAID
  );

  await tx.accountsReceivable.update({
    where: { id: receivable.id },
    data: {
      receivedCents: updatedReceivedCents,
      status: allPaid ? ReceivableStatus.PAID : ReceivableStatus.PARTIAL,
      paidAt: allPaid ? paidAt : null,
    },
  });

  await recomputeOrderPaymentStatus(tx, receivable.orderId);

  const location =
    finalPaymentMethod === PaymentMethod.CASH
      ? ReceiptLocation.REGION
      : ReceiptLocation.MATRIX;

  const receipt = await tx.receipt.create({
    data: {
      accountsReceivableId: receivable.id,
      orderId: receivable.orderId,
      regionId: receivable.regionId ?? null,
      receivedById: input.receivedById ?? receivable.sellerId ?? null,
      amountCents,
      paymentMethod: finalPaymentMethod,
      receivedAt: paidAt,
      location,
      externalReference,
      notes:
        input.notes ??
        `Baixa da parcela ${installment.installmentNumber}/${receivable.installmentCount}.`,
    },
  });

  if (finalPaymentMethod === PaymentMethod.CASH) {
    await tx.cashTransfer.create({
      data: {
        receiptId: receipt.id,
        regionId: receivable.regionId ?? null,
        transferredById: null,
        amountCents,
        status: TransferStatus.PENDING,
        notes: "Valor recebido em dinheiro e aguardando repasse para a matriz.",
      },
    });
  }

  return {
    alreadyProcessed: false,
    installmentId: installment.id,
    receiptId: receipt.id,
  };
}
