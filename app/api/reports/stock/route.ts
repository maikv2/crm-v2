import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saída",
  TRANSFER_IN: "Transferência (Entrada)",
  TRANSFER_OUT: "Transferência (Saída)",
  ADJUSTMENT: "Ajuste",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parâmetros 'from' e 'to' são obrigatórios." },
        { status: 400 }
      );
    }

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    // ── Movements in period ────────────────────────────────────────────────────
    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: { gte: from, lte: toEnd },
      },
      include: {
        product: { select: { id: true, name: true } },
        stockLocation: { select: { id: true, name: true } },
        order: { select: { id: true, number: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // ── Current balances ───────────────────────────────────────────────────────
    const [products, locations, regions, allMovements, exhibitorStocks] =
      await Promise.all([
        prisma.product.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, priceCents: true },
        }),
        prisma.stockLocation.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.region.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, stockLocationId: true },
        }),
        prisma.stockMovement.findMany({
          select: { productId: true, stockLocationId: true, type: true, quantity: true },
        }),
        prisma.exhibitorStock.findMany({
          select: { productId: true, quantity: true },
        }),
      ]);

    const regionStockLocationIds = new Set(
      regions.map((r) => r.stockLocationId).filter(Boolean) as string[]
    );

    const matrixLocation =
      locations.find((l) => !regionStockLocationIds.has(l.id)) ?? null;

    const balanceMap: Record<string, Record<string, number>> = {};
    for (const product of products) {
      balanceMap[product.id] = {};
      for (const loc of locations) {
        balanceMap[product.id][loc.id] = 0;
      }
    }

    for (const m of allMovements) {
      balanceMap[m.productId] ??= {};
      balanceMap[m.productId][m.stockLocationId] ??= 0;
      const qty = m.quantity ?? 0;
      if (m.type === StockMovementType.IN || m.type === StockMovementType.TRANSFER_IN) {
        balanceMap[m.productId][m.stockLocationId] += qty;
      }
      if (m.type === StockMovementType.OUT || m.type === StockMovementType.TRANSFER_OUT) {
        balanceMap[m.productId][m.stockLocationId] -= qty;
      }
      if (m.type === StockMovementType.ADJUSTMENT) {
        balanceMap[m.productId][m.stockLocationId] = qty;
      }
    }

    const exhibitorByProduct: Record<string, number> = {};
    for (const s of exhibitorStocks) {
      exhibitorByProduct[s.productId] = (exhibitorByProduct[s.productId] ?? 0) + s.quantity;
    }

    // ── Summary of movements ───────────────────────────────────────────────────
    let totalIn = 0;
    let totalOut = 0;
    let totalTransferIn = 0;
    let totalTransferOut = 0;
    let totalAdjustment = 0;

    for (const m of movements) {
      switch (m.type) {
        case StockMovementType.IN: totalIn += m.quantity; break;
        case StockMovementType.OUT: totalOut += m.quantity; break;
        case StockMovementType.TRANSFER_IN: totalTransferIn += m.quantity; break;
        case StockMovementType.TRANSFER_OUT: totalTransferOut += m.quantity; break;
        case StockMovementType.ADJUSTMENT: totalAdjustment += m.quantity; break;
      }
    }

    // ── By product (movements) ─────────────────────────────────────────────────
    const byProductMovMap = new Map<string, { name: string; in: number; out: number; transfers: number }>();
    for (const m of movements) {
      const key = m.productId;
      const existing = byProductMovMap.get(key) ?? { name: m.product.name, in: 0, out: 0, transfers: 0 };
      if (m.type === StockMovementType.IN) existing.in += m.quantity;
      if (m.type === StockMovementType.OUT) existing.out += m.quantity;
      if (m.type === StockMovementType.TRANSFER_IN || m.type === StockMovementType.TRANSFER_OUT) {
        existing.transfers += m.quantity;
      }
      byProductMovMap.set(key, existing);
    }
    const byProductMovements = Array.from(byProductMovMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out));

    // ── By location (movements) ────────────────────────────────────────────────
    const byLocationMap = new Map<string, { name: string; in: number; out: number }>();
    for (const m of movements) {
      const key = m.stockLocationId;
      const existing = byLocationMap.get(key) ?? { name: m.stockLocation.name, in: 0, out: 0 };
      if (m.type === StockMovementType.IN) existing.in += m.quantity;
      if (m.type === StockMovementType.OUT) existing.out += m.quantity;
      byLocationMap.set(key, existing);
    }
    const byLocation = Array.from(byLocationMap.entries()).map(([id, v]) => ({ id, ...v }));

    // ── Current position ───────────────────────────────────────────────────────
    const currentPosition = products.map((product) => {
      const matrixQty = matrixLocation
        ? (balanceMap[product.id]?.[matrixLocation.id] ?? 0)
        : 0;

      const regionQtys = regions.map((region) => ({
        regionId: region.id,
        regionName: region.name,
        qty: region.stockLocationId
          ? (balanceMap[product.id]?.[region.stockLocationId] ?? 0)
          : 0,
      }));

      const exhibitorQty = exhibitorByProduct[product.id] ?? 0;
      const totalQty = matrixQty + regionQtys.reduce((s, r) => s + r.qty, 0) + exhibitorQty;

      return {
        productId: product.id,
        productName: product.name,
        priceCents: product.priceCents,
        matrixQty,
        regionQtys,
        exhibitorQty,
        totalQty,
        totalValueCents: totalQty * product.priceCents,
      };
    }).filter((p) => p.totalQty > 0);

    // ── Movements list ─────────────────────────────────────────────────────────
    const movementsList = movements.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      locationName: m.stockLocation.name,
      type: m.type,
      typeLabel: MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
      quantity: m.quantity,
      note: m.note,
      orderNumber: m.order?.number ?? null,
      createdAt: m.createdAt.toISOString(),
    }));

    return NextResponse.json({
      period: {
        from: from.toISOString(),
        to: toEnd.toISOString(),
      },
      summary: {
        totalMovements: movements.length,
        totalIn,
        totalOut,
        totalTransferIn,
        totalTransferOut,
        totalAdjustment,
      },
      byProductMovements,
      byLocation,
      currentPosition,
      movements: movementsList,
    });
  } catch (error) {
    console.error("GET /api/reports/stock error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório de estoque." },
      { status: 500 }
    );
  }
}
