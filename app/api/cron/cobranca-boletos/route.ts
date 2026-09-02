import { NextResponse } from "next/server";
import { PaymentStatus, ReceivableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError, ZApiRequestError } from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const STAGES = [0, 3, 5, 8] as const;
type Stage = (typeof STAGES)[number];

function brtMidnightUtc(date: Date): Date {
  const brt = new Date(date.getTime() + BRT_OFFSET_MS);
  const y = brt.getUTCFullYear();
  const m = brt.getUTCMonth();
  const d = brt.getUTCDate();
  return new Date(Date.UTC(y, m, d) - BRT_OFFSET_MS);
}

function todayBrtMidnightUtc(): Date {
  return brtMidnightUtc(new Date());
}

function daysLate(today: Date, dueDate: Date): number {
  return Math.max(
    0,
    Math.floor((today.getTime() - brtMidnightUtc(dueDate).getTime()) / DAY_MS)
  );
}

function ymd(d: Date): string {
  const local = new Date(d.getTime() + BRT_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatDateBR(d: Date): string {
  const local = new Date(d.getTime() + BRT_OFFSET_MS);
  const day = String(local.getUTCDate()).padStart(2, "0");
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const year = local.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function patriciaPhoneDigits(): string {
  const raw = process.env.FINANCIAL_WHATSAPP || "(47) 99981-1392";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildSegundaViaUrl(orderNumber: number, isPix = false): string {
  const phone = patriciaPhoneDigits();
  const num = String(orderNumber).padStart(6, "0");
  const text = encodeURIComponent(
    `Olá Patrícia, preciso da 2ª via d${isPix ? "o Pix" : "o boleto"} do pedido #${num}`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

function buildMessage(
  stage: Stage,
  params: {
    clientName: string;
    orderNumber: number;
    remainingCents: number;
    dueDate: Date;
    isPix: boolean;
    boletoLink?: string | null;
    barcode?: string | null;
    pixCopyPaste?: string | null;
  }
): string {
  const {
    clientName,
    orderNumber,
    remainingCents,
    dueDate,
    isPix,
    boletoLink,
    barcode,
    pixCopyPaste,
  } = params;
  const num = `#${String(orderNumber).padStart(6, "0")}`;
  const valor = formatBRL(remainingCents);
  const data = formatDateBR(dueDate);
  const link = boletoLink || buildSegundaViaUrl(orderNumber, isPix);
  const cobrancaLabel = isPix ? "Pix" : "boleto";
  const pixLinha = isPix && pixCopyPaste ? `\nPix copia e cola:\n${pixCopyPaste}\n` : "";
  const linhaDigitavel = barcode ? `\nLinha digitável:\n${barcode}\n` : "";
  const linkLabel = isPix
    ? "Pague pelo Pix (código acima) ou pelo link:"
    : "Boleto para pagamento:";
  const linkLabelAtraso = isPix
    ? "Pague pelo Pix (código acima) ou pelo link / 2ª via:"
    : "Boleto / 2ª via para pagamento:";

  if (stage === 0) {
    return (
      `Olá, ${clientName}! 👋\n\n` +
      `Passando rapidinho pra te lembrar com carinho que hoje vence o seu ${cobrancaLabel} aqui na V2 Distribuidora:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: hoje (${data})\n\n` +
      pixLinha +
      `${linkLabel}\n👉 ${link}\n` +
      linhaDigitavel +
      `\n` +
      `Muito obrigado pela parceria de sempre! 🙌\n` +
      `Qualquer dúvida, é só chamar.\n\n` +
      `Equipe V2 Distribuidora`
    );
  }

  if (stage === 3) {
    return (
      `Oi, ${clientName}, tudo bem?\n\n` +
      `Notamos por aqui que seu ${cobrancaLabel} venceu há 3 dias e ainda não consta como pago:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: ${data}\n\n` +
      `Será que você consegue dar uma olhadinha pra gente?\n\n` +
      pixLinha +
      `${linkLabelAtraso}\n👉 ${link}\n` +
      linhaDigitavel +
      `\n` +
      `Obrigado!\n` +
      `Equipe V2 Distribuidora`
    );
  }

  if (stage === 5) {
    return (
      `Olá, ${clientName}.\n\n` +
      `Seu ${cobrancaLabel} está com 5 dias de atraso e ainda não identificamos o pagamento:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: ${data}\n\n` +
      `Pedimos a gentileza de regularizar o quanto antes para mantermos seu crédito ativo aqui na V2.\n\n` +
      pixLinha +
      `${linkLabelAtraso}\n👉 ${link}\n` +
      linhaDigitavel +
      `\n` +
      `Equipe V2 Distribuidora`
    );
  }

  return (
    `Olá, ${clientName}.\n\n` +
    `Seu ${cobrancaLabel} já está com 8 dias de atraso:\n\n` +
    `📄 Pedido: ${num}\n` +
    `💰 Valor: ${valor}\n` +
    `📅 Vencimento: ${data}\n\n` +
    `Pedimos a regularização imediata para evitarmos a suspensão de novas compras e o encaminhamento para protesto.\n\n` +
    `Caso já tenha pago, por favor nos envie o comprovante.\n` +
    pixLinha +
    `${linkLabelAtraso}\n👉 ${link}\n` +
    linhaDigitavel +
    `\n` +
    `Equipe V2 Distribuidora`
  );
}

function alreadyNotified(notes: string | null | undefined, stage: Stage): boolean {
  if (!notes) return false;
  return notes.includes(`[NOTIF_D${stage}_`);
}

function alreadyFinanceNotified(
  notes: string | null | undefined,
  stage: Stage
): boolean {
  if (!notes) return false;
  return notes.includes(`[FIN_NOTIF_D${stage}_`);
}

function alreadyAnyFinanceNotified(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return notes.includes("[FIN_OVERDUE_") || notes.includes("[FIN_NOTIF_D");
}

function notifMarker(stage: Stage, today: Date): string {
  return `[NOTIF_D${stage}_${ymd(today)}]`;
}

function financeNotifMarker(stage: Stage, today: Date): string {
  return `[FIN_NOTIF_D${stage}_${ymd(today)}]`;
}

function financeOverdueMarker(today: Date): string {
  return `[FIN_OVERDUE_${ymd(today)}]`;
}

async function appendInstallmentMarker(installmentId: string, marker: string) {
  const current = await prisma.accountsReceivableInstallment.findUnique({
    where: { id: installmentId },
    select: { notes: true },
  });

  if (!current || current.notes?.includes(marker)) return;

  await prisma.accountsReceivableInstallment.update({
    where: { id: installmentId },
    data: {
      notes: current.notes ? `${current.notes}\n${marker}` : marker,
    },
  });
}

async function findFinanceRecipient() {
  const envPhone = process.env.FINANCIAL_WHATSAPP?.trim();
  if (envPhone) return { name: "Financeiro", phone: envPhone };

  const preferred = await prisma.user.findFirst({
    where: {
      role: "ADMINISTRATIVE",
      active: true,
      phone: { not: null },
      name: { contains: "Patricia", mode: "insensitive" },
    },
    select: { name: true, phone: true },
  });

  if (preferred?.phone) return preferred;

  return prisma.user.findFirst({
    where: {
      role: "ADMINISTRATIVE",
      active: true,
      phone: { not: null },
    },
    orderBy: { name: "asc" },
    select: { name: true, phone: true },
  });
}

function buildFinanceMessage(
  stage: number,
  params: {
    clientName: string;
    orderNumber: number;
    remainingCents: number;
    dueDate: Date;
    isPix: boolean;
    clientPhone?: string | null;
    boletoLink?: string | null;
    barcode?: string | null;
    pixCopyPaste?: string | null;
  }
): string {
  const num = `#${String(params.orderNumber).padStart(6, "0")}`;
  const link = params.boletoLink || buildSegundaViaUrl(params.orderNumber, params.isPix);
  const clientPhone = params.clientPhone || "-";
  const cobrancaLabel = params.isPix ? "Pix" : "boleto";
  const pixLinha =
    params.isPix && params.pixCopyPaste
      ? `\nPix copia e cola:\n${params.pixCopyPaste}\n`
      : "";
  const linhaDigitavel = params.barcode
    ? `\nLinha digitável:\n${params.barcode}\n`
    : "";

  return (
    `${params.isPix ? "Pix" : "Boleto"} em atraso - V2 Distribuidora\n\n` +
    `Cliente: ${params.clientName}\n` +
    `Pedido: ${num}\n` +
    `Valor em aberto: ${formatBRL(params.remainingCents)}\n` +
    `Vencimento: ${formatDateBR(params.dueDate)}\n` +
    `Atraso: ${stage} dia${stage > 1 ? "s" : ""}\n` +
    `Telefone do cliente: ${clientPhone}\n\n` +
    pixLinha +
    `${params.isPix ? "Link / 2ª via" : "Boleto / 2ª via"}:\n${link}\n` +
    linhaDigitavel +
    `\nEsse aviso foi enviado automaticamente porque o ${cobrancaLabel} ainda não consta como pago.`
  );
}

async function sendFinanceOverdueNotice(params: {
  stage: number;
  today: Date;
  installmentId: string;
  clientName: string;
  orderNumber: number;
  remainingCents: number;
  dueDate: Date;
  isPix: boolean;
  clientPhone?: string | null;
  boletoLink?: string | null;
  barcode?: string | null;
  pixCopyPaste?: string | null;
}) {
  const financeRecipient = await findFinanceRecipient();
  if (!financeRecipient?.phone) {
    return { sent: false, skipped: "financeiro_sem_whatsapp" };
  }

  const message = buildFinanceMessage(params.stage, {
    clientName: params.clientName,
    orderNumber: params.orderNumber,
    remainingCents: params.remainingCents,
    dueDate: params.dueDate,
    isPix: params.isPix,
    clientPhone: params.clientPhone,
    boletoLink: params.boletoLink,
    barcode: params.barcode,
    pixCopyPaste: params.pixCopyPaste,
  });

  await sendText({ phone: financeRecipient.phone, message });
  await appendInstallmentMarker(
    params.installmentId,
    financeOverdueMarker(params.today)
  );

  return { sent: true };
}

async function markInstallmentOverdue(params: {
  installmentId: string;
  accountsReceivableId: string;
  orderId: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.accountsReceivableInstallment.update({
      where: { id: params.installmentId },
      data: { status: ReceivableStatus.OVERDUE },
    });

    await tx.accountsReceivable.update({
      where: { id: params.accountsReceivableId },
      data: { status: ReceivableStatus.OVERDUE },
    });

    await tx.order.update({
      where: { id: params.orderId },
      data: { paymentStatus: PaymentStatus.OVERDUE },
    });
  });
}

type StageResult = {
  installmentId: string;
  clientName: string;
  orderNumber: number;
  phone: string | null;
  sent: boolean;
  financeSent?: boolean;
  financeSkipped?: string;
  financeError?: string;
  skipped?: string;
  error?: string;
};

async function processInitialOverdueFinanceAlerts(
  today: Date
): Promise<StageResult[]> {
  const installments = await prisma.accountsReceivableInstallment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lt: today },
      accountsReceivable: {
        paymentMethod: { in: ["BOLETO", "PIX"] },
      },
    },
    include: {
      accountsReceivable: {
        include: {
          client: {
            select: {
              name: true,
              whatsapp: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              number: true,
            },
          },
        },
      },
      externalPayments: {
        where: {
          provider: "EFI",
          type: { in: ["BOLETO", "BOLIX"] },
          status: { in: ["PENDING", "OVERDUE"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          boletoLink: true,
          barcode: true,
          pixCopyPaste: true,
        },
      },
    },
  });

  const results: StageResult[] = [];

  for (const inst of installments) {
    const ar = inst.accountsReceivable;
    const client = ar?.client;
    const order = ar?.order;
    const boleto = inst.externalPayments?.[0];
    const clientName = client?.name ?? "cliente";
    const orderNumber = order?.number ?? 0;
    const phone = client?.whatsapp || client?.phone || null;
    const remainingCents = (inst.amountCents ?? 0) - (inst.receivedCents ?? 0);
    const result: StageResult = {
      installmentId: inst.id,
      clientName,
      orderNumber,
      phone,
      sent: false,
    };

    if (remainingCents <= 0) {
      results.push({ ...result, skipped: "valor_zerado" });
      continue;
    }

    if (ar?.id && order?.id) {
      await markInstallmentOverdue({
        installmentId: inst.id,
        accountsReceivableId: ar.id,
        orderId: order.id,
      });
    }

    if (alreadyAnyFinanceNotified(inst.notes)) {
      results.push({
        ...result,
        financeSkipped: "financeiro_ja_notificado",
      });
      continue;
    }

    try {
      const financeResult = await sendFinanceOverdueNotice({
        stage: daysLate(today, inst.dueDate),
        today,
        installmentId: inst.id,
        clientName,
        orderNumber,
        remainingCents,
        dueDate: inst.dueDate,
        isPix: ar?.paymentMethod === "PIX",
        clientPhone: phone,
        boletoLink: boleto?.boletoLink ?? null,
        barcode: boleto?.barcode ?? null,
        pixCopyPaste: boleto?.pixCopyPaste ?? null,
      });

      results.push({
        ...result,
        financeSent: financeResult.sent,
        financeSkipped: financeResult.skipped,
      });
    } catch (err: any) {
      results.push({
        ...result,
        financeError:
          err instanceof ZApiRequestError
            ? `${err.message} (${err.status})`
            : err instanceof ZApiConfigError
            ? err.message
            : err?.message || "erro desconhecido",
      });
    }
  }

  return results;
}

async function processStage(stage: Stage, today: Date): Promise<StageResult[]> {
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - stage);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const installments = await prisma.accountsReceivableInstallment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { gte: start, lt: end },
      accountsReceivable: {
        paymentMethod: { in: ["BOLETO", "PIX"] },
      },
    },
    include: {
      accountsReceivable: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
              whatsapp: true,
              phone: true,
            },
          },
          order: {
            select: {
              id: true,
              number: true,
            },
          },
        },
      },
      externalPayments: {
        where: {
          provider: "EFI",
          type: { in: ["BOLETO", "BOLIX"] },
          status: { in: ["PENDING", "OVERDUE"] },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          boletoLink: true,
          barcode: true,
          pixCopyPaste: true,
        },
      },
    },
  });

  const results: StageResult[] = [];

  for (const inst of installments) {
    const ar = inst.accountsReceivable;
    const client = ar?.client;
    const order = ar?.order;
    const boleto = inst.externalPayments?.[0];
    const clientName = client?.name ?? "cliente";
    const orderNumber = order?.number ?? 0;
    const clientAlreadyNotified = alreadyNotified(inst.notes, stage);
    const financeAlreadyNotified =
      alreadyFinanceNotified(inst.notes, stage) ||
      alreadyAnyFinanceNotified(inst.notes);

    const remainingCents = (inst.amountCents ?? 0) - (inst.receivedCents ?? 0);
    if (remainingCents <= 0) {
      results.push({
        installmentId: inst.id,
        clientName,
        orderNumber,
        phone: null,
        sent: false,
        skipped: "valor_zerado",
      });
      continue;
    }

    const phone = client?.whatsapp || client?.phone || null;
    const result: StageResult = {
      installmentId: inst.id,
      clientName,
      orderNumber,
      phone,
      sent: false,
    };
    const overdueStage = stage === 0 ? null : stage;

    if (overdueStage && ar?.id && order?.id) {
      await markInstallmentOverdue({
        installmentId: inst.id,
        accountsReceivableId: ar.id,
        orderId: order.id,
      });

      if (financeAlreadyNotified) {
        result.financeSkipped = "financeiro_ja_notificado";
      } else {
        try {
          const financeResult = await sendFinanceOverdueNotice({
            stage: overdueStage,
            today,
            installmentId: inst.id,
            clientName,
            orderNumber,
            remainingCents,
            dueDate: inst.dueDate,
            isPix: ar?.paymentMethod === "PIX",
            clientPhone: phone,
            boletoLink: boleto?.boletoLink ?? null,
            barcode: boleto?.barcode ?? null,
            pixCopyPaste: boleto?.pixCopyPaste ?? null,
          });

          result.financeSent = financeResult.sent;
          result.financeSkipped = financeResult.skipped;
          await appendInstallmentMarker(inst.id, financeNotifMarker(stage, today));
        } catch (err: any) {
          result.financeError =
            err instanceof ZApiRequestError
              ? `${err.message} (${err.status})`
              : err instanceof ZApiConfigError
              ? err.message
              : err?.message || "erro desconhecido";
        }
      }
    }

    if (clientAlreadyNotified) {
      results.push({
        ...result,
        skipped: "ja_notificado",
      });
      continue;
    }

    if (!phone) {
      results.push({
        ...result,
        skipped: "sem_whatsapp",
      });
      continue;
    }

    const message = buildMessage(stage, {
      clientName,
      orderNumber,
      remainingCents,
      dueDate: inst.dueDate,
      isPix: ar?.paymentMethod === "PIX",
      boletoLink: boleto?.boletoLink ?? null,
      barcode: boleto?.barcode ?? null,
      pixCopyPaste: boleto?.pixCopyPaste ?? null,
    });

    try {
      await sendText({ phone, message });

      await appendInstallmentMarker(inst.id, notifMarker(stage, today));

      results.push({
        ...result,
        sent: true,
      });
    } catch (err: any) {
      const errMsg =
        err instanceof ZApiRequestError
          ? `${err.message} (${err.status})`
          : err instanceof ZApiConfigError
          ? err.message
          : err?.message || "erro desconhecido";

      results.push({
        ...result,
        sent: false,
        error: errMsg,
      });
    }
  }

  return results;
}

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const today = todayBrtMidnightUtc();
    const summary: Record<string, StageResult[]> = {};

    summary.financeiroAtraso = await processInitialOverdueFinanceAlerts(today);

    for (const stage of STAGES) {
      summary[`d${stage}`] = await processStage(stage, today);
    }

    const totals = Object.entries(summary).reduce(
      (acc, [key, list]) => {
        acc[key] = {
          total: list.length,
          enviados: list.filter((r) => r.sent).length,
          financeiroEnviados: list.filter((r) => r.financeSent).length,
          pulados: list.filter((r) => !!r.skipped).length,
          erros: list.filter((r) => !!r.error || !!r.financeError).length,
        };
        return acc;
      },
      {} as Record<
        string,
        {
          total: number;
          enviados: number;
          financeiroEnviados: number;
          pulados: number;
          erros: number;
        }
      >
    );

    return NextResponse.json({
      ok: true,
      data: ymd(today),
      totals,
      summary,
    });
  } catch (error: any) {
    console.error("GET /api/cron/cobranca-boletos error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro na cobrança automática." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
