import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = normalizeText(body.name);
    const targetClients = Number(body.targetClients ?? 0);
    const maxQuotaCount = Number(body.maxQuotaCount ?? 0);
    const quotaValueCents = Number(body.quotaValueCents ?? 0);
    const monthlySalesTargetCents = Number(body.monthlySalesTargetCents ?? 0);

    const notes = normalizeText(body.notes);
    const quotaDistribution = normalizeText(body.quotaDistribution);

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

    const existingRegion = await prisma.region.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingRegion) {
      return NextResponse.json(
        { error: "Já existe uma região com esse nome." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let stockLocation = await tx.stockLocation.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          name: true,
          active: true,
        },
      });

      if (!stockLocation) {
        stockLocation = await tx.stockLocation.create({
          data: {
            name,
            active: true,
          },
          select: {
            id: true,
            name: true,
            active: true,
          },
        });
      } else if (!stockLocation.active) {
        stockLocation = await tx.stockLocation.update({
          where: { id: stockLocation.id },
          data: { active: true },
          select: {
            id: true,
            name: true,
            active: true,
          },
        });
      }

      const region = await tx.region.create({
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
          stockLocationId: stockLocation.id,
        },
        select: {
          id: true,
          name: true,
          active: true,
          targetClients: true,
          maxQuotaCount: true,
          quotaValueCents: true,
          monthlySalesTargetCents: true,
          investmentTargetCents: true,
          notes: true,
          quotaDistribution: true,
          stockLocationId: true,
          stockLocation: {
            select: {
              id: true,
              name: true,
              active: true,
            },
          },
        },
      });

      return region;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/regions/create error:", error);

    return NextResponse.json(
      {
        error: "Erro ao criar região.",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}