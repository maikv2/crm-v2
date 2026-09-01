import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { calculateQuarterlyFundPreview } from "@/lib/investor-distribution";
import { prisma } from "@/lib/prisma";
import {
  normalizeBrazilPhone,
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DistributionSource = {
  id: string;
  regionId: string;
  region: { name: string } | null;
  month?: number;
  quarter?: number;
  year: number;
  totalDistributionCents: number;
  status: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function fifthBusinessDay(year: number, month: number) {
  let count = 0;
  const date = new Date(year, month - 1, 1);

  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
      if (count === 5) return new Date(date);
    }
    date.setDate(date.getDate() + 1);
  }

  return new Date(year, month - 1, 7);
}

function monthlyAvailableAt(month: number, year: number) {
  const payoutMonth = month === 12 ? 1 : month + 1;
  const payoutYear = month === 12 ? year + 1 : year;
  return fifthBusinessDay(payoutYear, payoutMonth);
}

function quarterlyAvailableAt(quarter: number, year: number) {
  const quarterEndMonth = quarter * 3;
  const payoutMonth = quarterEndMonth === 12 ? 1 : quarterEndMonth + 1;
  const payoutYear = quarterEndMonth === 12 ? year + 1 : year;
  return fifthBusinessDay(payoutYear, payoutMonth);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

async function getInvestorFromSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("investor_session")?.value?.trim();

  if (!userId || !isUuid(userId)) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      investorProfile: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

async function getFinanceContact() {
  const financeUser =
    (await prisma.user.findFirst({
      where: {
        role: "ADMINISTRATIVE",
        active: true,
        name: { contains: "Patricia", mode: "insensitive" },
      },
      select: { id: true, name: true, phone: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "ADMINISTRATIVE", active: true, phone: { not: null } },
      select: { id: true, name: true, phone: true },
    }));

  const phone =
    normalizeBrazilPhone(financeUser?.phone) ||
    normalizeBrazilPhone(process.env.FINANCEIRO_WHATSAPP);

  if (!phone) return null;

  return {
    name: financeUser?.name || "Financeiro",
    phone,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getInvestorFromSession();
    if (!user || user.role !== "INVESTOR" || !user.investorProfile) {
      return NextResponse.json({ error: "Sessao do investidor invalida." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      id?: string;
    };
    const type = body.type === "quarterly" ? "quarterly" : body.type === "monthly" ? "monthly" : null;
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!type || !isUuid(id)) {
      return NextResponse.json({ error: "Solicitacao invalida." }, { status: 400 });
    }

    const investor = user.investorProfile;

    const rawItem =
      type === "monthly"
        ? await prisma.investorDistribution.findFirst({
            where: { id, investorId: investor.id },
            include: { region: true },
          })
        : await prisma.quarterlyFundDistribution.findFirst({
            where: { id, investorId: investor.id },
            include: { region: true },
          });

    if (!rawItem) {
      return NextResponse.json({ error: "Distribuicao nao encontrada." }, { status: 404 });
    }

    const source = rawItem as DistributionSource;
    let correctedQuarterlyAmountCents = source.totalDistributionCents;

    if (type === "quarterly" && source.quarter) {
      const preview = await calculateQuarterlyFundPreview(
        source.regionId,
        source.quarter,
        source.year
      ).catch(() => null);
      const previewInvestor = preview?.investors.find(
        (item) => item.investorId === investor.id
      );

      if (preview && previewInvestor) {
        correctedQuarterlyAmountCents = previewInvestor.totalDistributionCents;

        if (
          source.status !== "PAID" &&
          source.totalDistributionCents !== correctedQuarterlyAmountCents
        ) {
          await prisma.quarterlyFundDistribution.update({
            where: { id: source.id },
            data: {
              totalDistributionCents: correctedQuarterlyAmountCents,
              valuePerQuotaCents: Math.floor(
                correctedQuarterlyAmountCents / Math.max(1, previewInvestor.quotaCount)
              ),
              quarterlyFundTotalCents: preview.quarterlyFundTotalCents,
              payoutPhase: previewInvestor.payoutPhase,
            },
          });
        }
      }
    }

    const item =
      type === "monthly"
        ? {
            id: source.id,
            regionId: source.regionId,
            region: source.region,
            month: source.month,
            year: source.year,
            totalDistributionCents: source.totalDistributionCents,
            status: source.status,
            periodLabel: `${String(source.month).padStart(2, "0")}/${source.year}`,
          }
        : {
            id: source.id,
            regionId: source.regionId,
            region: source.region,
            month: null,
            year: source.year,
            quarter: source.quarter,
            totalDistributionCents: correctedQuarterlyAmountCents,
            status: source.status,
            periodLabel: `${source.quarter}o trimestre/${source.year}`,
          };

    if (item.status === "PAID") {
      return NextResponse.json({ error: "Este pagamento ja foi pago." }, { status: 400 });
    }

    const availableAt =
      type === "monthly"
        ? monthlyAvailableAt(item.month!, item.year)
        : quarterlyAvailableAt(item.quarter!, item.year);
    const now = new Date();

    if (now < availableAt) {
      return NextResponse.json(
        {
          error: `Este pagamento fica disponivel para solicitacao em ${formatDate(availableAt)}.`,
          availableAt,
        },
        { status: 400 }
      );
    }

    const marker = `investor_payment_request:${type}:${item.id}`;
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        investorId: investor.id,
        category: "INVESTOR_DISTRIBUTION",
        notes: marker,
      },
      select: { id: true, createdAt: true, status: true },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyRequested: true,
        message: "Pagamento ja solicitado.",
        paymentRequest: existing,
      });
    }

    const financeContact = await getFinanceContact();
    if (!financeContact) {
      return NextResponse.json(
        { error: "Financeiro sem WhatsApp valido cadastrado." },
        { status: 400 }
      );
    }

    const period = item.periodLabel;
    const paymentName = type === "monthly" ? "EBITDA mensal" : "Fundo trimestral";
    const description = `Solicitacao de pagamento - ${paymentName} - ${investor.name} - ${period}`;

    const transaction = await prisma.financeTransaction.create({
      data: {
        scope: "REGION",
        type: "EXPENSE",
        status: "PENDING",
        category: "INVESTOR_DISTRIBUTION",
        description,
        amountCents: item.totalDistributionCents,
        regionId: item.regionId,
        investorId: investor.id,
        dueDate: now,
        competenceMonth: type === "monthly" ? item.month! : undefined,
        competenceYear: item.year,
        isSystemGenerated: true,
        notes: marker,
      },
      select: { id: true, createdAt: true, status: true },
    });

    const message = [
      "*Solicitacao de pagamento de investidor*",
      "",
      `Investidor: ${investor.name}`,
      investor.email ? `E-mail: ${investor.email}` : null,
      investor.phone ? `Telefone: ${investor.phone}` : null,
      `Tipo: ${paymentName}`,
      `Referencia: ${period}`,
      `Regiao: ${item.region?.name || "-"}`,
      `Valor: ${money(item.totalDistributionCents)}`,
      "",
      `Lancamento financeiro: ${transaction.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    const zapi = await sendText({ phone: financeContact.phone, message });

    return NextResponse.json({
      ok: true,
      message: "Solicitacao enviada ao financeiro.",
      paymentRequest: transaction,
      to: financeContact,
      zapi,
    });
  } catch (error) {
    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("POST /api/investor-auth/payment-request error:", error);
    return NextResponse.json(
      { error: "Erro ao solicitar pagamento." },
      { status: 500 }
    );
  }
}
