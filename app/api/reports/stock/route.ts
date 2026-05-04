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

const RESTOCK_MINIMUM = 20;

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

    const movements = await prisma.stockMovement.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      include: {
        product: { select: { id: true, name: true } },
        stockLocation: { select: { id: true, name: true } },
        order: {
          select: {
            id: true,
            number: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

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
      if (m.type === StockMovementType.IN || m.type === StockMovementType.TRANSFER_IN)
        balanceMap[m.productId][m.stockLocationId] += qty;
      if (m.type === StockMovementType.OUT || m.type === StockMovementType.TRANSFER_OUT)
        balanceMap[m.productId][m.stockLocationId] -= qty;
      if (m.type === StockMovementType.ADJUSTMENT)
        balanceMap[m.productId][m.stockLocationId] = qty;
    }

    const exhibitorByProduct: Record<string, number> = {};
    for (const s of exhibitorStocks) {
      exhibitorByProduct[s.productId] = (exhibitorByProduct[s.productId] ?? 0) + s.quantity;
    }

    let totalIn = 0, totalOut = 0, totalTransferIn = 0, totalTransferOut = 0, totalAdjustment = 0;
    for (const m of movements) {
      switch (m.type) {
        case StockMovementType.IN: totalIn += m.quantity; break;
        case StockMovementType.OUT: totalOut += m.quantity; break;
        case StockMovementType.TRANSFER_IN: totalTransferIn += m.quantity; break;
        case StockMovementType.TRANSFER_OUT: totalTransferOut += m.quantity; break;
        case StockMovementType.ADJUSTMENT: totalAdjustment += m.quantity; break;
      }
    }

    const byProductMovMap = new Map<string, { name: string; in: number; out: number; transfers: number }>();
    for (const m of movements) {
      const existing = byProductMovMap.get(m.productId) ?? { name: m.product.name, in: 0, out: 0, transfers: 0 };
      if (m.type === StockMovementType.IN) existing.in += m.quantity;
      if (m.type === StockMovementType.OUT) existing.out += m.quantity;
      if (m.type === StockMovementType.TRANSFER_IN || m.type === StockMovementType.TRANSFER_OUT)
        existing.transfers += m.quantity;
      byProductMovMap.set(m.productId, existing);
    }
    const byProductMovements = Array.from(byProductMovMap.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (b.in + b.out) - (a.in + a.out));

    const byLocationMap = new Map<string, { name: string; in: number; out: number }>();
    for (const m of movements) {
      const existing = byLocationMap.get(m.stockLocationId) ?? { name: m.stockLocation.name, in: 0, out: 0 };
      if (m.type === StockMovementType.IN) existing.in += m.quantity;
      if (m.type === StockMovementType.OUT) existing.out += m.quantity;
      byLocationMap.set(m.stockLocationId, existing);
    }
    const byLocation = Array.from(byLocationMap.entries()).map(([id, v]) => ({ id, ...v }));

    const currentPosition = products.map((product) => {
      const matrixQty = matrixLocation ? (balanceMap[product.id]?.[matrixLocation.id] ?? 0) : 0;
      const regionQtys = regions.map((region) => ({
        regionId: region.id,
        regionName: region.name,
        qty: region.stockLocationId ? (balanceMap[product.id]?.[region.stockLocationId] ?? 0) : 0,
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

    // ── BLOCO 1: Expositores instalados no período ─────────────────────────────
    const exhibitorsInPeriod = await prisma.exhibitor.findMany({
      where: { installedAt: { gte: from, lte: toEnd } },
      include: {
        client: { select: { id: true, name: true } },
        initialItems: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { installedAt: "asc" },
    });

    const exhibitorProductTotalMap = new Map<string, { name: string; qty: number }>();
    for (const ex of exhibitorsInPeriod) {
      for (const item of ex.initialItems) {
        const existing = exhibitorProductTotalMap.get(item.productId) ?? { name: item.product.name, qty: 0 };
        existing.qty += item.quantity;
        exhibitorProductTotalMap.set(item.productId, existing);
      }
    }
    const exhibitorProductTotals = Array.from(exhibitorProductTotalMap.entries())
      .map(([id, v]) => ({ productId: id, ...v }))
      .sort((a, b) => b.qty - a.qty);

    const exhibitorByClientMap = new Map<string, {
      clientId: string;
      clientName: string;
      exhibitors: Array<{
        exhibitorId: string;
        exhibitorName: string | null;
        installedAt: string;
        items: Array<{ productId: string; productName: string; quantity: number }>;
      }>;
    }>();
    for (const ex of exhibitorsInPeriod) {
      const existing = exhibitorByClientMap.get(ex.clientId) ?? {
        clientId: ex.client.id,
        clientName: ex.client.name,
        exhibitors: [],
      };
      existing.exhibitors.push({
        exhibitorId: ex.id,
        exhibitorName: ex.name ?? ex.code ?? null,
        installedAt: ex.installedAt.toISOString(),
        items: ex.initialItems.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
        })),
      });
      exhibitorByClientMap.set(ex.clientId, existing);
    }
    const exhibitorByClient = Array.from(exhibitorByClientMap.values());

    // ── BLOCO 2: Saídas para vendas ────────────────────────────────────────────
    const salesMovements = movements.filter(
      (m) => m.type === StockMovementType.OUT && m.order !== null
    );

    const salesProductMap = new Map<string, { name: string; qty: number }>();
    for (const m of salesMovements) {
      const existing = salesProductMap.get(m.productId) ?? { name: m.product.name, qty: 0 };
      existing.qty += m.quantity;
      salesProductMap.set(m.productId, existing);
    }
    const salesProductTotals = Array.from(salesProductMap.entries())
      .map(([id, v]) => ({ productId: id, ...v }))
      .sort((a, b) => b.qty - a.qty);

    const salesByClientMap = new Map<string, {
      clientId: string;
      clientName: string;
      products: Map<string, { name: string; qty: number }>;
    }>();
    for (const m of salesMovements) {
      if (!m.order?.client) continue;
      const key = m.order.client.id;
      const existing = salesByClientMap.get(key) ?? {
        clientId: m.order.client.id,
        clientName: m.order.client.name,
        products: new Map(),
      };
      const prod = existing.products.get(m.productId) ?? { name: m.product.name, qty: 0 };
      prod.qty += m.quantity;
      existing.products.set(m.productId, prod);
      salesByClientMap.set(key, existing);
    }
    const salesByClient = Array.from(salesByClientMap.values()).map((c) => ({
      clientId: c.clientId,
      clientName: c.clientName,
      products: Array.from(c.products.entries())
        .map(([id, v]) => ({ productId: id, ...v }))
        .sort((a, b) => b.qty - a.qty),
    }));

    // ── BLOCO 3: Sugestão de reposição ────────────────────────────────────────
    const outByProductMap = new Map<string, { name: string; outQty: number }>();
    for (const m of movements) {
      if (m.type !== StockMovementType.OUT) continue;
      const existing = outByProductMap.get(m.productId) ?? { name: m.product.name, outQty: 0 };
      existing.outQty += m.quantity;
      outByProductMap.set(m.productId, existing);
    }

    const currentBalanceByProduct: Record<string, number> = {};
    for (const product of products) {
      const locTotal = Object.values(balanceMap[product.id] ?? {}).reduce((s, v) => s + v, 0);
      currentBalanceByProduct[product.id] = locTotal + (exhibitorByProduct[product.id] ?? 0);
    }

    const restockSuggestions = Array.from(outByProductMap.entries())
      .map(([productId, v]) => {
        const currentQty = currentBalanceByProduct[productId] ?? 0;
        return {
          productId,
          productName: v.name,
          outQty: v.outQty,
          currentQty,
          needsRestock: currentQty < RESTOCK_MINIMUM,
          suggestedQty: v.outQty,
        };
      })
      .filter((r) => r.needsRestock)
      .sort((a, b) => a.currentQty - b.currentQty);

    return NextResponse.json({
      period: { from: from.toISOString(), to: toEnd.toISOString() },
      summary: { totalMovements: movements.length, totalIn, totalOut, totalTransferIn, totalTransferOut, totalAdjustment },
      byProductMovements,
      byLocation,
      currentPosition,
      movements: movementsList,
      exhibitorReport: {
        totalExhibitors: exhibitorsInPeriod.length,
        productTotals: exhibitorProductTotals,
        byClient: exhibitorByClient,
      },
      salesStockReport: {
        productTotals: salesProductTotals,
        byClient: salesByClient,
      },
      restockSuggestions,
      restockMinimum: RESTOCK_MINIMUM,
    });
  } catch (error) {
    console.error("GET /api/reports/stock error:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório de estoque." }, { status: 500 });
  }
}
