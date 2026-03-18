import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

export async function GET() {
  try {
    const now = new Date();

    const months: {
      start: Date;
      end: Date;
      label: string;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const base = new Date(now.getFullYear(), now.getMonth() - i, 1);

      months.push({
        start: new Date(base.getFullYear(), base.getMonth(), 1),
        end: new Date(base.getFullYear(), base.getMonth() + 1, 1),
        label: monthLabel(base),
      });
    }

    const [
      totalInvestors,
      totalRegions,
      activeShares,
      investorShares,
      companyShares,
      totalRegionQuotaCapacityAgg,
      totalDistributionAgg,
      pendingDistributionAgg,
      recentShares,
      regions,
      monthlyData,
    ] = await Promise.all([
      prisma.investor.count(),

      prisma.region.count({
        where: {
          active: true,
        },
      }),

      prisma.share.findMany({
        where: {
          isActive: true,
        },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
              quotaValueCents: true,
              maxQuotaCount: true,
            },
          },
        },
        orderBy: [
          { regionId: "asc" },
          { quotaNumber: "asc" },
        ],
      }),

      prisma.share.findMany({
        where: {
          isActive: true,
          ownerType: "INVESTOR",
        },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
              quotaValueCents: true,
            },
          },
        },
      }),

      prisma.share.findMany({
        where: {
          isActive: true,
          ownerType: "COMPANY",
        },
      }),

      prisma.region.aggregate({
        _sum: {
          maxQuotaCount: true,
        },
      }),

      prisma.investorDistribution.aggregate({
        _sum: {
          totalDistributionCents: true,
        },
        where: {
          status: "PAID",
        },
      }),

      prisma.investorDistribution.aggregate({
        _sum: {
          totalDistributionCents: true,
        },
        where: {
          status: "PENDING",
        },
      }),

      prisma.share.findMany({
        take: 12,
        where: {
          isActive: true,
          ownerType: "INVESTOR",
        },
        orderBy: {
          investedAt: "desc",
        },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.region.findMany({
        where: {
          active: true,
        },
        select: {
          id: true,
          name: true,
          maxQuotaCount: true,
          quotaValueCents: true,
          shares: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              ownerType: true,
              amountCents: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      }),

      Promise.all(
        months.map(async (m) => {
          const shares = await prisma.share.findMany({
            where: {
              ownerType: "INVESTOR",
              investedAt: {
                gte: m.start,
                lt: m.end,
              },
            },
            select: {
              amountCents: true,
            },
          });

          const quotaCount = shares.length;
          const investedCents = shares.reduce((sum, share) => {
            return sum + (share.amountCents ?? 0);
          }, 0);

          return {
            month: m.label,
            quotaCount,
            investedCents,
          };
        })
      ),
    ]);

    const totalQuotaCapacity = totalRegionQuotaCapacityAgg._sum.maxQuotaCount ?? 0;
    const totalActiveQuotaCount = activeShares.length;
    const investorQuotaCount = investorShares.length;
    const companyQuotaCount = companyShares.length;
    const availableQuotaCount = Math.max(0, totalQuotaCapacity - totalActiveQuotaCount);

    const totalInvestedCents = investorShares.reduce((sum, share) => {
      return sum + (share.amountCents || share.region?.quotaValueCents || 0);
    }, 0);

    const averageQuotaValueCents =
      investorQuotaCount > 0
        ? Math.round(totalInvestedCents / investorQuotaCount)
        : 0;

    const totalDistributedCents =
      totalDistributionAgg._sum.totalDistributionCents ?? 0;

    const pendingDistributionCents =
      pendingDistributionAgg._sum.totalDistributionCents ?? 0;

    const recentInvestments = recentShares.map((share) => ({
      id: share.id,
      investedAt: share.investedAt,
      quotaNumber: share.quotaNumber,
      amountCents: share.amountCents ?? 0,
      investorName: share.investor?.name ?? "Investidor",
      regionName: share.region?.name ?? "Região",
    }));

    const regionsSummary = regions.map((region) => {
      const activeQuotaCount = region.shares.length;
      const investorOwnedCount = region.shares.filter(
        (share) => share.ownerType === "INVESTOR"
      ).length;
      const companyOwnedCount = region.shares.filter(
        (share) => share.ownerType === "COMPANY"
      ).length;
      const availableCount = Math.max(0, region.maxQuotaCount - activeQuotaCount);

      const investedCents = region.shares
        .filter((share) => share.ownerType === "INVESTOR")
        .reduce((sum, share) => sum + (share.amountCents ?? region.quotaValueCents), 0);

      return {
        regionId: region.id,
        regionName: region.name,
        maxQuotaCount: region.maxQuotaCount,
        quotaValueCents: region.quotaValueCents,
        activeQuotaCount,
        investorOwnedCount,
        companyOwnedCount,
        availableCount,
        investedCents,
      };
    });

    return NextResponse.json({
      summary: {
        totalInvestors,
        totalRegions,
        totalQuotaCapacity,
        totalActiveQuotaCount,
        investorQuotaCount,
        companyQuotaCount,
        availableQuotaCount,
        totalInvestedCents,
        averageQuotaValueCents,
        totalDistributedCents,
        pendingDistributionCents,
      },

      monthly: monthlyData,

      recentInvestments,

      regionsSummary,
    });
  } catch (error) {
    console.error("Erro dashboard investor:", error);

    return NextResponse.json(
      {
        error: "Erro ao carregar dashboard do investidor",
      },
      {
        status: 500,
      }
    );
  }
}
