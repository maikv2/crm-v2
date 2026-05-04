import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendText, normalizeBrazilPhone } from "@/lib/zapi";

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


function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getPublicBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

type ConfirmationRecord = {
  id: string;
  tokenHash: string;
};

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
  baseUrl: string;
  metadata: unknown;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const description = `Pagamento de comissão - ${params.representativeName} - ${dateToShortBR(params.weekStart)} a ${dateToShortBR(params.weekEnd)}`;

  const records = await prisma.$queryRaw<ConfirmationRecord[]>`
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
    RETURNING "id", "tokenHash";
  `;

  const record = records[0];
  const wasAlreadyPaid = record?.tokenHash !== tokenHash;

  return {
  confirmationId: record?.id,
  token: wasAlreadyPaid ? null : token,
  confirmationUrl: wasAlreadyPaid
    ? null
    : `${params.baseUrl}/payments/commission/confirm?token=${encodeURIComponent(token)}`,
  wasAlreadyPaid,
};
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
  // O cron roda na segunda. Considerando Brasil UTC-3:
  // segunda 00:00 BRT = segunda 03:00 UTC.
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
  pendingCommissionCents: number;
  payableOrders: Array<{
    number: number;
    clientName: string;
    commissionCents: number;
  }>;
  pendingOrders: Array<{
    number: number;
    clientName: string;
    pendingCommissionCents: number;
    reason: string;
  }>;
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

  const extraPayable = params.payableOrders.length > 12 ? `\n• +${params.payableOrders.length - 12} pedidos liberados no relatório.` : "";
  const extraPending = params.pendingOrders.length > 12 ? `\n• +${params.pendingOrders.length - 12} pedidos pendentes no relatório.` : "";

  const pixBlock = params.pixKey
    ? [
        "",
        "*Dados para Pix do representante:*",
        `Favorecido: ${params.pixName || params.representativeName}`,
        `Tipo: ${params.pixType || "não informado"}`,
        `Chave: ${params.pixKey}`,
      ].join("\n")
    : [
        "",
        "*Atenção:* representante sem chave Pix cadastrada.",
      ].join("\n");

  return [
    "*Fechamento semanal de comissão*",
    `Período: ${dateToShortBR(params.periodStart)} a ${dateToShortBR(params.periodEnd)}`,
    `Representante: ${params.representativeName}`,
    `Região: ${params.regionName}`,
    "",
    `Pedidos no período: ${params.orderCount}`,
    `Total vendido: ${centsToBRL(params.totalSalesCents)}`,
    `Comissão total gerada: ${centsToBRL(params.totalCommissionCents)}`,
    "",
    `*Valor a pagar hoje:* ${centsToBRL(params.payableCommissionCents)}`,
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
      skippedReason?: string;
      zapi?: unknown;
    }> = [];

    for (const representative of representatives) {
      const orders = (await prisma.order.findMany({
        where: {
          sellerId: representative.id,
          type: "SALE",
          issuedAt: {
            gte: start,
            lt: endExclusive,
          },
          status: {
            not: "CANCELLED",
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

      const totalSalesCents = orders.reduce((acc, order) => acc + (order.totalCents || 0), 0);
      const totalCommissionCents = orders.reduce(
        (acc, order) => acc + (order.commissionTotalCents || 0),
        0
      );

      const payableOrders: Array<{ number: number; clientName: string; commissionCents: number }> = [];
      const pendingOrders: Array<{
        number: number;
        clientName: string;
        pendingCommissionCents: number;
        reason: string;
      }> = [];

      for (const order of orders) {
        const paidCents = getPaidCents(order);
        const payableCommissionCents = proratedCommission(order, paidCents);
        const pendingCommissionCents = Math.max(
          0,
          (order.commissionTotalCents || 0) - payableCommissionCents
        );

        if (payableCommissionCents > 0) {
          payableOrders.push({
            number: order.number,
            clientName: order.client.name,
            commissionCents: payableCommissionCents,
          });
        }

        if (pendingCommissionCents > 0) {
          pendingOrders.push({
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
      const pendingCommissionCents = pendingOrders.reduce(
        (acc, order) => acc + order.pendingCommissionCents,
        0
      );
      const regionName = representative.region?.name || orders[0]?.region.name || "Sem região";

      if (!orders.length && payableCommissionCents === 0 && pendingCommissionCents === 0) {
        results.push({
          representative: representative.name,
          region: regionName,
          orders: 0,
          payableCommissionCents: 0,
          pendingCommissionCents: 0,
          sent: false,
          skippedReason: "Sem pedidos no período.",
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
        ordersCount: orders.length,
        representativeName: representative.name,
        regionName,
        baseUrl,
        metadata: {
          totalSalesCents,
          totalCommissionCents,
          payableOrders,
          pendingOrders,
          pixKey: representative.pixKey,
          pixName: representative.pixName,
          pixType: representative.pixType,
        },
      });

      const message = [
        buildRepresentativeMessage({
          representativeName: representative.name,
          regionName,
          pixKey: representative.pixKey,
          pixName: representative.pixName,
          pixType: representative.pixType,
          periodStart: start,
          periodEnd: endDisplay,
          orderCount: orders.length,
          totalSalesCents,
          totalCommissionCents,
          payableCommissionCents,
          pendingCommissionCents,
          payableOrders,
          pendingOrders,
        }),
        "",
        confirmation.confirmationUrl
          ? `*Confirmar pagamento:*\n${confirmation.confirmationUrl}`
          : "*Pagamento já confirmado anteriormente para este período.*",
      ].join("\n");

      const zapi = await sendText({ phone: financialPhone, message });

      results.push({
        representative: representative.name,
        region: regionName,
        orders: orders.length,
        payableCommissionCents,
        pendingCommissionCents,
        confirmationUrl: confirmation.confirmationUrl,
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
