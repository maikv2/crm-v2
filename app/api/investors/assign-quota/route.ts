import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const investors = await prisma.investor.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
      },
    });

    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        maxQuotaCount: true,
        quotaValueCents: true,
        targetClients: true,
      },
    });

    const activeShares = await prisma.share.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        regionId: true,
        investorId: true,
        quotaNumber: true,
        amountCents: true,
        investedAt: true,
      },
      orderBy: [
        { regionId: "asc" },
        { quotaNumber: "asc" },
      ],
    });

    return NextResponse.json({
      investors,
      regions,
      activeShares,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao carregar dados." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const investorId = String(body.investorId || "").trim();
    const regionId = String(body.regionId || "").trim();
    const quotaCount = Math.max(0, Number(body.quotaCount || 0));
    const amountCentsFromBody = Math.max(0, Number(body.amountCents || 0));
    const investedAt = body.investedAt ? new Date(body.investedAt) : new Date();

    if (!investorId) {
      return NextResponse.json(
        { error: "Investidor é obrigatório." },
        { status: 400 }
      );
    }

    if (!regionId) {
      return NextResponse.json(
        { error: "Região é obrigatória." },
        { status: 400 }
      );
    }

    if (!quotaCount || quotaCount <= 0) {
      return NextResponse.json(
        { error: "Informe uma quantidade de cotas válida." },
        { status: 400 }
      );
    }

    const [investor, region, existingActiveShares] = await Promise.all([
      prisma.investor.findUnique({
        where: { id: investorId },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.region.findUnique({
        where: { id: regionId },
        select: {
          id: true,
          name: true,
          maxQuotaCount: true,
          quotaValueCents: true,
        },
      }),
      prisma.share.findMany({
        where: {
          regionId,
          isActive: true,
        },
        select: {
          quotaNumber: true,
        },
        orderBy: {
          quotaNumber: "asc",
        },
      }),
    ]);

    if (!investor) {
      return NextResponse.json(
        { error: "Investidor não encontrado." },
        { status: 404 }
      );
    }

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada." },
        { status: 404 }
      );
    }

    const availableCount = region.maxQuotaCount - existingActiveShares.length;

    if (availableCount <= 0) {
      return NextResponse.json(
        { error: "Essa região não possui mais cotas disponíveis." },
        { status: 400 }
      );
    }

    if (quotaCount > availableCount) {
      return NextResponse.json(
        {
          error: `Só existem ${availableCount} cota(s) disponível(is) nesta região.`,
        },
        { status: 400 }
      );
    }

    const amountCents =
      amountCentsFromBody > 0 ? amountCentsFromBody : region.quotaValueCents;

    const usedNumbers = new Set(existingActiveShares.map((share) => share.quotaNumber));
    const nextQuotaNumbers: number[] = [];

    for (let number = 1; number <= region.maxQuotaCount; number++) {
      if (!usedNumbers.has(number)) {
        nextQuotaNumbers.push(number);
      }

      if (nextQuotaNumbers.length === quotaCount) {
        break;
      }
    }

    if (nextQuotaNumbers.length !== quotaCount) {
      return NextResponse.json(
        { error: "Não foi possível localizar cotas livres suficientes." },
        { status: 400 }
      );
    }

    const createdShares = await prisma.$transaction(
      nextQuotaNumbers.map((quotaNumber) =>
        prisma.share.create({
          data: {
            investorId,
            regionId,
            quotaNumber,
            ownerType: "INVESTOR",
            amountCents,
            isActive: true,
            investedAt,
            activatedAt: investedAt,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      investor: {
        id: investor.id,
        name: investor.name,
      },
      region: {
        id: region.id,
        name: region.name,
      },
      quotaCount: createdShares.length,
      quotaNumbers: createdShares.map((item) => item.quotaNumber),
      amountCents,
      totalAmountCents: createdShares.length * amountCents,
      shares: createdShares,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao vincular cotas." },
      { status: 500 }
    );
  }
}