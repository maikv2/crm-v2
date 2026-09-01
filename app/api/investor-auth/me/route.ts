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

function parseMonthYear(request: Request) {
  const now = new Date();
  const url = new URL(request.url);
  const month = Number(url.searchParams.get("month") || now.getMonth() + 1);
  const year = Number(url.searchParams.get("year") || now.getFullYear());

  return {
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1,
    year: Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : now.getFullYear(),
  };
}

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export async function GET(request: Request) {
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
    const reportPeriod = parseMonthYear(request);
    const reportQuarter = getQuarterForMonth(reportPeriod.month);
    const currentQuarter = getQuarterForMonth(currentMonth);
    const regionIds = [...new Set(activeShares.map((s) => s.regionId))];
    const requestMarkers = [
      ...distributions.map((d) => `investor_payment_request:monthly:${d.id}`),
      ...quarterlyFundDistributions.map((d) => `investor_payment_request:quarterly:${d.id}`),
    ];

    const [
      distributionPreviews,
      quarterlyPreviews,
      regionSnapshots,
      reportSnapshots,
      reportDistributionPreviews,
      reportQuarterlyPreviews,
      reportOrderStats,
      totalActivePdvs,
      totalRevenueSumResult,
      paymentRequests,
    ] = await Promise.all([
      Promise.all(
        regionIds.map((rid) =>
          calculateInvestorDistributionPreview(rid, currentMonth, currentYear).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateQuarterlyFundPreview(rid, currentQuarter, currentYear, {
            throughMonth: currentMonth,
          }).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateRegionFinancialSnapshot(rid, currentMonth, currentYear).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateRegionFinancialSnapshot(rid, reportPeriod.month, reportPeriod.year).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateInvestorDistributionPreview(rid, reportPeriod.month, reportPeriod.year).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) =>
          calculateQuarterlyFundPreview(rid, reportQuarter, reportPeriod.year, {
            throughMonth: reportPeriod.month,
          }).catch(() => null)
        )
      ),
      Promise.all(
        regionIds.map((rid) => {
          const range = getMonthRange(reportPeriod.month, reportPeriod.year);
          return prisma.order.aggregate({
            where: {
              regionId: rid,
              type: "SALE",
              status: { not: "CANCELLED" },
              issuedAt: {
                gte: range.start,
                lt: range.end,
              },
            },
            _count: { id: true },
            _sum: { totalCents: true },
          });
        })
      ),
      prisma.exhibitor.count({ where: { status: "ACTIVE" } }),
      prisma.regionMonthlyResult.aggregate({
        where: { month: currentMonth, year: currentYear },
        _sum: { grossRevenueCents: true },
      }),
      requestMarkers.length
        ? prisma.financeTransaction.findMany({
            where: {
              investorId: investor.id,
              category: "INVESTOR_DISTRIBUTION",
              notes: { in: requestMarkers },
            },
            select: {
              id: true,
              notes: true,
              createdAt: true,
              status: true,
            },
          })
        : Promise.resolve([]),
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

    const requestByMarker = new Map(
      paymentRequests
        .filter((item) => item.notes)
        .map((item) => [item.notes as string, item])
    );

    const distributionsWithRequests = distributions.map((item) => {
      const request = requestByMarker.get(`investor_payment_request:monthly:${item.id}`);
      return {
        ...item,
        paymentRequestId: request?.id ?? null,
        paymentRequestedAt: request?.createdAt ?? null,
        paymentRequestStatus: request?.status ?? null,
      };
    });

    const quarterlyWithRequests = quarterlyFundDistributions.map((item) => {
      const request = requestByMarker.get(`investor_payment_request:quarterly:${item.id}`);
      return {
        ...item,
        paymentRequestId: request?.id ?? null,
        paymentRequestedAt: request?.createdAt ?? null,
        paymentRequestStatus: request?.status ?? null,
      };
    });

    const regionReport = regionIds.map((regionId, i) => {
      const snap = reportSnapshots[i];
      const reportPreview = reportDistributionPreviews[i];
      const previewInvestor = reportPreview?.investors.find(
        (inv) => inv.investorId === investor.id
      );
      const quarterlyPreview = reportQuarterlyPreviews[i];
      const quarterlyPreviewInvestor = quarterlyPreview?.investors.find(
        (inv) => inv.investorId === investor.id
      );
      const savedDistribution = distributionsWithRequests.find(
        (dist) =>
          dist.regionId === regionId &&
          dist.month === reportPeriod.month &&
          dist.year === reportPeriod.year
      );
      const orderStat = reportOrderStats[i];
      const savedQuarterlyDistribution = quarterlyWithRequests.find(
        (dist) =>
          dist.regionId === regionId &&
          dist.quarter === reportQuarter &&
          dist.year === reportPeriod.year
      );
      const ordersCount = orderStat?._count.id ?? 0;
      const ordersTotalCents = orderStat?._sum.totalCents ?? 0;
      const averageOrderCents =
        ordersCount > 0 ? Math.round(ordersTotalCents / ordersCount) : 0;
      const share = activeShares.find((s) => s.regionId === regionId);
      const regionName = share?.region?.name ?? regionId;
      if (!snap) {
        return {
          regionId,
          regionName,
          month: reportPeriod.month,
          year: reportPeriod.year,
          grossRevenueCents: 0,
          cmvCents: 0,
          logisticsCents: 0,
          commissionCents: 0,
          taxesCents: 0,
          administrativeCents: 0,
          operatingProfitCents: 0,
          ebitdaDistributionId: savedDistribution?.id ?? null,
          ebitdaReceivableCents:
            savedDistribution?.totalDistributionCents ??
            previewInvestor?.totalDistributionCents ??
            0,
          ebitdaStatus: savedDistribution?.status ?? null,
          ebitdaPaymentRequestId: savedDistribution?.paymentRequestId ?? null,
          ebitdaPaymentRequestedAt: savedDistribution?.paymentRequestedAt ?? null,
          quarterlyFundDistributionId: savedQuarterlyDistribution?.id ?? null,
          quarterlyFundTotalCents:
            quarterlyPreview?.quarterlyFundTotalCents ??
            savedQuarterlyDistribution?.quarterlyFundTotalCents ??
            0,
          quarterlyFundReceivableCents:
            quarterlyPreviewInvestor?.totalDistributionCents ??
            savedQuarterlyDistribution?.totalDistributionCents ??
            0,
          quarterlyFundStatus: savedQuarterlyDistribution?.status ?? null,
          quarterlyFundPaymentRequestId: savedQuarterlyDistribution?.paymentRequestId ?? null,
          quarterlyFundPaymentRequestedAt: savedQuarterlyDistribution?.paymentRequestedAt ?? null,
          quarter: reportQuarter,
          ordersCount,
          ordersTotalCents,
          averageOrderCents,
        };
      }
      return {
        regionId,
        regionName,
        month: reportPeriod.month,
        year: reportPeriod.year,
        grossRevenueCents: snap.grossRevenueCents,
        cmvCents: snap.cmvCents,
        logisticsCents: snap.logisticsCents,
        commissionCents: snap.commissionCents,
        taxesCents: snap.taxesCents,
        administrativeCents: snap.administrativeCents,
        operatingProfitCents: snap.operatingProfitCents,
        ebitdaDistributionId: savedDistribution?.id ?? null,
        ebitdaReceivableCents:
          savedDistribution?.totalDistributionCents ??
          previewInvestor?.totalDistributionCents ??
          0,
        ebitdaStatus: savedDistribution?.status ?? null,
        ebitdaPaymentRequestId: savedDistribution?.paymentRequestId ?? null,
        ebitdaPaymentRequestedAt: savedDistribution?.paymentRequestedAt ?? null,
        quarterlyFundDistributionId: savedQuarterlyDistribution?.id ?? null,
        quarterlyFundTotalCents:
          quarterlyPreview?.quarterlyFundTotalCents ??
          savedQuarterlyDistribution?.quarterlyFundTotalCents ??
          0,
        quarterlyFundReceivableCents:
          quarterlyPreviewInvestor?.totalDistributionCents ??
          savedQuarterlyDistribution?.totalDistributionCents ??
          0,
        quarterlyFundStatus: savedQuarterlyDistribution?.status ?? null,
        quarterlyFundPaymentRequestId: savedQuarterlyDistribution?.paymentRequestId ?? null,
        quarterlyFundPaymentRequestedAt: savedQuarterlyDistribution?.paymentRequestedAt ?? null,
        quarter: reportQuarter,
        ordersCount,
        ordersTotalCents,
        averageOrderCents,
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
      distributions: distributionsWithRequests,
      quarterlyFundDistributions: quarterlyWithRequests,
    });
  } catch (error) {
    console.error("INVESTOR ME ERROR:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os dados do investidor." },
      { status: 500 }
    );
  }
}
