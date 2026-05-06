import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

type ConfirmationRow = {
  id: string;
  representativeId: string;
  representativeName: string;
  regionId: string | null;
  regionName: string | null;
  weekStart: Date;
  weekEnd: Date;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  status: string;
  confirmedAt: Date | null;
  metadata: {
    totalSalesCents?: number;
    totalCommissionCents?: number;
    payableCurrentWeekCents?: number;
    payablePriorWeekCents?: number;
  } | null;
};

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "ADMINISTRATIVE") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    // Busca os fechamentos mais recentes — as últimas 2 semanas por representante
    const rows = await prisma.$queryRaw<ConfirmationRow[]>`
      SELECT
        c."id",
        c."representativeId",
        u."name" AS "representativeName",
        c."regionId",
        r."name" AS "regionName",
        c."weekStart",
        c."weekEnd",
        c."amountCents",
        c."pendingCents",
        c."ordersCount",
        c."status",
        c."confirmedAt",
        c."metadata"
      FROM "CommissionPaymentConfirmation" c
      JOIN "User" u ON u."id" = c."representativeId"
      LEFT JOIN "Region" r ON r."id" = c."regionId"
      ORDER BY c."weekEnd" DESC, u."name" ASC
      LIMIT 200;
    `;

    const confirmations = rows.map((row) => {
      const meta = (row.metadata ?? {}) as {
        payableCurrentWeekCents?: number;
        payablePriorWeekCents?: number;
        totalSalesCents?: number;
        totalCommissionCents?: number;
      };
      return {
        id: row.id,
        representative: row.representativeName,
        region: row.regionName ?? "Sem região",
        weekStart: row.weekStart,
        weekEnd: row.weekEnd,
        amountCents: row.amountCents,
        pendingCents: row.pendingCents,
        ordersCount: row.ordersCount,
        status: row.status,
        confirmedAt: row.confirmedAt,
        payableCurrentWeekCents: meta.payableCurrentWeekCents ?? null,
        payablePriorWeekCents: meta.payablePriorWeekCents ?? null,
        totalSalesCents: meta.totalSalesCents ?? null,
        totalCommissionCents: meta.totalCommissionCents ?? null,
      };
    });

    // Totais agregados do acerto mais recente (última semana fechada)
    const latestWeekEnd = rows[0]?.weekEnd ?? null;
    const latestBatch = latestWeekEnd
      ? confirmations.filter(
          (c) =>
            new Date(c.weekEnd).getTime() === new Date(latestWeekEnd).getTime()
        )
      : [];

    const totals = latestBatch.reduce(
      (acc, c) => ({
        totalPayable: acc.totalPayable + c.amountCents,
        totalCurrentWeek:
          acc.totalCurrentWeek + (c.payableCurrentWeekCents ?? 0),
        totalPriorWeeks:
          acc.totalPriorWeeks + (c.payablePriorWeekCents ?? 0),
        totalPending: acc.totalPending + c.pendingCents,
      }),
      {
        totalPayable: 0,
        totalCurrentWeek: 0,
        totalPriorWeeks: 0,
        totalPending: 0,
      }
    );

    return NextResponse.json({
      ok: true,
      latestWeekEnd,
      totals,
      confirmations,
    });
  } catch (error) {
    console.error("GET /api/finance/commissions/weekly-summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar resumo de comissões." },
      { status: 500 }
    );
  }
}
