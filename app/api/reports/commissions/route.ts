import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    if (user.role !== "ADMIN" && user.role !== "ADMINISTRATIVE") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const repId = searchParams.get("repId") || null;
    const regionId = searchParams.get("regionId") || null;

    const dateFrom = from ? new Date(from + "T00:00:00.000Z") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dateTo = to ? new Date(to + "T23:59:59.999Z") : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);

    const fromMonth = dateFrom.getMonth() + 1;
    const fromYear = dateFrom.getFullYear();
    const toMonth = dateTo.getMonth() + 1;
    const toYear = dateTo.getFullYear();

    // ── 1. Comissões mensais (RepresentativeCommission) ──────────────────────
    const monthlyWhere: any = {
      OR: [] as any[],
    };

    // Build month/year range filter
    for (let y = fromYear; y <= toYear; y++) {
      const mStart = y === fromYear ? fromMonth : 1;
      const mEnd = y === toYear ? toMonth : 12;
      for (let m = mStart; m <= mEnd; m++) {
        monthlyWhere.OR.push({ year: y, month: m });
      }
    }
    if (repId) monthlyWhere.representativeId = repId;
    if (regionId) monthlyWhere.regionId = regionId;

    const monthlyCommissions = await prisma.representativeCommission.findMany({
      where: monthlyWhere,
      orderBy: [{ year: "desc" }, { month: "desc" }, { region: { name: "asc" } }],
      include: {
        representative: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
      },
    });

    // ── 2. Acertos semanais (RepresentativeSettlement) ───────────────────────
    const settlementWhere: any = {
      weekStart: { gte: dateFrom, lte: dateTo },
    };
    if (repId) settlementWhere.representativeId = repId;
    if (regionId) settlementWhere.regionId = regionId;

    const settlements = await prisma.representativeSettlement.findMany({
      where: settlementWhere,
      orderBy: { weekStart: "desc" },
      include: {
        representative: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
      },
    });

    // ── 3. Histórico de pagamentos confirmados ───────────────────────────────
    const confirmationWhere: any = {
      status: "PAID",
      confirmedAt: { gte: dateFrom, lte: dateTo },
    };
    if (repId) confirmationWhere.representativeId = repId;
    if (regionId) confirmationWhere.regionId = regionId;

    const confirmations = await prisma.commissionPaymentConfirmation.findMany({
      where: confirmationWhere,
      orderBy: { confirmedAt: "desc" },
      include: {
        representative: { select: { id: true, name: true } },
        region: { select: { id: true, name: true } },
      },
    });

    // ── 4. Representantes e regiões para filtros ─────────────────────────────
    const [representatives, regions] = await Promise.all([
      prisma.user.findMany({
        where: { role: "REPRESENTATIVE", active: true },
        select: { id: true, name: true, region: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.region.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // ── 5. Totais ─────────────────────────────────────────────────────────────
    const summary = {
      totalGeneratedCents: monthlyCommissions.reduce((s, r) => s + (r.commissionCents ?? 0), 0),
      totalPaidCents: monthlyCommissions.filter((r) => r.status === "PAID").reduce((s, r) => s + (r.commissionCents ?? 0), 0),
      totalPendingCents: monthlyCommissions.filter((r) => r.status === "PENDING").reduce((s, r) => s + (r.commissionCents ?? 0), 0),
      totalConfirmedPaymentsCents: confirmations.reduce((s, c) => s + (c.amountCents ?? 0), 0),
      settlementsCount: settlements.length,
      repsCount: new Set(monthlyCommissions.map((r) => r.representativeId)).size,
    };

    return NextResponse.json({
      ok: true,
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
      summary,
      monthly: monthlyCommissions.map((r) => ({
        id: r.id,
        representativeId: r.representativeId,
        representative: r.representative.name,
        regionId: r.regionId,
        region: r.region.name,
        month: r.month,
        year: r.year,
        grossRevenueCents: r.grossRevenueCents,
        commissionPercent: Number(r.commissionPercent),
        commissionCents: r.commissionCents,
        status: r.status,
        paidAt: r.paidAt,
      })),
      settlements: settlements.map((s) => ({
        id: s.id,
        representativeId: s.representativeId,
        representative: s.representative?.name ?? "—",
        regionId: s.regionId,
        region: s.region.name,
        weekStart: s.weekStart,
        weekEnd: s.weekEnd,
        totalSalesPaidCents: s.totalSalesPaidCents,
        totalCommissionGeneratedCents: s.totalCommissionGeneratedCents,
        matrixOwesRepresentativeCents: s.matrixOwesRepresentativeCents,
        representativeOwesMatrixCents: s.representativeOwesMatrixCents,
        netSettlementCents: s.netSettlementCents,
        status: s.status,
        closedAt: s.closedAt,
      })),
      confirmations: confirmations.map((c) => ({
        id: c.id,
        representative: c.representative.name,
        region: c.region?.name ?? "—",
        weekStart: c.weekStart,
        weekEnd: c.weekEnd,
        amountCents: c.amountCents,
        confirmedAt: c.confirmedAt,
        status: c.status,
      })),
      filterOptions: {
        representatives: representatives.map((r) => ({
          id: r.id,
          name: r.name,
          region: r.region?.name ?? null,
        })),
        regions: regions.map((r) => ({ id: r.id, name: r.name })),
      },
    });
  } catch (error) {
    console.error("GET /api/reports/commissions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar relatório." },
      { status: 500 }
    );
  }
}
