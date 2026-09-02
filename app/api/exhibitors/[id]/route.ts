import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { ExhibitorStatus, ExhibitorType } from "@prisma/client";

function getIdFromRequest(request: Request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || null;
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseStatus(value: unknown) {
  if (typeof value !== "string") return undefined;
  return Object.values(ExhibitorStatus).includes(value as ExhibitorStatus)
    ? (value as ExhibitorStatus)
    : undefined;
}

function parseType(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  return Object.values(ExhibitorType).includes(value as ExhibitorType)
    ? (value as ExhibitorType)
    : undefined;
}

function parseProductQuantities(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;

  const quantities = new Map<string, number>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const productId = String((item as { productId?: unknown }).productId ?? "");
    const quantity = Number((item as { quantity?: unknown }).quantity);

    if (!/^[0-9a-fA-F-]{36}$/.test(productId)) return null;
    if (!Number.isFinite(quantity) || quantity < 0) return null;

    quantities.set(productId, Math.trunc(quantity));
  }

  return Array.from(quantities.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function GET(request: Request) {
  try {
    const id = getIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { error: "ID do expositor não recebido" },
        { status: 400 }
      );
    }

    const exhibitor = await prisma.exhibitor.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        maintenances: {
          orderBy: {
            performedAt: "desc",
          },
        },
        stocks: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        initialItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!exhibitor) {
      return NextResponse.json(
        { error: "Expositor não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: exhibitor.id,
      name: exhibitor.name,
      code: exhibitor.code,
      model: exhibitor.model,
      status: exhibitor.status,
      type: exhibitor.type,
      installedAt: exhibitor.installedAt,
      lastVisitAt: exhibitor.lastVisitAt,
      nextVisitAt: exhibitor.nextVisitAt,
      notes: exhibitor.notes,
      initialStockNote: exhibitor.initialStockNote,

      client: exhibitor.client
        ? {
            id: exhibitor.client.id,
            name: exhibitor.client.name,
            city: exhibitor.client.city,
            state: exhibitor.client.state,
            phone: exhibitor.client.phone,
            email: exhibitor.client.email,
          }
        : null,

      region: exhibitor.region
        ? {
            id: exhibitor.region.id,
            name: exhibitor.region.name,
          }
        : null,

      products: Array.isArray(exhibitor.stocks)
        ? exhibitor.stocks.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  sku: item.product.sku,
                }
              : null,
          }))
        : [],

      initialItems: Array.isArray(exhibitor.initialItems)
        ? exhibitor.initialItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  sku: item.product.sku,
                }
              : null,
          }))
        : [],

      maintenances: Array.isArray(exhibitor.maintenances)
        ? exhibitor.maintenances.map((maintenance) => ({
            id: maintenance.id,
            status: maintenance.type,
            createdAt:
              maintenance.performedAt ?? maintenance.createdAt ?? null,
            notes: maintenance.notes,
          }))
        : [],
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Erro ao buscar expositor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (authUser.role !== "ADMIN" && authUser.role !== "REPRESENTATIVE") {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const id = getIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { error: "ID do expositor não recebido" },
        { status: 400 }
      );
    }

    const existing = await prisma.exhibitor.findUnique({
      where: { id },
      select: {
        id: true,
        regionId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Expositor não encontrado" },
        { status: 404 }
      );
    }

    if (
      authUser.role === "REPRESENTATIVE" &&
      (!authUser.regionId || existing.regionId !== authUser.regionId)
    ) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const status = parseStatus(body.status);
    const type = parseType(body.type);
    const installedAt = parseOptionalDate(body.installedAt);
    const nextVisitAt = parseOptionalDate(body.nextVisitAt);
    const hasRemovedAt = Object.prototype.hasOwnProperty.call(body, "removedAt");
    const removedAt = hasRemovedAt ? parseOptionalDate(body.removedAt) : undefined;
    const productQuantities = parseProductQuantities(body.products);

    if (body.status && !status) {
      return NextResponse.json(
        { error: "Status do expositor inválido." },
        { status: 400 }
      );
    }

    if (body.type !== undefined && type === undefined) {
      return NextResponse.json(
        { error: "Tipo do expositor inválido." },
        { status: 400 }
      );
    }

    if (
      installedAt === undefined ||
      nextVisitAt === undefined ||
      (hasRemovedAt && removedAt === undefined)
    ) {
      return NextResponse.json(
        { error: "Uma das datas informadas está inválida." },
        { status: 400 }
      );
    }

    if (productQuantities === null) {
      return NextResponse.json(
        { error: "Produtos do expositor inválidos." },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exhibitor = await tx.exhibitor.update({
        where: { id },
        data: {
          name: cleanText(body.name),
          model: cleanText(body.model),
          notes: cleanText(body.notes),
          initialStockNote: cleanText(body.initialStockNote),
          ...(status ? { status } : {}),
          type,
          installedAt: installedAt ?? undefined,
          nextVisitAt,
          ...(hasRemovedAt ? { removedAt } : {}),
        },
        include: {
          client: true,
          region: true,
        },
      });

      if (productQuantities !== undefined) {
        const productIds = productQuantities.map((item) => item.productId);
        const existingProducts = await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true },
        });
        const existingProductIds = new Set(
          existingProducts.map((product) => product.id)
        );

        if (existingProductIds.size !== productIds.length) {
          throw new Error("Um ou mais produtos do expositor não foram encontrados.");
        }

        await tx.exhibitorStock.deleteMany({
          where: {
            exhibitorId: id,
            productId: {
              notIn: productQuantities
                .filter((item) => item.quantity > 0)
                .map((item) => item.productId),
            },
          },
        });

        await tx.exhibitorInitialItem.deleteMany({
          where: {
            exhibitorId: id,
            productId: {
              notIn: productQuantities
                .filter((item) => item.quantity > 0)
                .map((item) => item.productId),
            },
          },
        });

        for (const item of productQuantities) {
          if (item.quantity <= 0) continue;

          await tx.exhibitorStock.upsert({
            where: {
              exhibitorId_productId: {
                exhibitorId: id,
                productId: item.productId,
              },
            },
            create: {
              exhibitorId: id,
              productId: item.productId,
              quantity: item.quantity,
            },
            update: {
              quantity: item.quantity,
            },
          });

          await tx.exhibitorInitialItem.upsert({
            where: {
              exhibitorId_productId: {
                exhibitorId: id,
                productId: item.productId,
              },
            },
            create: {
              exhibitorId: id,
              productId: item.productId,
              quantity: item.quantity,
            },
            update: {
              quantity: item.quantity,
            },
          });
        }
      }

      return exhibitor;
    }, {
      timeout: 20000,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PUT /api/exhibitors/[id] error:", error);

    return NextResponse.json(
      {
        error: "Erro ao atualizar expositor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
