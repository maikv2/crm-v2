import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        active: true,
        targetClients: true,
        monthlySalesTargetCents: true,
        maxQuotaCount: true,
        quotaValueCents: true,
        investmentTargetCents: true,
      },
    });

    const shares = await prisma.share.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        regionId: true,
        ownerType: true,
        quotaNumber: true,
        investorId: true,
      },
      orderBy: {
        quotaNumber: "asc",
      },
    });

    const sharesByRegion = new Map<string, typeof shares>();

    for (const share of shares) {
      const current = sharesByRegion.get(share.regionId) ?? [];
      current.push(share);
      sharesByRegion.set(share.regionId, current);
    }

    const items = regions.map((region) => {
      const regionShares = sharesByRegion.get(region.id) ?? [];

      const activeQuotaCount = regionShares.length;
      const companyQuotaCount = regionShares.filter(
        (share) => share.ownerType === "COMPANY"
      ).length;
      const investorQuotaCount = regionShares.filter(
        (share) => share.ownerType === "INVESTOR"
      ).length;

      const maxQuotaCount = region.maxQuotaCount ?? 0;
      const targetClients = region.targetClients ?? 0;
      const monthlySalesTargetCents = region.monthlySalesTargetCents ?? 0;
      const quotaValueCents = region.quotaValueCents ?? 0;
      const investmentTargetCents = region.investmentTargetCents ?? 0;

      const availableQuotaCount = Math.max(
        0,
        maxQuotaCount - activeQuotaCount
      );

      const occupationPercent =
        maxQuotaCount > 0
          ? Math.round((activeQuotaCount / maxQuotaCount) * 100)
          : 0;

      return {
        id: region.id,
        name: region.name,
        active: region.active,
        targetClients,
        monthlySalesTargetCents,
        maxQuotaCount,
        quotaValueCents,
        investmentTargetCents,
        activeQuotaCount,
        companyQuotaCount,
        investorQuotaCount,
        availableQuotaCount,
        occupationPercent,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET /api/regions error:", error);

    return NextResponse.json(
      {
        error: "Erro ao carregar regiões.",
        details: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    );
  }
}