import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID da região não informado." },
        { status: 400 }
      );
    }

    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        shares: {
          where: { isActive: true },
          include: {
            investor: true,
          },
          orderBy: {
            quotaNumber: "asc",
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada." },
        { status: 404 }
      );
    }

    const quotas = [];

    for (let i = 1; i <= region.maxQuotaCount; i++) {
      const share = region.shares.find((s) => s.quotaNumber === i);

      if (!share) {
        quotas.push({
          number: i,
          type: "AVAILABLE",
          owner: null,
          shareId: null,
          investorId: null,
          ownerType: null,
          isActive: false,
        });
      } else if (share.ownerType === "COMPANY") {
        quotas.push({
          number: i,
          type: "COMPANY",
          owner: "V2 Distribuidora",
          shareId: share.id,
          investorId: null,
          ownerType: share.ownerType,
          isActive: share.isActive,
        });
      } else {
        quotas.push({
          number: i,
          type: "INVESTOR",
          owner: share.investor?.name || "Investidor",
          shareId: share.id,
          investorId: share.investorId ?? null,
          ownerType: share.ownerType,
          isActive: share.isActive,
        });
      }
    }

    const totalQuotaCount = region.maxQuotaCount;
    const activeQuotaCount = region.shares.length;
    const companyQuotaCount = region.shares.filter(
      (share) => share.ownerType === "COMPANY"
    ).length;
    const investorQuotaCount = region.shares.filter(
      (share) => share.ownerType === "INVESTOR"
    ).length;
    const availableQuotaCount = totalQuotaCount - activeQuotaCount;

    return NextResponse.json({
      region: region.name,
      regionId: region.id,
      totalQuotaCount,
      activeQuotaCount,
      companyQuotaCount,
      investorQuotaCount,
      availableQuotaCount,
      quotas,
    });
  } catch (error) {
    console.error("GET /api/regions/[id]/quota-map error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar mapa de cotas." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regionId } = await context.params;

    if (!regionId) {
      return NextResponse.json(
        { error: "ID da região não informado." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const shareId = String(body?.shareId || "").trim();

    if (!shareId) {
      return NextResponse.json(
        { error: "shareId é obrigatório." },
        { status: 400 }
      );
    }

    const share = await prisma.share.findUnique({
      where: { id: shareId },
      select: {
        id: true,
        regionId: true,
        isActive: true,
        quotaNumber: true,
        investorId: true,
        ownerType: true,
      },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Cota não encontrada." },
        { status: 404 }
      );
    }

    if (share.regionId !== regionId) {
      return NextResponse.json(
        { error: "A cota informada não pertence a esta região." },
        { status: 400 }
      );
    }

    if (!share.isActive) {
      return NextResponse.json(
        { error: "Essa cota já está desativada." },
        { status: 400 }
      );
    }

    const updatedShare = await prisma.share.update({
      where: { id: shareId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cota #${share.quotaNumber} desvinculada com sucesso.`,
      share: updatedShare,
    });
  } catch (error) {
    console.error("DELETE /api/regions/[id]/quota-map error:", error);

    return NextResponse.json(
      { error: "Erro ao desvincular cota." },
      { status: 500 }
    );
  }
}
