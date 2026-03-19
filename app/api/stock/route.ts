import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockMovementType } from "@prisma/client";

export async function GET() {
  try {
    const [products, locations, regions, movements, exhibitorStocks] =
      await Promise.all([
        prisma.product.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.stockLocation.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
          },
        }),
        prisma.region.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            stockLocationId: true,
            stockLocation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.stockMovement.findMany({
          select: {
            productId: true,
            stockLocationId: true,
            type: true,
            quantity: true,
          },
        }),
        prisma.exhibitorStock.findMany({
          select: {
            productId: true,
            quantity: true,
            exhibitorId: true,
          },
        }),
      ]);

    const regionStockLocationIds = new Set(
      regions
        .map((region) => region.stockLocationId)
        .filter((value): value is string => Boolean(value))
    );

    const matrixLocation =
      locations.find((location) => !regionStockLocationIds.has(location.id)) ||
      locations.find((location) => location.name.trim().toLowerCase() === "matriz") ||
      locations.find((location) =>
        location.name.trim().toLowerCase().includes("matriz")
      ) ||
      null;

    const balancesByProductLocation: Record<string, Record<string, number>> = {};
    const exhibitorBalanceByProduct: Record<string, number> = {};

    for (const product of products) {
      balancesByProductLocation[product.id] = {};
      exhibitorBalanceByProduct[product.id] = 0;

      for (const location of locations) {
        balancesByProductLocation[product.id][location.id] = 0;
      }
    }

    for (const movement of movements) {
      balancesByProductLocation[movement.productId] ??= {};
      balancesByProductLocation[movement.productId][movement.stockLocationId] ??= 0;

      const qty = movement.quantity ?? 0;

      if (
        movement.type === StockMovementType.IN ||
        movement.type === StockMovementType.TRANSFER_IN
      ) {
        balancesByProductLocation[movement.productId][movement.stockLocationId] += qty;
      }

      if (
        movement.type === StockMovementType.OUT ||
        movement.type === StockMovementType.TRANSFER_OUT
      ) {
        balancesByProductLocation[movement.productId][movement.stockLocationId] -= qty;
      }

      if (movement.type === StockMovementType.ADJUSTMENT) {
        balancesByProductLocation[movement.productId][movement.stockLocationId] = qty;
      }
    }

    for (const item of exhibitorStocks) {
      exhibitorBalanceByProduct[item.productId] =
        (exhibitorBalanceByProduct[item.productId] ?? 0) + (item.quantity ?? 0);
    }

    const columns = [
      ...(matrixLocation
        ? [
            {
              id: `matrix:${matrixLocation.id}`,
              label: "Matriz",
              kind: "MATRIX" as const,
            },
          ]
        : []),
      ...regions.map((region) => ({
        id: `region:${region.id}`,
        label: region.name,
        kind: "REGION" as const,
      })),
      {
        id: "exhibitors",
        label: "Expositores",
        kind: "EXHIBITORS" as const,
      },
    ];

    const result = products.map((product) => {
      const stock: Record<string, number> = {};

      if (matrixLocation) {
        stock[`matrix:${matrixLocation.id}`] =
          balancesByProductLocation[product.id]?.[matrixLocation.id] ?? 0;
      }

      for (const region of regions) {
        stock[`region:${region.id}`] = region.stockLocationId
          ? balancesByProductLocation[product.id]?.[region.stockLocationId] ?? 0
          : 0;
      }

      stock["exhibitors"] = exhibitorBalanceByProduct[product.id] ?? 0;

      return {
        id: product.id,
        name: product.name,
        stock,
        total: Object.values(stock).reduce((sum, value) => sum + (value ?? 0), 0),
      };
    });

    return NextResponse.json({
      locations,
      regions,
      matrixLocationId: matrixLocation?.id ?? null,
      matrixLocationName: matrixLocation?.name ?? null,
      columns,
      exhibitorsStock: exhibitorBalanceByProduct,
      products: result,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Erro ao carregar estoque",
        details: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}