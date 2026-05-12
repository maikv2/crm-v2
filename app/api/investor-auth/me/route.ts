import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  calculateQuarterlyFundPreview,
  getQuarterForMonth,
  calculateInvestorDistributionPreview,
} from "@/lib/investor-distribution";
import { calculateRegionFinancialSnapshot } from "@/lib/region-financial-engine";

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
            distributions: {
              orderBy: [{ year: "desc" }, { month: "desc" }],
              include: { region: true },
            },
            quarterlyFundDistributions: {
              orderBy: [{ year: "desc" }, { quarter: "desc" }],
              include: { region: true },
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
    const distributions = investor.distributions ?? [];
    const quarterlyFundDistributions = investor.quarterlyFundDistributions ?? [];

    const totalInvestedCents = activeShares.reduce((sum, share) => {
      return sum + (share.amountCents || share.region?.quotaValueCents || 0);
    }, 0);

    const totalDistributedCents =
      distributions
        .filter((d) => d.status === "PAID")
        .reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0) +
      quarterlyFundDistributions
        .filter((d) => d.status === "PAID")
        .reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0);

    const pendingDistributionCents =
      distributions
        .filter((d) => d.status === "PENDING")
        .reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0) +
      quarterlyFundDistributions
        .filter((d) => d.status === "PENDING")
        .reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentQuarter = getQuarterForMonth(currentMonth);
    const regionIds = [...new Set(activeShares.map((s) => s.regionId))];

    const [
      distributionPreviews,
      quarterlyPreviews,
      regionSnapshots,
      totalActivePdvs,
      totalRevenueSumResult,
    ] = await Promise.all([
      Promise.all(
        regionIds.map((rid) =>
          calculateInvestorDistributionPreview(rid, currentMonth, currentYear).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateQuarterlyFundPreview(rid, currentQuarter, currentYear).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateRegionFinancialSnapshot(rid, currentMonth, currentYear).catch(() => null)
        )
      ),
      prisma.exhibitor.count({ where: { status: "ACTIVE" } }),
      prisma.regionMonthlyResult.aggregate({
        where: { month: currentMonth, year: currentYear },
        _sum: { grossRevenueCents: true },
      }),
    ]);

    let liveEbitdaCents = 0;
    let liveQuarterlyFundCents = 0;

    for (let i = 0; i < regionIds.length; i++) {
      const dp = distributionPreviews[i];
      const qp = quarterlyPreviews[i];

      if (dp) {
        const entry = dp.investors.find((inv) => inv.investorId === investor.id);
        if (entry) liveEbitdaCents += entry.totalDistributionCents;
      }

      if (qp) {
        const entry = qp.investors.find((inv) => inv.investorId === investor.id);
        if (entry) liveQuarterlyFundCents += entry.totalDistributionCents;
      }
    }

    // Company-wide revenue goal: use saved monthly results, fall back to investor regions live snapshots
    const savedGrossRevenueCents = totalRevenueSumResult._sum.grossRevenueCents ?? 0;
    const liveRegionsRevenueCents = regionSnapshots
      .filter(Boolean)
      .reduce((s, snap) => s + snap!.grossRevenueCents, 0);
    const goalGrossRevenueCents = savedGrossRevenueCents || liveRegionsRevenueCents;

    const regionReport = regionIds.map((regionId, i) => {
      const snap = regionSnapshots[i];
      const share = activeShares.find((s) => s.regionId === regionId);
      const regionName = share?.region?.name ?? regionId;
      if (!snap) {
        return {
          regionId,
          regionName,
          month: currentMonth,
          year: currentYear,
          grossRevenueCents: 0,
          cmvCents: 0,
          logisticsCents: 0,
          commissionCents: 0,
          taxesCents: 0,
          administrativeCents: 0,
          operatingProfitCents: 0,
        };
      }
      return {
        regionId,
        regionName,
        month: currentMonth,
        year: currentYear,
        grossRevenueCents: snap.grossRevenueCents,
        cmvCents: snap.cmvCents,
        logisticsCents: snap.logisticsCents,
        commissionCents: snap.commissionCents,
        taxesCents: snap.taxesCents,
        administrativeCents: snap.administrativeCents,
        operatingProfitCents: snap.operatingProfitCents,
      };
    });

    return NextResponse.json({
      investor: {
        id: investor.id,
        name: investor.name,
        email: investor.email,
        phone: investor.phone,
        document: investor.document,
        notes: investor.notes,
      },
      summary: {
        activeQuotaCount: activeShares.length,
        totalRegions: new Set(activeShares.map((s) => s.regionId)).size,
        totalInvestedCents,
        totalDistributedCents,
        pendingDistributionCents,
      },
      liveEstimate: {
        ebitdaCents: liveEbitdaCents,
        quarterlyFundCents: liveQuarterlyFundCents,
        quarter: currentQuarter,
        year: currentYear,
      },
      goalProgress: {
        activePdvs: totalActivePdvs,
        grossRevenueCents: goalGrossRevenueCents,
      },
      regionReport,
      shares: activeShares,
      distributions,
      quarterlyFundDistributions,
    });
  } catch (error) {
    console.error("INVESTOR ME ERROR:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados do investidor." },
      { status: 500 }
    );
  }
}
