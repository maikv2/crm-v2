import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        shares: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            ownerType: true,
            quotaNumber: true,
            investorId: true,
          },
          orderBy: {
            quotaNumber: "asc",
          },
        },
      },
    });

    const items = regions.map((region) => {
      const activeQuotaCount = region.shares.length;
      const companyQuotaCount = region.shares.filter(
        (share) => share.ownerType === "COMPANY"
      ).length;
      const investorQuotaCount = region.shares.filter(
        (share) => share.ownerType === "INVESTOR"
      ).length;

      const availableQuotaCount = Math.max(
        0,
        region.maxQuotaCount - activeQuotaCount
      );

      const occupationPercent =
        region.maxQuotaCount > 0
          ? Math.round((activeQuotaCount / region.maxQuotaCount) * 100)
          : 0;

      return {
        id: region.id,
        name: region.name,
        active: region.active,
        targetClients: region.targetClients,
        monthlySalesTargetCents: region.monthlySalesTargetCents,
        maxQuotaCount: region.maxQuotaCount,
        quotaValueCents: region.quotaValueCents,
        investmentTargetCents: region.investmentTargetCents,
        activeQuotaCount,
        companyQuotaCount,
        investorQuotaCount,
        availableQuotaCount,
        occupationPercent,
      };
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error("GET /api/regions error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar regiões." },
      { status: 500 }
    );
  }
}