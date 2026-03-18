import { prisma } from "@/lib/prisma";

type InvestorPreviewItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  totalDistributionCents: number;
  quotaNumbers: number[];
};

function safeDivideInt(total: number, divisor: number) {
  if (!divisor || divisor <= 0) return 0;
  return Math.floor(total / divisor);
}

export async function calculateInvestorDistributionPreview(
  regionId: string,
  month: number,
  year: number
) {
  const monthlyResult = await prisma.regionMonthlyResult.findUnique({
    where: {
      regionId_month_year: {
        regionId,
        month,
        year,
      },
    },
  });

  if (!monthlyResult) {
    throw new Error("Resultado mensal da região não encontrado.");
  }

  const shares = await prisma.share.findMany({
    where: {
      regionId,
      isActive: true,
    },
    include: {
      investor: true,
    },
    orderBy: {
      quotaNumber: "asc",
    },
  });

  const activeQuotaCount = shares.length;

  const ebitdaCents = monthlyResult.ebitdaCents;

  const companyShares = shares.filter((s) => s.ownerType === "COMPANY");
  const investorShares = shares.filter((s) => s.ownerType === "INVESTOR");

  let investorTotalCents = 0;

  for (const share of investorShares) {
    const paidBack =
      share.paidBackAt !== null ||
      (share.investedAt &&
        monthlyResult.ebitdaCents * 0.6 >= share.amountCents);

    const investorRate = paidBack
      ? share.postPayInvestorBps
      : share.prePayInvestorBps;

    investorTotalCents += Math.floor(
      (ebitdaCents * investorRate) / 10000 / activeQuotaCount
    );
  }

  const valuePerQuotaCents = safeDivideInt(
    investorTotalCents,
    investorShares.length || 1
  );

  const grouped = new Map<string, InvestorPreviewItem>();

  for (const share of investorShares) {
    if (!share.investorId || !share.investor) continue;

    const existing = grouped.get(share.investorId);

    if (!existing) {
      grouped.set(share.investorId, {
        investorId: share.investorId,
        investorName: share.investor.name,
        investorEmail: share.investor.email ?? null,
        quotaCount: 1,
        totalDistributionCents: valuePerQuotaCents,
        quotaNumbers: [share.quotaNumber],
      });

      continue;
    }

    existing.quotaCount += 1;
    existing.totalDistributionCents += valuePerQuotaCents;
    existing.quotaNumbers.push(share.quotaNumber);
  }

  return {
    regionId,
    month,
    year,
    ebitdaCents,
    activeQuotaCount,
    companyQuotaCount: companyShares.length,
    investorQuotaCount: investorShares.length,
    valuePerQuotaCents,
    investors: Array.from(grouped.values()).sort((a, b) =>
      a.investorName.localeCompare(b.investorName, "pt-BR")
    ),
  };
}

export async function generateInvestorDistributions(
  regionId: string,
  month: number,
  year: number
) {
  const preview = await calculateInvestorDistributionPreview(
    regionId,
    month,
    year
  );

  const monthlyResult = await prisma.regionMonthlyResult.findUnique({
    where: {
      regionId_month_year: {
        regionId,
        month,
        year,
      },
    },
  });

  if (!monthlyResult) {
    throw new Error("Resultado mensal não encontrado.");
  }

  const results = [];

  for (const investor of preview.investors) {
    const record = await prisma.investorDistribution.upsert({
      where: {
        regionId_investorId_month_year: {
          regionId,
          investorId: investor.investorId,
          month,
          year,
        },
      },
      update: {
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        status: "PENDING",
      },
      create: {
        regionMonthlyResultId: monthlyResult.id,
        investorId: investor.investorId,
        regionId,
        month,
        year,
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        payoutPhase: "RECURRING",
        status: "PENDING",
      },
    });

    results.push(record);
  }

  return {
    ...preview,
    generatedCount: results.length,
  };
}