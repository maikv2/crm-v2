import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const targetClients = Number(body.targetClients ?? 0);
    const maxQuotaCount = Number(body.maxQuotaCount ?? 0);
    const quotaValueCents = Number(body.quotaValueCents ?? 0);
    const monthlySalesTargetCents = Number(body.monthlySalesTargetCents ?? 0);

    const notes = body.notes ?? null;
    const quotaDistribution = body.quotaDistribution ?? null;

    if (!name) {
      return NextResponse.json(
        { error: "Nome da região é obrigatório." },
        { status: 400 }
      );
    }

    if (maxQuotaCount <= 0) {
      return NextResponse.json(
        { error: "Número de cotas deve ser maior que zero." },
        { status: 400 }
      );
    }

    if (quotaValueCents <= 0) {
      return NextResponse.json(
        { error: "Valor da cota deve ser maior que zero." },
        { status: 400 }
      );
    }

    const region = await prisma.region.create({
      data: {
        name,
        targetClients,
        maxQuotaCount,
        quotaValueCents,
        monthlySalesTargetCents,
        investmentTargetCents: maxQuotaCount * quotaValueCents,
        notes,
        quotaDistribution,
        active: true,
      },
    });

    return NextResponse.json(region);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao criar região." },
      { status: 500 }
    );
  }
}