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

    const now = new Date();
    const dateFrom = from
      ? new Date(from + "T00:00:00.000Z")
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const dateTo = to
      ? new Date(to + "T23:59:59.999Z")
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // ── 1. Comissões por representante / mês (derivado dos pedidos reais) ──────
    // A tabela RepresentativeCommission não é alimentada pelo fluxo do sistema;
    // a comissão real vive em order.commissionTotalCents. Agregamos por
    // representante + região + mês, mesma base do relatório de Vendas.
    const commissionOrderWhere: any = {
      type: "SALE",
      issuedAt: { gte: dateFrom, lte: dateTo },
    };
    if (repId) commissionOrderWhere.sellerId = repId;
    if (regionId) commissionOrderWhere.regionId = regionId;

    const commissionSourceOrders = await prisma.order.findMany({
      where: commissionOrderWhere,
      select: {
        totalCents: true,
        commissionTotalCents: true,
        paymentStatus: true,
        issuedAt: true,
        sellerId: true,
        seller: { select: { id: true, name: true } },
        regionId: true,
        region: { select: { name: true } },
        items: { select: { qty: true, product: { select: { commissionCents: true } } } },
      },
    });

    type MonthlyAgg = {
      id: string;
      representativeId: string;
      representative: { id: string; name: string };
      regionId: string;
      region: { name: string };
      month: number;
      year: number;
      grossRevenueCents: number;
      commissionCents: number;
      paidCommissionCents: number;
      commissionPercent: number;
      status: "PAID" | "PENDING";
      paidAt: Date | null;
    };

    const monthlyMap = new Map<string, MonthlyAgg>();
    for (const o of commissionSourceOrders) {
      const rId = o.sellerId ?? "none";
      const y = o.issuedAt.getUTCFullYear();
      const m = o.issuedAt.getUTCMonth() + 1;
      const key = `${rId}|${o.regionId}|${y}|${m}`;
      const itemComm = o.items.reduce(
        (s, it) => s + it.qty * (it.product?.commissionCents ?? 0),
        0
      );
      const comm = o.commissionTotalCents ?? itemComm;
      const existing = monthlyMap.get(key) ?? {
        id: key,
        representativeId: rId,
        representative: { id: rId, name: o.seller?.name ?? "Sem representante" },
        regionId: o.regionId,
        region: { name: o.region?.name ?? "—" },
        month: m,
        year: y,
        grossRevenueCents: 0,
        commissionCents: 0,
        paidCommissionCents: 0,
        commissionPercent: 0,
        status: "PENDING" as "PAID" | "PENDING",
        paidAt: null,
      };
      existing.grossRevenueCents += o.totalCents;
      existing.commissionCents += comm;
      if (o.paymentStatus === "PAID") existing.paidCommissionCents += comm;
      monthlyMap.set(key, existing);
    }

    const monthlyCommissions = Array.from(monthlyMap.values())
      .map((r) => ({
        ...r,
        commissionPercent:
          r.grossRevenueCents > 0 ? (r.commissionCents / r.grossRevenueCents) * 100 : 0,
        status: (r.commissionCents > 0 && r.paidCommissionCents >= r.commissionCents
          ? "PAID"
          : "PENDING") as "PAID" | "PENDING",
      }))
      .sort(
        (a, b) => b.year - a.year || b.month - a.month || a.region.name.localeCompare(b.region.name)
      );

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
      totalGeneratedCents: monthlyCommissions.reduce((s, r) => s + r.commissionCents, 0),
      totalPaidCents: monthlyCommissions.reduce((s, r) => s + r.paidCommissionCents, 0),
      totalPendingCents: monthlyCommissions.reduce((s, r) => s + (r.commissionCents - r.paidCommissionCents), 0),
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
      confirmations: confirmations.map((c) => {
        const meta = (c.metadata ?? {}) as Record<string, unknown>;
        return {
          id: c.id,
          representative: c.representative.name,
          region: c.region?.name ?? "—",
          weekStart: c.weekStart,
          weekEnd: c.weekEnd,
          amountCents: c.amountCents,
          pendingCents: c.pendingCents,
          confirmedAt: c.confirmedAt,
          status: c.status,
          totalSalesCents: typeof meta.totalSalesCents === "number" ? meta.totalSalesCents : null,
          totalCommissionCents: typeof meta.totalCommissionCents === "number" ? meta.totalCommissionCents : null,
          payableCurrentWeekCents: typeof meta.payableCurrentWeekCents === "number" ? meta.payableCurrentWeekCents : null,
          payablePriorWeekCents: typeof meta.payablePriorWeekCents === "number" ? meta.payablePriorWeekCents : null,
        };
      }),
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
