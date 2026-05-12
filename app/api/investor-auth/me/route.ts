import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { calculateQuarterlyFundPreview, getQuarterForMonth } from "@/lib/investor-distribution";

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
              where: {
                isActive: true,
              },
              include: {
                region: true,
              },
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
      distributions.filter((d) => d.status === "PAID").reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0) +
      quarterlyFundDistributions.filter((d) => d.status === "PAID").reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0);

    const pendingDistributionCents =
      distributions.filter((d) => d.status === "PENDING").reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0) +
      quarterlyFundDistributions.filter((d) => d.status === "PENDING").reduce((sum, d) => sum + (d.totalDistributionCents ?? 0), 0);

    // Live estimate: calculate the investor's share of the quarterly fund in real time
    // based on actual revenue and expenses so far this quarter, day by day.
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentQuarter = getQuarterForMonth(currentMonth);

    const regionIds = [...new Set(activeShares.map((s) => s.regionId))];

    let liveQuarterlyFundCents = 0;

    await Promise.all(
      regionIds.map(async (regionId) => {
        try {
          const preview = await calculateQuarterlyFundPreview(regionId, currentQuarter, currentYear);
          const entry = preview.investors.find((inv) => inv.investorId === investor.id);
          if (entry) liveQuarterlyFundCents += entry.totalDistributionCents;
        } catch {
          // Region may have no data yet — skip silently
        }
      })
    );

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
        quarterlyFundCents: liveQuarterlyFundCents,
        quarter: currentQuarter,
        year: currentYear,
      },
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