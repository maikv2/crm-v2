import { prisma } from "@/lib/prisma";

type InvestorPreviewItem = {
  investorId: string;
  investorName: string;
  investorEmail: string | null;
  quotaCount: number;
  totalDistributionCents: number;
  quotaNumbers: number[];
  payoutPhase: "PAYBACK" | "RECURRING";
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

  // Batch-fetch cumulative paid distributions per investor to determine payback phase.
  // Payback is complete when total received >= investment (amountCents, default R$20k).
  const paidSums = await prisma.investorDistribution.groupBy({
    by: ["investorId"],
    where: {
      regionId,
      paidAt: { not: null },
    },
    _sum: { totalDistributionCents: true },
  });

  const paidByInvestor = new Map<string, number>();
  for (const r of paidSums) {
    paidByInvestor.set(r.investorId, r._sum.totalDistributionCents ?? 0);
  }

  const activeQuotaCount = shares.length;
  const ebitdaCents = monthlyResult.ebitdaCents;

  const companyShares = shares.filter((s) => s.ownerType === "COMPANY");
  const investorShares = shares.filter((s) => s.ownerType === "INVESTOR");

  // Build per-investor data with correct payout phase
  type InvestorShareData = {
    share: (typeof investorShares)[0];
    paidBack: boolean;
    payoutPhase: "PAYBACK" | "RECURRING";
    investorRate: number;
  };

  const investorShareData: InvestorShareData[] = investorShares.map((share) => {
    const totalPaid = share.investorId
      ? (paidByInvestor.get(share.investorId) ?? 0)
      : 0;
    // Investor recovers when cumulative paid distributions >= their investment amount
    const paidBack =
      share.paidBackAt !== null || totalPaid >= share.amountCents;
    const payoutPhase = paidBack ? "RECURRING" : "PAYBACK";
    const investorRate = paidBack
      ? share.postPayInvestorBps
      : share.prePayInvestorBps;
    return { share, paidBack, payoutPhase, investorRate };
  });

  // Each investor quota receives: ebitda * investorRate / 10000 / activeQuotaCount
  // This gives each quota its proportional slice of the investor pool (60% PAYBACK / 40% RECURRING)
  let investorTotalCents = 0;
  for (const { investorRate } of investorShareData) {
    investorTotalCents += Math.floor(
      (ebitdaCents * investorRate) / 10000 / activeQuotaCount
    );
  }

  const valuePerQuotaCents = safeDivideInt(
    investorTotalCents,
    investorShares.length || 1
  );

  const grouped = new Map<string, InvestorPreviewItem>();

  for (const { share, payoutPhase } of investorShareData) {
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
        payoutPhase,
      });
      continue;
    }

    existing.quotaCount += 1;
    existing.totalDistributionCents += valuePerQuotaCents;
    existing.quotaNumbers.push(share.quotaNumber);
    // If any quota is still in PAYBACK, the whole investor stays in PAYBACK
    if (payoutPhase === "PAYBACK") {
      existing.payoutPhase = "PAYBACK";
    }
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

  // Re-fetch cumulative paid per investor to set payoutPhase correctly on upsert
  const paidSums = await prisma.investorDistribution.groupBy({
    by: ["investorId"],
    where: {
      regionId,
      paidAt: { not: null },
    },
    _sum: { totalDistributionCents: true },
  });

  const paidByInvestor = new Map<string, number>();
  for (const r of paidSums) {
    paidByInvestor.set(r.investorId, r._sum.totalDistributionCents ?? 0);
  }

  const shares = await prisma.share.findMany({
    where: { regionId, isActive: true, ownerType: "INVESTOR" },
    select: { investorId: true, amountCents: true, paidBackAt: true },
  });

  const phaseByInvestor = new Map<string, "PAYBACK" | "RECURRING">();
  for (const s of shares) {
    if (!s.investorId) continue;
    const totalPaid = paidByInvestor.get(s.investorId) ?? 0;
    const paidBack = s.paidBackAt !== null || totalPaid >= s.amountCents;
    // Keep PAYBACK if any quota not yet recovered
    if (!phaseByInvestor.has(s.investorId) || !paidBack) {
      phaseByInvestor.set(s.investorId, paidBack ? "RECURRING" : "PAYBACK");
    }
  }

  const results = [];

  for (const investor of preview.investors) {
    const payoutPhase = phaseByInvestor.get(investor.investorId) ?? "PAYBACK";

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
        payoutPhase,
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
        payoutPhase,
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

function getQuarterMonths(quarter: number): [number, number, number] {
  const base = (quarter - 1) * 3 + 1;
  return [base, base + 1, base + 2];
}

export function getQuarterForMonth(month: number): number {
  return Math.ceil(month / 3);
}

export async function calculateQuarterlyFundPreview(
  regionId: string,
  quarter: number,
  year: number
) {
  const months = getQuarterMonths(quarter);

  // Sum quarterly fund contributions from the 3 months
  const monthlyResults = await prisma.regionMonthlyResult.findMany({
    where: {
      regionId,
      month: { in: months },
      year,
    },
    select: {
      id: true,
      month: true,
      quarterlyFundContributionCents: true,
    },
    orderBy: { month: "desc" },
  });

  const quarterlyFundTotalCents = monthlyResults.reduce(
    (sum, r) => sum + r.quarterlyFundContributionCents,
    0
  );

  // Use the last month of the quarter as the anchor result for the distribution record
  const anchorResult = monthlyResults[0] ?? null;

  const shares = await prisma.share.findMany({
    where: { regionId, isActive: true },
    include: { investor: true },
    orderBy: { quotaNumber: "asc" },
  });

  const paidSums = await prisma.investorDistribution.groupBy({
    by: ["investorId"],
    where: { regionId, paidAt: { not: null } },
    _sum: { totalDistributionCents: true },
  });

  // Also include already paid quarterly fund distributions
  const paidFundSums = await prisma.quarterlyFundDistribution.groupBy({
    by: ["investorId"],
    where: { regionId, paidAt: { not: null } },
    _sum: { totalDistributionCents: true },
  });

  const paidByInvestor = new Map<string, number>();
  for (const r of paidSums) {
    paidByInvestor.set(r.investorId, r._sum.totalDistributionCents ?? 0);
  }
  for (const r of paidFundSums) {
    const existing = paidByInvestor.get(r.investorId) ?? 0;
    paidByInvestor.set(r.investorId, existing + (r._sum.totalDistributionCents ?? 0));
  }

  const investorShares = shares.filter((s) => s.ownerType === "INVESTOR");
  const activeQuotaCount = shares.length;

  type QuarterlyFundInvestorItem = {
    investorId: string;
    investorName: string;
    investorEmail: string | null;
    quotaCount: number;
    totalDistributionCents: number;
    quotaNumbers: number[];
    payoutPhase: "PAYBACK" | "RECURRING";
  };

  const grouped = new Map<string, QuarterlyFundInvestorItem>();

  for (const share of investorShares) {
    if (!share.investorId || !share.investor) continue;

    const totalPaid = paidByInvestor.get(share.investorId) ?? 0;
    const paidBack = share.paidBackAt !== null || totalPaid >= share.amountCents;
    const payoutPhase = paidBack ? "RECURRING" : "PAYBACK";
    const investorRate = paidBack ? share.postPayInvestorBps : share.prePayInvestorBps;

    // Per quota: quarterlyFundTotal * investorRate / 10000 / activeQuotaCount
    const quotaAmount = Math.floor(
      (quarterlyFundTotalCents * investorRate) / 10000 / activeQuotaCount
    );

    const existing = grouped.get(share.investorId);
    if (!existing) {
      grouped.set(share.investorId, {
        investorId: share.investorId,
        investorName: share.investor.name,
        investorEmail: share.investor.email ?? null,
        quotaCount: 1,
        totalDistributionCents: quotaAmount,
        quotaNumbers: [share.quotaNumber],
        payoutPhase,
      });
    } else {
      existing.quotaCount += 1;
      existing.totalDistributionCents += quotaAmount;
      existing.quotaNumbers.push(share.quotaNumber);
      if (payoutPhase === "PAYBACK") existing.payoutPhase = "PAYBACK";
    }
  }

  const valuePerQuotaCents =
    investorShares.length > 0
      ? safeDivideInt(
          Array.from(grouped.values()).reduce(
            (s, i) => s + i.totalDistributionCents,
            0
          ),
          investorShares.length
        )
      : 0;

  return {
    regionId,
    quarter,
    year,
    quarterlyFundTotalCents,
    activeQuotaCount,
    investorQuotaCount: investorShares.length,
    valuePerQuotaCents,
    anchorResultId: anchorResult?.id ?? null,
    investors: Array.from(grouped.values()).sort((a, b) =>
      a.investorName.localeCompare(b.investorName, "pt-BR")
    ),
  };
}

export async function generateQuarterlyFundDistributions(
  regionId: string,
  quarter: number,
  year: number
) {
  const preview = await calculateQuarterlyFundPreview(regionId, quarter, year);

  if (!preview.anchorResultId) {
    throw new Error(
      `Nenhum resultado mensal encontrado para o ${quarter}º trimestre de ${year}.`
    );
  }

  if (preview.quarterlyFundTotalCents === 0) {
    throw new Error("Fundo trimestral zerado: sem eficiência administrativa no período.");
  }

  const shares = await prisma.share.findMany({
    where: { regionId, isActive: true, ownerType: "INVESTOR" },
    select: { investorId: true, amountCents: true, paidBackAt: true },
  });

  const paidSums = await prisma.investorDistribution.groupBy({
    by: ["investorId"],
    where: { regionId, paidAt: { not: null } },
    _sum: { totalDistributionCents: true },
  });
  const paidFundSums = await prisma.quarterlyFundDistribution.groupBy({
    by: ["investorId"],
    where: { regionId, paidAt: { not: null } },
    _sum: { totalDistributionCents: true },
  });

  const paidByInvestor = new Map<string, number>();
  for (const r of paidSums) paidByInvestor.set(r.investorId, r._sum.totalDistributionCents ?? 0);
  for (const r of paidFundSums) {
    const existing = paidByInvestor.get(r.investorId) ?? 0;
    paidByInvestor.set(r.investorId, existing + (r._sum.totalDistributionCents ?? 0));
  }

  const phaseByInvestor = new Map<string, "PAYBACK" | "RECURRING">();
  for (const s of shares) {
    if (!s.investorId) continue;
    const totalPaid = paidByInvestor.get(s.investorId) ?? 0;
    const paidBack = s.paidBackAt !== null || totalPaid >= s.amountCents;
    if (!phaseByInvestor.has(s.investorId) || !paidBack) {
      phaseByInvestor.set(s.investorId, paidBack ? "RECURRING" : "PAYBACK");
    }
  }

  const results = [];

  for (const investor of preview.investors) {
    const payoutPhase = phaseByInvestor.get(investor.investorId) ?? "PAYBACK";

    const record = await prisma.quarterlyFundDistribution.upsert({
      where: {
        regionId_investorId_quarter_year: {
          regionId,
          investorId: investor.investorId,
          quarter,
          year,
        },
      },
      update: {
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        quarterlyFundTotalCents: preview.quarterlyFundTotalCents,
        payoutPhase,
        status: "PENDING",
      },
      create: {
        regionMonthlyResultId: preview.anchorResultId!,
        regionId,
        investorId: investor.investorId,
        quarter,
        year,
        quotaCount: investor.quotaCount,
        valuePerQuotaCents: preview.valuePerQuotaCents,
        totalDistributionCents: investor.totalDistributionCents,
        quarterlyFundTotalCents: preview.quarterlyFundTotalCents,
        payoutPhase,
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
