import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  FinanceCategoryType,
  FinanceEntryType,
  FinanceScope,
  FinanceStatus,
  PaymentMethod,
} from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ConfirmationRow = {
  id: string;
  representativeId: string;
  representativeName: string;
  regionId: string | null;
  regionName: string | null;
  weekStart: Date;
  weekEnd: Date;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  tokenExpiresAt: Date;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | string;
  confirmedAt: Date | null;
  financeTransactionId: string | null;
  description: string;
  metadata: unknown;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeToken(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function findConfirmationByToken(token: string) {
  const tokenHash = sha256(token);

  const rows = await prisma.$queryRaw<ConfirmationRow[]>`
    SELECT
      c."id",
      c."representativeId",
      u."name" as "representativeName",
      c."regionId",
      r."name" as "regionName",
      c."weekStart",
      c."weekEnd",
      c."amountCents",
      c."pendingCents",
      c."ordersCount",
      c."tokenExpiresAt",
      c."status",
      c."confirmedAt",
      c."financeTransactionId",
      c."description",
      c."metadata"
    FROM "CommissionPaymentConfirmation" c
    JOIN "User" u ON u."id" = c."representativeId"
    LEFT JOIN "Region" r ON r."id" = c."regionId"
    WHERE c."tokenHash" = ${tokenHash}
    LIMIT 1;
  `;

  return rows[0] || null;
}

function serialize(row: ConfirmationRow) {
  return {
    id: row.id,
    representative: row.representativeName,
    region: row.regionName || "Sem região",
    weekStart: row.weekStart,
    weekEnd: row.weekEnd,
    amountCents: row.amountCents,
    pendingCents: row.pendingCents,
    ordersCount: row.ordersCount,
    status: row.status,
    confirmedAt: row.confirmedAt,
    tokenExpiresAt: row.tokenExpiresAt,
    description: row.description,
    metadata: row.metadata,
  };
}

export async function GET(request: Request) {
  try {
    const token = normalizeToken(new URL(request.url).searchParams.get("token"));

    if (!token) {
      return NextResponse.json({ error: "Token não informado." }, { status: 400 });
    }

    const row = await findConfirmationByToken(token);

    if (!row) {
      return NextResponse.json({ error: "Link inválido ou não encontrado." }, { status: 404 });
    }

    if (row.status === "PENDING" && row.tokenExpiresAt.getTime() < Date.now()) {
      await prisma.$executeRaw`
        UPDATE "CommissionPaymentConfirmation"
        SET "status" = 'EXPIRED', "updatedAt" = now()
        WHERE "id" = ${row.id}::uuid;
      `;
      row.status = "EXPIRED";
    }

    return NextResponse.json({ ok: true, confirmation: serialize(row) });
  } catch (error) {
    console.error("GET /api/finance/commission-payment/confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao consultar pagamento." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = normalizeToken(body.token);

    if (!token) {
      return NextResponse.json({ error: "Token não informado." }, { status: 400 });
    }

    const row = await findConfirmationByToken(token);

    if (!row) {
      return NextResponse.json({ error: "Link inválido ou não encontrado." }, { status: 404 });
    }

    if (row.status === "PAID") {
      return NextResponse.json({ ok: true, alreadyPaid: true, confirmation: serialize(row) });
    }

    if (row.status !== "PENDING") {
      return NextResponse.json(
        { error: `Este lançamento não pode ser confirmado. Status atual: ${row.status}.` },
        { status: 409 }
      );
    }

    if (row.tokenExpiresAt.getTime() < Date.now()) {
      await prisma.$executeRaw`
        UPDATE "CommissionPaymentConfirmation"
        SET "status" = 'EXPIRED', "updatedAt" = now()
        WHERE "id" = ${row.id}::uuid;
      `;

      return NextResponse.json({ error: "Este link expirou." }, { status: 410 });
    }

    if (!row.amountCents || row.amountCents <= 0) {
      return NextResponse.json(
        { error: "Não há valor liberado para pagamento neste fechamento." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const freshRows = await tx.$queryRaw<ConfirmationRow[]>`
        SELECT
          c."id",
          c."representativeId",
          u."name" as "representativeName",
          c."regionId",
          r."name" as "regionName",
          c."weekStart",
          c."weekEnd",
          c."amountCents",
          c."pendingCents",
          c."ordersCount",
          c."tokenExpiresAt",
          c."status",
          c."confirmedAt",
          c."financeTransactionId",
          c."description",
          c."metadata"
        FROM "CommissionPaymentConfirmation" c
        JOIN "User" u ON u."id" = c."representativeId"
        LEFT JOIN "Region" r ON r."id" = c."regionId"
        WHERE c."id" = ${row.id}::uuid
        FOR UPDATE;
      `;

      const fresh = freshRows[0];
      if (!fresh) throw new Error("Confirmação não encontrada.");
      if (fresh.status === "PAID") return { confirmation: fresh, transaction: null, alreadyPaid: true };
      if (fresh.status !== "PENDING") {
        throw new Error(`Este lançamento não pode ser confirmado. Status atual: ${fresh.status}.`);
      }
      if (fresh.tokenExpiresAt.getTime() < Date.now()) {
        await tx.$executeRaw`
          UPDATE "CommissionPaymentConfirmation"
          SET "status" = 'EXPIRED', "updatedAt" = now()
          WHERE "id" = ${fresh.id}::uuid;
        `;
        throw new Error("Este link expirou.");
      }

      const transaction = await tx.financeTransaction.create({
        data: {
          scope: FinanceScope.MATRIX,
          type: FinanceEntryType.EXPENSE,
          status: FinanceStatus.PAID,
          category: FinanceCategoryType.COMMISSION,
          paymentMethod: PaymentMethod.PIX,
          description: fresh.description,
          amountCents: fresh.amountCents,
          regionId: fresh.regionId,
          paidAt: new Date(),
          dueDate: new Date(),
          competenceMonth: new Date().getMonth() + 1,
          competenceYear: new Date().getFullYear(),
          isSystemGenerated: true,
          notes: [
            `Confirmado por link seguro enviado ao financeiro.`,
            `Representante: ${fresh.representativeName}.`,
            `Período: ${fresh.weekStart.toISOString()} até ${fresh.weekEnd.toISOString()}.`,
            `Pendente para próximo acerto: ${(fresh.pendingCents / 100).toFixed(2)}.`,
          ].join("\n"),
        },
      });

      await tx.$executeRaw`
        UPDATE "CommissionPaymentConfirmation"
        SET
          "status" = 'PAID',
          "confirmedAt" = now(),
          "financeTransactionId" = ${transaction.id}::uuid,
          "updatedAt" = now()
        WHERE "id" = ${fresh.id}::uuid;
      `;

      return { confirmation: fresh, transaction, alreadyPaid: false };
    });

    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      confirmation: serialize({ ...row, status: "PAID", confirmedAt: new Date() }),
      financeTransactionId: result.transaction?.id || row.financeTransactionId,
    });
  } catch (error) {
    console.error("POST /api/finance/commission-payment/confirm error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao confirmar pagamento." },
      { status: 500 }
    );
  }
}
