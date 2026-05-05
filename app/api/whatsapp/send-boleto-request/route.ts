import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderAccess, OrderAccessError } from "@/lib/order-auth";
import {
  sendText,
  normalizeBrazilPhone,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function centsToBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
}

function dateToBR(date: Date | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCnpj(cnpj?: string | null) {
  if (!cnpj) return "—";
  const d = String(cnpj).replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get("id");

    const body = await request
      .json()
      .catch(() => ({} as Record<string, unknown>));

    const orderId =
      (typeof body.orderId === "string" && body.orderId) ||
      idFromQuery ||
      "";

    if (!orderId) {
      return NextResponse.json(
        { error: "ID do pedido é obrigatório." },
        { status: 400 }
      );
    }

    await requireOrderAccess(orderId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        nfeNumber: true,
        totalCents: true,
        paymentMethod: true,
        client: {
          select: {
            cnpj: true,
            name: true,
            legalName: true,
            tradeName: true,
          },
        },
        accountsReceivables: {
          select: {
            dueDate: true,
            amountCents: true,
            installments: {
              orderBy: { installmentNumber: "asc" },
              select: {
                installmentNumber: true,
                amountCents: true,
                dueDate: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (order.paymentMethod !== "BOLETO") {
      return NextResponse.json({
        ok: true,
        skipped: true,
        message:
          "Pedido não é boleto. Mensagem ao financeiro não enviada.",
      });
    }

    const financeUser = await prisma.user.findFirst({
      where: {
        role: "ADMINISTRATIVE",
        active: true,
        name: { contains: "Patricia", mode: "insensitive" },
      },
      select: { id: true, name: true, phone: true },
    });

    if (!financeUser) {
      return NextResponse.json(
        { error: "Usuário financeiro (Patricia) não encontrado." },
        { status: 404 }
      );
    }

    const phone = normalizeBrazilPhone(financeUser.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Usuário financeiro sem WhatsApp válido cadastrado." },
        { status: 400 }
      );
    }

    const num = String(order.number ?? "").padStart(6, "0");
    const fantasia =
      order.client?.tradeName || order.client?.name || "—";
    const razao =
      order.client?.legalName || order.client?.name || "—";
    const cnpjFmt = formatCnpj(order.client?.cnpj);

    type ParcelaItem = {
      number: number;
      amountCents: number;
      dueDate: Date | null;
    };

    const parcelas: ParcelaItem[] = order.accountsReceivables.flatMap(
      (ar) =>
        ar.installments.length
          ? ar.installments.map((i) => ({
              number: i.installmentNumber,
              amountCents: i.amountCents,
              dueDate: i.dueDate as Date | null,
            }))
          : [
              {
                number: 1,
                amountCents: ar.amountCents,
                dueDate: ar.dueDate as Date | null,
              },
            ]
    );

    const parcelasLinhas = parcelas.length
      ? parcelas
          .map(
            (p) =>
              `• Parcela ${p.number}: vence em ${dateToBR(p.dueDate)} - ${centsToBRL(p.amountCents)}`
          )
          .join("\n")
      : "• Sem parcelas cadastradas para este pedido.";

    const message = [
      "*Pedido de emissão de boleto*",
      "",
      `Pedido: PED-${num}`,
      `NF-e: nº ${order.nfeNumber || "—"}`,
      `Cliente (Nome Fantasia): ${fantasia}`,
      `Razão social: ${razao}`,
      `CNPJ: ${cnpjFmt}`,
      `Valor: ${centsToBRL(order.totalCents)}`,
      "",
      "*Vencimento(s):*",
      parcelasLinhas,
    ].join("\n");

    const zapi = await sendText({ phone, message });

    return NextResponse.json({
      ok: true,
      message: "Solicitação de boleto enviada ao financeiro.",
      to: { name: financeUser.name, phone },
      zapi,
    });
  } catch (error: any) {
    if (error instanceof OrderAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ZApiConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }
    console.error(
      "POST /api/whatsapp/send-boleto-request error:",
      error
    );
    return NextResponse.json(
      {
        error:
          error?.message || "Erro ao enviar solicitação de boleto.",
      },
      { status: 500 }
    );
  }
}