import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError, ZApiRequestError } from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
const STAGES = [0, 3, 5, 8] as const;
type Stage = (typeof STAGES)[number];

function todayBrtMidnightUtc(): Date {
  const now = Date.now();
  const brt = new Date(now + BRT_OFFSET_MS);
  const y = brt.getUTCFullYear();
  const m = brt.getUTCMonth();
  const d = brt.getUTCDate();
  return new Date(Date.UTC(y, m, d) - BRT_OFFSET_MS);
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
  const raw = process.env.FINANCEIRO_WHATSAPP || "(47) 99981-1392";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildSegundaViaUrl(orderNumber: number): string {
  const phone = patriciaPhoneDigits();
  const num = String(orderNumber).padStart(6, "0");
  const text = encodeURIComponent(
    `Olá Patrícia, preciso da 2ª via do boleto do pedido #${num}`
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
  }
): string {
  const { clientName, orderNumber, remainingCents, dueDate } = params;
  const num = `#${String(orderNumber).padStart(6, "0")}`;
  const valor = formatBRL(remainingCents);
  const data = formatDateBR(dueDate);
  const link = buildSegundaViaUrl(orderNumber);

  if (stage === 0) {
    return (
      `Olá, ${clientName}! 👋\n\n` +
      `Passando rapidinho pra te lembrar com carinho que hoje vence o seu boleto aqui na V2 Distribuidora:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: hoje (${data})\n\n` +
      `Muito obrigado pela parceria de sempre! 🙌\n` +
      `Qualquer dúvida, é só chamar.\n\n` +
      `Equipe V2 Distribuidora`
    );
  }

  if (stage === 3) {
    return (
      `Oi, ${clientName}, tudo bem?\n\n` +
      `Notamos por aqui que seu boleto venceu há 3 dias e ainda não consta como pago:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: ${data}\n\n` +
      `Será que você consegue dar uma olhadinha pra gente?\n\n` +
      `Se precisar da 2ª via do boleto, é só falar com a Patrícia do financeiro:\n` +
      `👉 ${link}\n\n` +
      `Obrigado!\n` +
      `Equipe V2 Distribuidora`
    );
  }

  if (stage === 5) {
    return (
      `Olá, ${clientName}.\n\n` +
      `Seu boleto está com 5 dias de atraso e ainda não identificamos o pagamento:\n\n` +
      `📄 Pedido: ${num}\n` +
      `💰 Valor: ${valor}\n` +
      `📅 Vencimento: ${data}\n\n` +
      `Pedimos a gentileza de regularizar o quanto antes para mantermos seu crédito ativo aqui na V2.\n\n` +
      `Solicitar 2ª via com a Patrícia (financeiro):\n` +
      `👉 ${link}\n\n` +
      `Equipe V2 Distribuidora`
    );
  }

  return (
    `Olá, ${clientName}.\n\n` +
    `Seu boleto já está com 8 dias de atraso:\n\n` +
    `📄 Pedido: ${num}\n` +
    `💰 Valor: ${valor}\n` +
    `📅 Vencimento: ${data}\n\n` +
    `Pedimos a regularização imediata para evitarmos a suspensão de novas compras e o encaminhamento para protesto.\n\n` +
    `Caso já tenha pago, por favor nos envie o comprovante.\n` +
    `Para 2ª via, fale direto com a Patrícia (financeiro):\n` +
    `👉 ${link}\n\n` +
    `Equipe V2 Distribuidora`
  );
}

function alreadyNotified(notes: string | null | undefined, stage: Stage): boolean {
  if (!notes) return false;
  return notes.includes(`[NOTIF_D${stage}_`);
}

function notifMarker(stage: Stage, today: Date): string {
  return `[NOTIF_D${stage}_${ymd(today)}]`;
}

type StageResult = {
  installmentId: string;
  clientName: string;
  orderNumber: number;
  phone: string | null;
  sent: boolean;
  skipped?: string;
  error?: string;
};

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
        paymentMethod: "BOLETO",
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
              number: true,
            },
          },
        },
      },
    },
  });

  const results: StageResult[] = [];

  for (const inst of installments) {
    const ar = inst.accountsReceivable;
    const client = ar?.client;
    const order = ar?.order;
    const clientName = client?.name ?? "cliente";
    const orderNumber = order?.number ?? 0;

    if (alreadyNotified(inst.notes, stage)) {
      results.push({
        installmentId: inst.id,
        clientName,
        orderNumber,
        phone: null,
        sent: false,
        skipped: "ja_notificado",
      });
      continue;
    }

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
    if (!phone) {
      results.push({
        installmentId: inst.id,
        clientName,
        orderNumber,
        phone: null,
        sent: false,
        skipped: "sem_whatsapp",
      });
      continue;
    }

    const message = buildMessage(stage, {
      clientName,
      orderNumber,
      remainingCents,
      dueDate: inst.dueDate,
    });

    try {
      await sendText({ phone, message });

      const marker = notifMarker(stage, today);
      const newNotes = inst.notes ? `${inst.notes}\n${marker}` : marker;
      await prisma.accountsReceivableInstallment.update({
        where: { id: inst.id },
        data: { notes: newNotes },
      });

      results.push({
        installmentId: inst.id,
        clientName,
        orderNumber,
        phone,
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
        installmentId: inst.id,
        clientName,
        orderNumber,
        phone,
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

    for (const stage of STAGES) {
      summary[`d${stage}`] = await processStage(stage, today);
    }

    const totals = Object.entries(summary).reduce(
      (acc, [key, list]) => {
        acc[key] = {
          total: list.length,
          enviados: list.filter((r) => r.sent).length,
          pulados: list.filter((r) => !!r.skipped).length,
          erros: list.filter((r) => !!r.error).length,
        };
        return acc;
      },
      {} as Record<string, { total: number; enviados: number; pulados: number; erros: number }>
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
