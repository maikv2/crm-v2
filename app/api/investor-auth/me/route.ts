import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { calculateRegionFinancialSnapshot } from "@/lib/region-financial-engine";
import { calculateInvestorDistributionPreview } from "@/lib/investor-distribution";

export const dynamic = "force-dynamic";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function clearInvestorSession(response: NextResponse) {
  response.cookies.set("investor_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}

function startOfMonth(month: number, year: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function startOfNextMonth(month: number, year: number) {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("investor_session")?.value?.trim();

    if (!userId) {
      return clearInvestorSession(
        NextResponse.json(
          { error: "Sessão do investidor não encontrada." },
          { status: 401 }
        )
      );
    }

    if (!isUuid(userId)) {
      return clearInvestorSession(
        NextResponse.json(
          { error: "Sessão do investidor inválida." },
          { status: 401 }
        )
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        investorProfile: {
          include: {
            shares: {
              where: { isActive: true },
              include: { region: true },
              orderBy: [{ regionId: "asc" }, { quotaNumber: "asc" }],
            },
          },
        },
      },
    });

    if (!user || user.role !== "INVESTOR" || !user.investorProfile) {
      return clearInvestorSession(
        NextResponse.json(
          { error: "Investidor não encontrado." },
          { status: 401 }
        )
      );
    }

    const investor = user.investorProfile;
    const activeShares = investor.shares ?? [];

    const totalInvestedCents = activeShares.reduce((sum, share) => {
      return sum + (share.amountCents || share.region?.quotaValueCents || 0);
    }, 0);

    const regionsMap = new Map<
      string,
      {
        regionId: string;
        regionName: string;
        quotaCount: number;
        regionTotalQuotaCount: number;
        investedCents: number;
        quotaNumbers: number[];
      }
    >();

    for (const share of activeShares) {
      const regionId = share.regionId;
      const regionName = share.region?.name ?? "Região";
      const investedCents = share.amountCents || share.region?.quotaValueCents || 0;

      const existing = regionsMap.get(regionId);
      if (!existing) {
        regionsMap.set(regionId, {
          regionId,
          regionName,
          quotaCount: 1,
          regionTotalQuotaCount: share.region?.maxQuotaCount ?? 0,
          investedCents,
          quotaNumbers: [share.quotaNumber],
        });
      } else {
        existing.quotaCount += 1;
        existing.investedCents += investedCents;
        existing.quotaNumbers.push(share.quotaNumber);
      }
    }

    const regions = Array.from(regionsMap.values())
      .map((item) => ({
        ...item,
        quotaNumbers: [...item.quotaNumbers].sort((a, b) => a - b),
      }))
      .sort((a, b) => a.regionName.localeCompare(b.regionName, "pt-BR"));

    const regionIds = regions.map((r) => r.regionId);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const periodStart = startOfMonth(month, year);
    const periodEnd = startOfNextMonth(month, year);

    const [salesAgg, ...perRegion] = await Promise.all([
      regionIds.length
        ? prisma.order.aggregate({
            where: {
              regionId: { in: regionIds },
              type: "SALE",
              financialMovement: true,
              status: { not: "CANCELLED" },
              issuedAt: { gte: periodStart, lt: periodEnd },
            },
            _sum: { totalCents: true },
          })
        : Promise.resolve({ _sum: { totalCents: 0 } }),
      ...regionIds.map((regionId) =>
        Promise.all([
          calculateRegionFinancialSnapshot(regionId, month, year).catch(() => null),
          calculateInvestorDistributionPreview(regionId, month, year).catch(() => null),
        ])
      ),
    ]);

    let receivedCents = 0;
    let yourShareCents = 0;

    for (const pair of perRegion as Array<
      [Awaited<ReturnType<typeof calculateRegionFinancialSnapshot>> | null, Awaited<ReturnType<typeof calculateInvestorDistributionPreview>> | null]
    >) {
      const [snapshot, preview] = pair;
      if (snapshot) receivedCents += snapshot.grossRevenueCents;
      const mine = preview?.investors.find((item) => item.investorId === investor.id);
      if (mine) yourShareCents += mine.totalDistributionCents;
    }

    return NextResponse.json({
      investor: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        phone: investor.phone,
        document: investor.document,
        notes: investor.notes,
      },
      period: { month, year },
      totals: {
        salesCents: salesAgg._sum.totalCents ?? 0,
        receivedCents,
        yourShareCents,
      },
      quotas: {
        totalInvestedCents,
        totalQuotaCount: activeShares.length,
        regions,
      },
    });
  } catch (error) {
    console.error("INVESTOR ME ERROR:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados do investidor." },
      { status: 500 }
    );
  }
}
