import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PaymentMethod,
} from "@prisma/client";
import { markReceivableInstallmentPaid } from "@/lib/receivables";

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
    const validInstallmentId = String(installmentId);

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

    const result = await prisma.$transaction((tx) =>
      markReceivableInstallmentPaid(tx, {
        installmentId: validInstallmentId,
        paymentMethod: paymentMethod ?? undefined,
      })
    );

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
