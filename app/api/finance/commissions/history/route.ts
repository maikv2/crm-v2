import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 });
    }

    if (user.role !== "ADMIN" && user.role !== "ADMINISTRATIVE") {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    const history = await prisma.commissionPaymentConfirmation.findMany({
      where: { status: "PAID" },
      orderBy: { confirmedAt: "desc" },
      take: 50,
      select: {
        id: true,
        amountCents: true,
        weekStart: true,
        weekEnd: true,
        confirmedAt: true,
        representative: {
          select: { id: true, name: true },
        },
        region: {
          select: { name: true },
        },
      },
    });

    const totalPaidCents = await prisma.commissionPaymentConfirmation.aggregate({
      where: { status: "PAID" },
      _sum: { amountCents: true },
    });

    return NextResponse.json({
      ok: true,
      totalPaidCents: totalPaidCents._sum.amountCents ?? 0,
      history: history.map((h) => ({
        id: h.id,
        representativeId: h.representative.id,
        representative: h.representative.name,
        region: h.region?.name ?? "Sem região",
        amountCents: h.amountCents,
        weekStart: h.weekStart,
        weekEnd: h.weekEnd,
        confirmedAt: h.confirmedAt,
      })),
    });
  } catch (error) {
    console.error("GET /api/finance/commissions/history error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar histórico." },
      { status: 500 }
    );
  }
}
