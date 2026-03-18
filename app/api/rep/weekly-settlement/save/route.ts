import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RepresentativeSettlementStatus } from "@prisma/client";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const regionName = String(body.region ?? "").trim();
    const representativeId =
      typeof body.representativeId === "string" && body.representativeId.trim()
        ? body.representativeId.trim()
        : null;
    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    if (!regionName) {
      return NextResponse.json(
        { error: "Região é obrigatória." },
        { status: 400 }
      );
    }

    const region = await prisma.region.findUnique({
      where: { name: regionName },
      select: { id: true, name: true },
    });

    if (!region) {
      return NextResponse.json(
        { error: "Região não encontrada." },
        { status: 404 }
      );
    }

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfDay(now);

    const salesFinance = await prisma.financeTransaction.findMany({
      where: {
        category: "SALES",
        type: "INCOME",
        paidAt: {
          gte: weekStart,
          lte: weekEnd,
        },
        regionId: region.id,
      },
      include: {
        order: {
          select: {
            id: true,
            totalCents: true,
            commissionTotalCents: true,
            paymentReceiver: true,
          },
        },
      },
    });

    const rows = salesFinance
      .filter((tx) => tx.order)
      .map((tx) => {
        const order = tx.order!;
        const totalCents = order.totalCents ?? tx.amountCents ?? 0;
        const commissionCents = order.commissionTotalCents ?? 0;
        const companyShareCents = Math.max(0, totalCents - commissionCents);

        return {
          totalCents,
          commissionCents,
          companyShareCents,
          paymentReceiver: order.paymentReceiver,
        };
      });

    const totalSalesPaidCents = rows.reduce((acc, row) => acc + row.totalCents, 0);
    const totalCommissionGeneratedCents = rows.reduce(
      (acc, row) => acc + row.commissionCents,
      0
    );
    const matrixOwesRepresentativeCents = rows
      .filter((row) => row.paymentReceiver === "MATRIX")
      .reduce((acc, row) => acc + row.commissionCents, 0);

    const representativeOwesMatrixCents = rows
      .filter((row) => row.paymentReceiver === "REGION")
      .reduce((acc, row) => acc + row.companyShareCents, 0);

    const netSettlementCents =
      matrixOwesRepresentativeCents - representativeOwesMatrixCents;

    const saved = await prisma.representativeSettlement.upsert({
      where: {
        regionId_weekStart_weekEnd: {
          regionId: region.id,
          weekStart,
          weekEnd,
        },
      },
      update: {
        representativeId,
        totalSalesPaidCents,
        totalCommissionGeneratedCents,
        matrixOwesRepresentativeCents,
        representativeOwesMatrixCents,
        netSettlementCents,
        status: RepresentativeSettlementStatus.CLOSED,
        closedAt: new Date(),
        notes,
      },
      create: {
        regionId: region.id,
        representativeId,
        weekStart,
        weekEnd,
        totalSalesPaidCents,
        totalCommissionGeneratedCents,
        matrixOwesRepresentativeCents,
        representativeOwesMatrixCents,
        netSettlementCents,
        status: RepresentativeSettlementStatus.CLOSED,
        closedAt: new Date(),
        notes,
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error("Erro ao salvar fechamento semanal:", error);
    return NextResponse.json(
      { error: "Erro ao salvar fechamento semanal." },
      { status: 500 }
    );
  }
}