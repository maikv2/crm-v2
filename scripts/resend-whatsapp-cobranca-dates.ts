import { prisma } from "@/lib/prisma";
import { sendText, ZApiConfigError, ZApiRequestError } from "@/lib/zapi";

const BRT_OFFSET_MS = -3 * 60 * 60 * 1000;
const STAGES = [0, 3, 5, 8] as const;
type Stage = (typeof STAGES)[number];

type Row = {
  targetDate: string;
  stage: Stage;
  installmentId: string;
  clientName: string;
  orderNumber: number;
  phone: string | null;
  remainingCents: number;
  dueDate: Date;
  notes: string | null;
};

function todayArgToBrtMidnightUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data invalida: ${value}. Use YYYY-MM-DD.`);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day) - BRT_OFFSET_MS);
}

function ymd(date: Date) {
  const local = new Date(date.getTime() + BRT_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function displayDate(date: Date) {
  const local = new Date(date.getTime() + BRT_OFFSET_MS);
  const day = String(local.getUTCDate()).padStart(2, "0");
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const year = local.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function patriciaPhoneDigits() {
  const raw = process.env.FINANCIAL_WHATSAPP || "(47) 99981-1392";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildSegundaViaUrl(orderNumber: number) {
  const phone = patriciaPhoneDigits();
  const num = String(orderNumber).padStart(6, "0");
  const text = encodeURIComponent(
    `Ola Patricia, preciso da 2a via do boleto do pedido #${num}`
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
) {
  const { clientName, orderNumber, remainingCents, dueDate } = params;
  const num = `#${String(orderNumber).padStart(6, "0")}`;
  const valor = money(remainingCents);
  const data = displayDate(dueDate);
  const link = buildSegundaViaUrl(orderNumber);

  if (stage === 0) {
    return [
      `Ola, ${clientName}!`,
      "",
      "Passando rapidinho pra te lembrar com carinho que hoje vence o seu boleto aqui na V2 Distribuidora:",
      "",
      `Pedido: ${num}`,
      `Valor: ${valor}`,
      `Vencimento: hoje (${data})`,
      "",
      "Muito obrigado pela parceria de sempre!",
      "Qualquer duvida, e so chamar.",
      "",
      "Equipe V2 Distribuidora",
    ].join("\n");
  }

  if (stage === 3) {
    return [
      `Ola, ${clientName}. Tudo bem?`,
      "",
      "Notamos por aqui que seu boleto venceu ha 3 dias e ainda nao consta como pago:",
      "",
      `Pedido: ${num}`,
      `Valor em aberto: ${valor}`,
      `Vencimento: ${data}`,
      "",
      `Se precisar da 2a via do boleto, e so falar com a Patricia do financeiro:`,
      link,
      "",
      "Se o pagamento ja foi feito, por favor desconsidere esta mensagem.",
      "",
      "Equipe V2 Distribuidora",
    ].join("\n");
  }

  if (stage === 5) {
    return [
      `Ola, ${clientName}.`,
      "",
      "Seu boleto esta com 5 dias de atraso e ainda nao identificamos o pagamento:",
      "",
      `Pedido: ${num}`,
      `Valor em aberto: ${valor}`,
      `Vencimento: ${data}`,
      "",
      "Para evitar bloqueios ou restricoes no fornecimento, pedimos que regularize assim que possivel.",
      `2a via com a Patricia: ${link}`,
      "",
      "Se ja pagou, envie o comprovante para conferirmos.",
      "",
      "Equipe V2 Distribuidora",
    ].join("\n");
  }

  return [
    `Ola, ${clientName}.`,
    "",
    "Seu boleto ja esta com 8 dias de atraso:",
    "",
    `Pedido: ${num}`,
    `Valor em aberto: ${valor}`,
    `Vencimento: ${data}`,
    "",
    "Precisamos da regularizacao para manter seu atendimento ativo.",
    `2a via com a Patricia: ${link}`,
    "",
    "Caso ja tenha pago, envie o comprovante por gentileza.",
    "",
    "Equipe V2 Distribuidora",
  ].join("\n");
}

async function collectRows(targetDate: string): Promise<Row[]> {
  const today = todayArgToBrtMidnightUtc(targetDate);
  const rows: Row[] = [];

  for (const stage of STAGES) {
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

    for (const inst of installments) {
      const remainingCents = (inst.amountCents ?? 0) - (inst.receivedCents ?? 0);
      rows.push({
        targetDate,
        stage,
        installmentId: inst.id,
        clientName: inst.accountsReceivable.client?.name ?? "cliente",
        orderNumber: inst.accountsReceivable.order?.number ?? 0,
        phone:
          inst.accountsReceivable.client?.whatsapp ||
          inst.accountsReceivable.client?.phone ||
          null,
        remainingCents,
        dueDate: inst.dueDate,
        notes: inst.notes,
      });
    }
  }

  return rows;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const dates = args.filter((arg) => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  if (!dates.length) {
    throw new Error(
      "Informe ao menos uma data. Ex: tsx scripts/resend-whatsapp-cobranca-dates.ts 2026-07-12 2026-07-13 2026-07-14"
    );
  }
  return { send, dates };
}

async function main() {
  const { send, dates } = parseArgs();
  const rowsByDate = await Promise.all(dates.map(collectRows));
  const rows = rowsByDate.flat();

  console.log(`Modo: ${send ? "ENVIO REAL" : "PRE-VISUALIZACAO"}`);
  console.log(`Datas: ${dates.join(", ")}`);
  console.log(`Total encontrado: ${rows.length}`);

  const sendable = rows.filter((row) => row.phone && row.remainingCents > 0);
  const skippedNoPhone = rows.filter((row) => !row.phone).length;
  const skippedZero = rows.filter((row) => row.remainingCents <= 0).length;

  console.log(`Enviaveis: ${sendable.length}`);
  console.log(`Sem WhatsApp/telefone: ${skippedNoPhone}`);
  console.log(`Valor zerado: ${skippedZero}`);

  for (const row of rows) {
    console.log(
      [
        row.targetDate,
        `D${row.stage}`,
        `pedido #${String(row.orderNumber).padStart(6, "0")}`,
        row.clientName,
        row.phone || "sem telefone",
        money(row.remainingCents),
      ].join(" | ")
    );
  }

  if (!send) return;

  let sent = 0;
  let failed = 0;
  for (const row of sendable) {
    const message = buildMessage(row.stage, {
      clientName: row.clientName,
      orderNumber: row.orderNumber,
      remainingCents: row.remainingCents,
      dueDate: row.dueDate,
    });

    try {
      await sendText({ phone: row.phone!, message });
      const marker = `[REENVIO_D${row.stage}_${row.targetDate.replace(/-/g, "")}_${ymd(new Date())}]`;
      await prisma.accountsReceivableInstallment.update({
        where: { id: row.installmentId },
        data: { notes: row.notes ? `${row.notes}\n${marker}` : marker },
      });
      sent += 1;
      console.log(`ENVIADO | ${row.targetDate} | D${row.stage} | ${row.clientName}`);
    } catch (error) {
      failed += 1;
      const message =
        error instanceof ZApiRequestError
          ? `${error.message} (${error.status})`
          : error instanceof ZApiConfigError
          ? error.message
          : error instanceof Error
          ? error.message
          : "erro desconhecido";
      console.log(`ERRO | ${row.targetDate} | D${row.stage} | ${row.clientName} | ${message}`);
    }
  }

  console.log(`Resumo final: enviados=${sent} erros=${failed}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
