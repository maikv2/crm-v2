import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const investors = await prisma.investor.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        shares: {
          where: {
            OR: [
              { isActive: true },
              { investorId: { not: null } },
            ],
          },
          include: {
            region: {
              select: {
                id: true,
                name: true,
                quotaValueCents: true,
              },
            },
          },
          orderBy: [{ regionId: "asc" }, { quotaNumber: "asc" }],
        },
      },
    });

    const items = investors.map((investor) => {
      const investorShares = (investor.shares ?? []).filter(
        (share) => share.investorId === investor.id
      );

      const activeQuotaCount = investorShares.length;

      const estimatedInvestedCents = investorShares.reduce((sum, share) => {
        return sum + (share.amountCents || share.region?.quotaValueCents || 0);
      }, 0);

      const averageQuotaValueCents =
        activeQuotaCount > 0
          ? Math.round(estimatedInvestedCents / activeQuotaCount)
          : 0;

      const lastInvestmentAt =
        investorShares.length > 0
          ? investorShares
              .map((share) => new Date(share.investedAt).getTime())
              .sort((a, b) => b - a)[0]
          : null;

      const regionMap = new Map<
        string,
        {
          regionId: string;
          regionName: string;
          quotaCount: number;
          quotaNumbers: number[];
          estimatedInvestedCents: number;
        }
      >();

      for (const share of investorShares) {
        if (!share.region) continue;

        const shareAmount =
          share.amountCents || share.region?.quotaValueCents || 0;

        const existing = regionMap.get(share.region.id);

        if (!existing) {
          regionMap.set(share.region.id, {
            regionId: share.region.id,
            regionName: share.region.name,
            quotaCount: 1,
            quotaNumbers: [share.quotaNumber],
            estimatedInvestedCents: shareAmount,
          });
          continue;
        }

        existing.quotaCount += 1;
        existing.quotaNumbers.push(share.quotaNumber);
        existing.estimatedInvestedCents += shareAmount;
      }

      const regions = Array.from(regionMap.values())
        .map((region) => ({
          ...region,
          quotaNumbers: [...region.quotaNumbers].sort((a, b) => a - b),
        }))
        .sort((a, b) => a.regionName.localeCompare(b.regionName, "pt-BR"));

      return {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        phone: investor.phone,
        document: investor.document,
        notes: investor.notes,
        activeQuotaCount,
        estimatedInvestedCents,
        averageQuotaValueCents,
        regionCount: regions.length,
        lastInvestmentAt: lastInvestmentAt
          ? new Date(lastInvestmentAt).toISOString()
          : null,
        regions,
      };
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error("GET /api/investors error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar investidores." },
      { status: 500 }
    );
  }
}