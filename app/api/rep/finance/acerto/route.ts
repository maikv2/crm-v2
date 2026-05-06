import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

type ConfirmationRow = {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  status: string;
  confirmedAt: Date | null;
  metadata: {
    payableCurrentWeekCents?: number;
    payablePriorWeekCents?: number;
    totalSalesCents?: number;
    totalCommissionCents?: number;
  } | null;
};

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    const rows = await prisma.$queryRaw<ConfirmationRow[]>`
      SELECT
        c."id",
        c."weekStart",
        c."weekEnd",
        c."amountCents",
        c."pendingCents",
        c."ordersCount",
        c."status",
        c."confirmedAt",
        c."metadata"
      FROM "CommissionPaymentConfirmation" c
      WHERE c."representativeId" = ${user.id}::uuid
      ORDER BY c."weekEnd" DESC
      LIMIT 10;
    `;

    const acertos = rows.map((row) => {
      const meta = (row.metadata ?? {}) as {
        payableCurrentWeekCents?: number;
        payablePriorWeekCents?: number;
        totalSalesCents?: number;
        totalCommissionCents?: number;
      };
      return {
        id: row.id,
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

    const latest = acertos[0] ?? null;

    return NextResponse.json({ acertos, latest });
  } catch (error) {
    console.error("GET /api/rep/finance/acerto error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar acerto." },
      { status: 500 }
    );
  }
}
