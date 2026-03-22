import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PortalOrderRequestStatus } from "@prisma/client";

type RequestItemInput = {
  productId?: string;
  quantity?: number;
};

type RequestBodyInput = {
  notes?: string;
  items?: RequestItemInput[];
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeQuantity(value: unknown) {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numberValue)) return 0;

  return Math.floor(numberValue);
}

async function getPortalClientIdFromCookies() {
  const cookieStore = await cookies();

  const possibleCookieNames = [
    "portal_session",
    "portalClientId",
    "portal_client_id",
    "clientId",
    "portal-client-id",
    "portal_session_client_id",
  ];

  for (const cookieName of possibleCookieNames) {
    const value = cookieStore.get(cookieName)?.value?.trim();
    if (value) return value;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const clientId = await getPortalClientIdFromCookies();

    if (!clientId) {
      return NextResponse.json(
        {
          error: "Cliente do portal não autenticado.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RequestBodyInput;

    const rawItems = Array.isArray(body?.items) ? body.items : [];
    const notes = normalizeString(body?.notes);

    const normalizedItems = rawItems
      .map((item) => ({
        productId: normalizeString(item?.productId),
        quantity: normalizeQuantity(item?.quantity),
      }))
      .filter((item) => item.productId && item.quantity > 0);

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        {
          error: "Informe ao menos um produto com quantidade maior que zero.",
        },
        { status: 400 }
      );
    }

    const groupedItemsMap = new Map<string, number>();

    for (const item of normalizedItems) {
      const currentQty = groupedItemsMap.get(item.productId) ?? 0;
      groupedItemsMap.set(item.productId, currentQty + item.quantity);
    }

    const groupedItems = Array.from(groupedItemsMap.entries()).map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      })
    );

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        active: true,
        portalEnabled: true,
        regionId: true,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          error: "Cliente do portal não encontrado.",
        },
        { status: 404 }
      );
    }

    if (!client.active) {
      return NextResponse.json(
        {
          error: "Cliente inativo.",
        },
        { status: 403 }
      );
    }

    if (!client.portalEnabled) {
      return NextResponse.json(
        {
          error: "Acesso ao portal não habilitado para este cliente.",
        },
        { status: 403 }
      );
    }

    const productIds = groupedItems.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        active: true,
      },
      select: {
        id: true,
      },
    });

    const validProductIds = new Set(products.map((product) => product.id));

    const invalidItems = groupedItems.filter(
      (item) => !validProductIds.has(item.productId)
    );

    if (invalidItems.length > 0) {
      return NextResponse.json(
        {
          error: "Um ou mais produtos informados são inválidos ou estão inativos.",
          invalidProductIds: invalidItems.map((item) => item.productId),
        },
        { status: 400 }
      );
    }

    const createdRequest = await prisma.portalOrderRequest.create({
      data: {
        clientId: client.id,
        regionId: client.regionId ?? null,
        status: PortalOrderRequestStatus.PENDING,
        notes: notes || null,
        items: {
          create: groupedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                priceCents: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const subtotalCents = createdRequest.items.reduce((acc, item) => {
      return acc + item.quantity * (item.product.priceCents ?? 0);
    }, 0);

    return NextResponse.json(
      {
        success: true,
        request: {
          id: createdRequest.id,
          status: createdRequest.status,
          createdAt: createdRequest.createdAt,
          notes: createdRequest.notes,
          client: createdRequest.client,
          subtotalCents,
          items: createdRequest.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            product: {
              id: item.product.id,
              sku: item.product.sku,
              name: item.product.name,
              category: item.product.category,
              priceCents: item.product.priceCents,
            },
            lineTotalCents: item.quantity * (item.product.priceCents ?? 0),
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar pedido do portal:", error);

    return NextResponse.json(
      {
        error: "Não foi possível enviar o pedido do cliente.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const clientId = await getPortalClientIdFromCookies();

    if (!clientId) {
      return NextResponse.json(
        {
          error: "Cliente do portal não autenticado.",
        },
        { status: 401 }
      );
    }

    const requests = await prisma.portalOrderRequest.findMany({
      where: {
        clientId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                sku: true,
                name: true,
                category: true,
                priceCents: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = requests.map((requestItem) => {
      const subtotalCents = requestItem.items.reduce((acc, item) => {
        return acc + item.quantity * (item.product.priceCents ?? 0);
      }, 0);

      return {
        id: requestItem.id,
        status: requestItem.status,
        createdAt: requestItem.createdAt,
        notes: requestItem.notes,
        subtotalCents,
        items: requestItem.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            category: item.product.category,
            priceCents: item.product.priceCents,
          },
          lineTotalCents: item.quantity * (item.product.priceCents ?? 0),
        })),
      };
    });

    return NextResponse.json({
      requests: data,
    });
  } catch (error) {
    console.error("Erro ao listar pedidos do portal:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os pedidos do cliente.",
      },
      { status: 500 }
    );
  }
}