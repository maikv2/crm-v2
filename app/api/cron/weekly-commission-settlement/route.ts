import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendText, normalizeBrazilPhone } from "@/lib/zapi";
import {
  FinanceCategoryType,
  FinanceEntryType,
  FinanceScope,
  FinanceStatus,
  PaymentMethod,
} from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReceivableStatusLike = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELED" | string;

type OrderForSettlement = {
  id: string;
  number: number;
  issuedAt: Date;
  totalCents: number;
  commissionTotalCents: number;
  paymentStatus: string;
  client: { name: string };
  region: { name: string };
  accountsReceivables: Array<{
    id: string;
    status: ReceivableStatusLike;
    amountCents: number;
    receivedCents: number;
    dueDate: Date | null;
    paidAt: Date | null;
    installments: Array<{
      installmentNumber: number;
      amountCents: number;
      receivedCents: number;
      dueDate: Date;
      paidAt: Date | null;
      status: ReceivableStatusLike;
    }>;
  }>;
};

type PayableOrderPayload = {
  orderId: string;
  number: number;
  clientName: string;
  commissionCents: number;
  isCurrentWeekSale: boolean;
};

type PendingOrderPayload = {
  orderId: string;
  number: number;
  clientName: string;
  pendingCommissionCents: number;
  reason: string;
};

type ConfirmationRecord = {
  id: string;
  tokenHash: string;
  status: string;
  financeTransactionId: string | null;
};

type ConfirmationMetadataRecord = {
  metadata: unknown;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getPublicBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function centsToBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
}

function dateToBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function dateToShortBR(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getPreviousMondayToSundayPeriod(now = new Date()) {
  const saoPauloOffsetHours = 3;
  const localLike = new Date(now.getTime() - saoPauloOffsetHours * 60 * 60 * 1000);
  const day = localLike.getUTCDay();
  const diffToCurrentMonday = day === 0 ? -6 : 1 - day;

  const currentMondayLocalLike = new Date(localLike);
  currentMondayLocalLike.setUTCDate(localLike.getUTCDate() + diffToCurrentMonday);
  currentMondayLocalLike.setUTCHours(0, 0, 0, 0);

  const startLocalLike = new Date(currentMondayLocalLike);
  startLocalLike.setUTCDate(currentMondayLocalLike.getUTCDate() - 7);

  const endLocalLikeExclusive = new Date(currentMondayLocalLike);

  const start = new Date(startLocalLike.getTime() + saoPauloOffsetHours * 60 * 60 * 1000);
  const endExclusive = new Date(endLocalLikeExclusive.getTime() + saoPauloOffsetHours * 60 * 60 * 1000);
  const endDisplay = new Date(endExclusive.getTime() - 1);

  return { start, endExclusive, endDisplay };
}

function isPaidStatus(status?: string | null) {
  return status === "PAID";
}

function getPaidCents(order: OrderForSettlement) {
  if (!order.accountsReceivables.length) {
    return isPaidStatus(order.paymentStatus) ? order.totalCents : 0;
  }

  let paid = 0;

  for (const receivable of order.accountsReceivables) {
    if (receivable.installments.length) {
      for (const installment of receivable.installments) {
        const received = Math.max(0, installment.receivedCents || 0);
        if (isPaidStatus(installment.status) || installment.paidAt) {
          paid += Math.max(received, installment.amountCents || 0);
        } else {
          paid += Math.min(received, installment.amountCents || 0);
        }
      }
      continue;
    }

    const received = Math.max(0, receivable.receivedCents || 0);
    if (isPaidStatus(receivable.status) || receivable.paidAt) {
      paid += Math.max(received, receivable.amountCents || 0);
    } else {
      paid += Math.min(received, receivable.amountCents || 0);
    }
  }

  return Math.min(paid, order.totalCents || paid);
}

function proratedCommission(order: OrderForSettlement, paidCents: number) {
  const commission = Math.max(0, order.commissionTotalCents || 0);
  const total = Math.max(0, order.totalCents || 0);

  if (!commission || !total || !paidCents) return 0;
  if (paidCents >= total) return commission;

  return Math.round((commission * paidCents) / total);
}

function getPendingReason(order: OrderForSettlement, today: Date) {
  const pendingLines: string[] = [];

  if (!order.accountsReceivables.length) {
    if (!isPaidStatus(order.paymentStatus)) {
      pendingLines.push("pedido ainda não consta como recebido no financeiro");
    }
    return pendingLines.join("; ");
  }

  for (const receivable of order.accountsReceivables) {
    if (receivable.installments.length) {
      for (const installment of receivable.installments) {
        const amount = installment.amountCents || 0;
        const received = installment.receivedCents || 0;
        const stillOpen = !isPaidStatus(installment.status) && !installment.paidAt && received < amount;
        if (!stillOpen) continue;

        const due = installment.dueDate;
        const isLate = due.getTime() < today.getTime();
        pendingLines.push(
          isLate
            ? `parcela ${installment.installmentNumber} em atraso, venceu em ${dateToBR(due)}`
            : `parcela ${installment.installmentNumber} em aberto, vence em ${dateToBR(due)}`
        );
      }
      continue;
    }

    const amount = receivable.amountCents || 0;
    const received = receivable.receivedCents || 0;
    const stillOpen = !isPaidStatus(receivable.status) && !receivable.paidAt && received < amount;
    if (!stillOpen) continue;

    if (!receivable.dueDate) {
      pendingLines.push("recebimento em aberto sem data de vencimento cadastrada");
      continue;
    }

    const isLate = receivable.dueDate.getTime() < today.getTime();
    pendingLines.push(
      isLate
        ? `recebimento em atraso, venceu em ${dateToBR(receivable.dueDate)}`
        : `recebimento em aberto, vence em ${dateToBR(receivable.dueDate)}`
    );
  }

  return pendingLines.join("; ");
}

function getCommittedFromMetadata(metadata: unknown) {
  const committed = new Map<string, number>();
  const payload = metadata as { payableOrders?: Array<{ orderId?: unknown; commissionCents?: unknown }> } | null;

  if (!payload || !Array.isArray(payload.payableOrders)) return committed;

  for (const order of payload.payableOrders) {
    if (typeof order.orderId !== "string") continue;
    const commissionCents = typeof order.commissionCents === "number" ? order.commissionCents : 0;
    if (commissionCents <= 0) continue;

    committed.set(order.orderId, (committed.get(order.orderId) || 0) + commissionCents);
  }

  return committed;
}

async function getPreviouslyCommittedCommissions(params: {
  representativeId: string;
  weekStart: Date;
  weekEnd: Date;
}) {
  const rows = await prisma.$queryRaw<ConfirmationMetadataRecord[]>`
    SELECT "metadata"
    FROM "CommissionPaymentConfirmation"
    WHERE "representativeId" = ${params.representativeId}::uuid
      AND "status" IN ('PENDING', 'PAID')
      AND NOT (
        "weekStart" = ${params.weekStart}
        AND "weekEnd" = ${params.weekEnd}
      );
  `;

  const committed = new Map<string, number>();

  for (const row of rows) {
    const partial = getCommittedFromMetadata(row.metadata);
    for (const [orderId, commissionCents] of partial.entries()) {
      committed.set(orderId, (committed.get(orderId) || 0) + commissionCents);
    }
  }

  return committed;
}

async function createOrRefreshPaymentConfirmation(params: {
  representativeId: string;
  regionId?: string | null;
  weekStart: Date;
  weekEnd: Date;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  representativeName: string;
  regionName: string;
  metadata: unknown;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const description = `Pagamento de comissão - ${params.representativeName} - ${dateToShortBR(params.weekStart)} a ${dateToShortBR(params.weekEnd)}`;

  const result = await prisma.$transaction(async (tx) => {
    const records = await tx.$queryRaw<ConfirmationRecord[]>`
      INSERT INTO "CommissionPaymentConfirmation" (
        "representativeId",
        "regionId",
        "weekStart",
        "weekEnd",
        "amountCents",
        "pendingCents",
        "ordersCount",
        "tokenHash",
        "tokenExpiresAt",
        "status",
        "description",
        "metadata",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${params.representativeId}::uuid,
        ${params.regionId ? params.regionId : null}::uuid,
        ${params.weekStart},
        ${params.weekEnd},
        ${params.amountCents},
        ${params.pendingCents},
        ${params.ordersCount},
        ${tokenHash},
        ${tokenExpiresAt},
        'PENDING',
        ${description},
        ${JSON.stringify(params.metadata)}::jsonb,
        now(),
        now()
      )
      ON CONFLICT ("representativeId", "weekStart", "weekEnd")
      DO UPDATE SET
        "regionId" = EXCLUDED."regionId",
        "amountCents" = EXCLUDED."amountCents",
        "pendingCents" = EXCLUDED."pendingCents",
        "ordersCount" = EXCLUDED."ordersCount",
        "tokenHash" = CASE
          WHEN "CommissionPaymentConfirmation"."status" = 'PAID'
            THEN "CommissionPaymentConfirmation"."tokenHash"
          ELSE EXCLUDED."tokenHash"
        END,
        "tokenExpiresAt" = CASE
          WHEN "CommissionPaymentConfirmation"."status" = 'PAID'
            THEN "CommissionPaymentConfirmation"."tokenExpiresAt"
          ELSE EXCLUDED."tokenExpiresAt"
        END,
        "status" = CASE
          WHEN "CommissionPaymentConfirmation"."status" = 'PAID'
            THEN "CommissionPaymentConfirmation"."status"
          ELSE 'PENDING'
        END,
        "description" = EXCLUDED."description",
        "metadata" = EXCLUDED."metadata",
        "updatedAt" = now()
      RETURNING "id", "tokenHash", "status", "financeTransactionId";
    `;

    const record = records[0];
    if (!record) throw new Error("Não foi possível criar confirmação de comissão.");

    let financeTransactionId = record.financeTransactionId;

    if (record.status !== "PAID") {
      if (params.amountCents > 0) {
        if (financeTransactionId) {
          await tx.financeTransaction.updateMany({
            where: {
              id: financeTransactionId,
              status: {
                not: FinanceStatus.PAID,
              },
            },
            data: {
              scope: FinanceScope.MATRIX,
              type: FinanceEntryType.EXPENSE,
              status: FinanceStatus.PENDING,
              category: FinanceCategoryType.COMMISSION,
              paymentMethod: PaymentMethod.PIX,
              description,
              amountCents: params.amountCents,
              regionId: params.regionId || null,
              dueDate: new Date(),
              paidAt: null,
              competenceMonth: params.weekEnd.getMonth() + 1,
              competenceYear: params.weekEnd.getFullYear(),
              isSystemGenerated: true,
              notes: [
                "Despesa gerada automaticamente no fechamento semanal de comissão.",
                `Representante: ${params.representativeName}.`,
                `Período: ${params.weekStart.toISOString()} até ${params.weekEnd.toISOString()}.`,
                `Pendente para próximo acerto: ${(params.pendingCents / 100).toFixed(2)}.`,
              ].join("\n"),
            },
          });
        } else {
          const transaction = await tx.financeTransaction.create({
            data: {
              scope: FinanceScope.MATRIX,
              type: FinanceEntryType.EXPENSE,
              status: FinanceStatus.PENDING,
              category: FinanceCategoryType.COMMISSION,
              paymentMethod: PaymentMethod.PIX,
              description,
              amountCents: params.amountCents,
              regionId: params.regionId || null,
              dueDate: new Date(),
              competenceMonth: params.weekEnd.getMonth() + 1,
              competenceYear: params.weekEnd.getFullYear(),
              isSystemGenerated: true,
              notes: [
                "Despesa gerada automaticamente no fechamento semanal de comissão.",
                `Representante: ${params.representativeName}.`,
                `Período: ${params.weekStart.toISOString()} até ${params.weekEnd.toISOString()}.`,
                `Pendente para próximo acerto: ${(params.pendingCents / 100).toFixed(2)}.`,
              ].join("\n"),
            },
          });

          financeTransactionId = transaction.id;

          await tx.$executeRaw`
            UPDATE "CommissionPaymentConfirmation"
            SET "financeTransactionId" = ${transaction.id}::uuid, "updatedAt" = now()
            WHERE "id" = ${record.id}::uuid;
          `;
        }
      } else if (financeTransactionId) {
        await tx.financeTransaction.updateMany({
          where: {
            id: financeTransactionId,
            status: {
              not: FinanceStatus.PAID,
            },
          },
          data: {
            status: FinanceStatus.CANCELLED,
            amountCents: 0,
            notes: "Despesa cancelada automaticamente porque não há comissão liberada para pagamento.",
          },
        });
      }
    }

    return { ...record, financeTransactionId };
  });

  const wasAlreadyPaid = result.status === "PAID" || result.tokenHash !== tokenHash;

  return {
    confirmationId: result.id,
    financeTransactionId: result.financeTransactionId,
    token: wasAlreadyPaid ? null : token,
    confirmationUrl: wasAlreadyPaid ? null : null,
    wasAlreadyPaid,
  };
}

function buildRepresentativeMessage(params: {
  representativeName: string;
  regionName: string;
  pixKey?: string | null;
  pixName?: string | null;
  pixType?: string | null;
  periodStart: Date;
  periodEnd: Date;
  orderCount: number;
  totalSalesCents: number;
  totalCommissionCents: number;
  payableCommissionCents: number;
  payableCurrentWeekCents: number;
  payablePriorWeekCents: number;
  pendingCommissionCents: number;
  payableOrders: PayableOrderPayload[];
  pendingOrders: PendingOrderPayload[];
}) {
  const payableLines = params.payableOrders.length
    ? params.payableOrders
        .slice(0, 12)
        .map(
          (order) =>
            `• PED-${String(order.number).padStart(4, "0")} - ${order.clientName}: ${centsToBRL(order.commissionCents)}`
        )
        .join("\n")
    : "Nenhuma comissão liberada para pagamento neste período.";

  const pendingLines = params.pendingOrders.length
    ? params.pendingOrders
        .slice(0, 12)
        .map(
          (order) =>
            `• PED-${String(order.number).padStart(4, "0")} - ${order.clientName}: ${centsToBRL(order.pendingCommissionCents)} pendente (${order.reason})`
        )
        .join("\n")
    : "Nenhuma comissão pendente neste período.";

  const extraPayable =
    params.payableOrders.length > 12
      ? `\n• +${params.payableOrders.length - 12} pedidos liberados no relatório.`
      : "";
  const extraPending =
    params.pendingOrders.length > 12
      ? `\n• +${params.pendingOrders.length - 12} pedidos pendentes no relatório.`
      : "";

  const pixBlock = params.pixKey
    ? [
        "",
        "*Dados para Pix do representante:*",
        `Favorecido: ${params.pixName || params.representativeName}`,
        `Tipo: ${params.pixType || "não informado"}`,
        `Chave: ${params.pixKey}`,
      ].join("\n")
    : ["", "*Atenção:* representante sem chave Pix cadastrada."].join("\n");

  return [
    "*Fechamento semanal de comissão*",
    `Período: ${dateToShortBR(params.periodStart)} a ${dateToShortBR(params.periodEnd)}`,
    `Representante: ${params.representativeName}`,
    `Região: ${params.regionName}`,
    "",
    `Pedidos considerados: ${params.orderCount}`,
    `Total vendido considerado: ${centsToBRL(params.totalSalesCents)}`,
    `Comissão total considerada: ${centsToBRL(params.totalCommissionCents)}`,
    "",
    `*Valor a pagar hoje:* ${centsToBRL(params.payableCommissionCents)}`,
    ...(params.payableCurrentWeekCents > 0 || params.payablePriorWeekCents > 0
      ? [
          `  → Vendas desta semana: ${centsToBRL(params.payableCurrentWeekCents)}`,
          `  → Vendas de semanas anteriores: ${centsToBRL(params.payablePriorWeekCents)}`,
        ]
      : []),
    `*Pendente para próximo acerto:* ${centsToBRL(params.pendingCommissionCents)}`,
    pixBlock,
    "",
    "*Comissões liberadas:*",
    payableLines + extraPayable,
    "",
    "*Comissões pendentes e motivo:*",
    pendingLines + extraPending,
    "",
    "Regra: comissão liberada somente sobre valores já baixados como recebidos no financeiro.",
  ].join("\n");
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const financialPhone = normalizeBrazilPhone(process.env.FINANCIAL_WHATSAPP);
    if (!financialPhone) {
      return NextResponse.json(
        { error: "FINANCIAL_WHATSAPP não configurado ou inválido." },
        { status: 500 }
      );
    }

    const { start, endExclusive, endDisplay } = getPreviousMondayToSundayPeriod();
    const today = new Date();
    const baseUrl = getPublicBaseUrl(request);

    const representatives = await prisma.user.findMany({
      where: {
        role: "REPRESENTATIVE",
        active: true,
      },
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        pixKey: true,
        pixName: true,
        pixType: true,
        region: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const results: Array<{
      representative: string;
      region: string;
      orders: number;
      payableCommissionCents: number;
      pendingCommissionCents: number;
      sent: boolean;
      confirmationUrl?: string | null;
      financeTransactionId?: string | null;
      skippedReason?: string;
      zapi?: unknown;
    }> = [];

    for (const representative of representatives) {
      const committedCommissions = await getPreviouslyCommittedCommissions({
        representativeId: representative.id,
        weekStart: start,
        weekEnd: endDisplay,
      });

      const orders = (await prisma.order.findMany({
        where: {
          sellerId: representative.id,
          type: "SALE",
          issuedAt: {
            lt: endExclusive,
          },
          status: {
            not: "CANCELLED",
          },
          commissionTotalCents: {
            gt: 0,
          },
        },
        orderBy: [{ issuedAt: "asc" }, { number: "asc" }],
        select: {
          id: true,
          number: true,
          issuedAt: true,
          totalCents: true,
          commissionTotalCents: true,
          paymentStatus: true,
          client: { select: { name: true } },
          region: { select: { name: true } },
          accountsReceivables: {
            select: {
              id: true,
              status: true,
              amountCents: true,
              receivedCents: true,
              dueDate: true,
              paidAt: true,
              installments: {
                orderBy: { installmentNumber: "asc" },
                select: {
                  installmentNumber: true,
                  amountCents: true,
                  receivedCents: true,
                  dueDate: true,
                  paidAt: true,
                  status: true,
                },
              },
            },
          },
        },
      })) as OrderForSettlement[];

      const payableOrders: PayableOrderPayload[] = [];
      const pendingOrders: PendingOrderPayload[] = [];

      let totalSalesCents = 0;
      let totalCommissionCents = 0;

      for (const order of orders) {
        const alreadyCommittedCents = Math.max(0, committedCommissions.get(order.id) || 0);
        const commissionTotalCents = Math.max(0, order.commissionTotalCents || 0);
        const paidCents = getPaidCents(order);
        const releasedCommissionCents = proratedCommission(order, paidCents);
        const payableCommissionCents = Math.max(0, releasedCommissionCents - alreadyCommittedCents);
        const pendingCommissionCents = Math.max(
          0,
          commissionTotalCents - alreadyCommittedCents - payableCommissionCents
        );

        const issuedInCurrentPeriod = order.issuedAt >= start && order.issuedAt < endExclusive;
        const shouldShowOrder = issuedInCurrentPeriod || payableCommissionCents > 0 || pendingCommissionCents > 0;

        if (!shouldShowOrder) continue;

        totalSalesCents += order.totalCents || 0;
        totalCommissionCents += Math.max(0, commissionTotalCents - alreadyCommittedCents);

        if (payableCommissionCents > 0) {
          payableOrders.push({
            orderId: order.id,
            number: order.number,
            clientName: order.client.name,
            commissionCents: payableCommissionCents,
            isCurrentWeekSale: issuedInCurrentPeriod,
          });
        }

        if (pendingCommissionCents > 0) {
          pendingOrders.push({
            orderId: order.id,
            number: order.number,
            clientName: order.client.name,
            pendingCommissionCents,
            reason: getPendingReason(order, today) || "pagamento ainda não baixado no financeiro",
          });
        }
      }

      const payableCommissionCents = payableOrders.reduce(
        (acc, order) => acc + order.commissionCents,
        0
      );
      const payableCurrentWeekCents = payableOrders
        .filter((o) => o.isCurrentWeekSale)
        .reduce((acc, o) => acc + o.commissionCents, 0);
      const payablePriorWeekCents = payableOrders
        .filter((o) => !o.isCurrentWeekSale)
        .reduce((acc, o) => acc + o.commissionCents, 0);
      const pendingCommissionCents = pendingOrders.reduce(
        (acc, order) => acc + order.pendingCommissionCents,
        0
      );
      const ordersCount = new Set([
        ...payableOrders.map((order) => order.orderId),
        ...pendingOrders.map((order) => order.orderId),
      ]).size;

      const regionName = representative.region?.name || orders[0]?.region.name || "Sem região";

      if (ordersCount === 0 && payableCommissionCents === 0 && pendingCommissionCents === 0) {
        results.push({
          representative: representative.name,
          region: regionName,
          orders: 0,
          payableCommissionCents: 0,
          pendingCommissionCents: 0,
          sent: false,
          skippedReason: "Sem comissão liberada ou pendente para este fechamento.",
        });
        continue;
      }

      const confirmation = await createOrRefreshPaymentConfirmation({
        representativeId: representative.id,
        regionId: representative.region?.id || null,
        weekStart: start,
        weekEnd: endDisplay,
        amountCents: payableCommissionCents,
        pendingCents: pendingCommissionCents,
        ordersCount,
        representativeName: representative.name,
        regionName,
        metadata: {
          totalSalesCents,
          totalCommissionCents,
          payableCurrentWeekCents,
          payablePriorWeekCents,
          payableOrders,
          pendingOrders,
          pixKey: representative.pixKey,
          pixName: representative.pixName,
          pixType: representative.pixType,
        },
      });

      const confirmationUrl = confirmation.token
        ? `${baseUrl}/payments/commission/confirm?token=${encodeURIComponent(confirmation.token)}`
        : null;

      const message = [
        buildRepresentativeMessage({
          representativeName: representative.name,
          regionName,
          pixKey: representative.pixKey,
          pixName: representative.pixName,
          pixType: representative.pixType,
          periodStart: start,
          periodEnd: endDisplay,
          orderCount: ordersCount,
          totalSalesCents,
          totalCommissionCents,
          payableCommissionCents,
          payableCurrentWeekCents,
          payablePriorWeekCents,
          pendingCommissionCents,
          payableOrders,
          pendingOrders,
        }),
        "",
        confirmationUrl
          ? `*Confirmar pagamento:*\n${confirmationUrl}`
          : "*Pagamento já confirmado anteriormente para este período.*",
      ].join("\n");

      const zapi = await sendText({ phone: financialPhone, message });

      results.push({
        representative: representative.name,
        region: regionName,
        orders: ordersCount,
        payableCommissionCents,
        pendingCommissionCents,
        confirmationUrl,
        financeTransactionId: confirmation.financeTransactionId,
        sent: true,
        zapi,
      });
    }

    return NextResponse.json({
      ok: true,
      period: {
        start,
        endExclusive,
        endDisplay,
      },
      financialPhone,
      representatives: results,
    });
  } catch (error) {
    console.error("GET /api/cron/weekly-commission-settlement error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao enviar fechamento semanal de comissão.",
      },
      { status: 500 }
    );
  }
}