import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  OrderType,
  PaymentMethod,
  PaymentReceiver,
  PaymentStatus,
  ReceivableStatus,
  ReceiptLocation,
  StockMovementType,
  TransferStatus,
} from "@prisma/client";

type ReturnRequestItem = {
  productId?: string;
  returnQty?: number;
  sellQty?: number;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isValidUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function toInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: exhibitorId } = await context.params;

    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    if (!isValidUuid(exhibitorId)) {
      return NextResponse.json(
        { error: "ID do expositor inválido." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const itemsInput: ReturnRequestItem[] = Array.isArray(body?.items)
      ? body.items
      : [];

    if (!itemsInput.length) {
      return NextResponse.json(
        { error: "Nenhum item informado para a operação." },
        { status: 400 }
      );
    }

    const normalizedItems = itemsInput
      .map((item) => ({
        productId: String(item.productId ?? ""),
        returnQty: Math.max(0, toInt(item.returnQty, 0)),
        sellQty: Math.max(0, toInt(item.sellQty, 0)),
      }))
      .filter((item) => item.returnQty > 0 || item.sellQty > 0);

    if (!normalizedItems.length) {
      return NextResponse.json(
        { error: "Informe ao menos uma quantidade para devolver ou vender." },
        { status: 400 }
      );
    }

    const invalidProductId = normalizedItems.find(
      (item) => !isValidUuid(item.productId)
    );

    if (invalidProductId) {
      return NextResponse.json(
        { error: "Há produto(s) inválido(s) na operação." },
        { status: 400 }
      );
    }

    const exhibitor = await prisma.exhibitor.findUnique({
      where: { id: exhibitorId },
      include: {
        client: true,
        region: true,
      },
    });

    if (!exhibitor) {
      return NextResponse.json(
        { error: "Expositor não encontrado." },
        { status: 404 }
      );
    }

    if (
      authUser.role === "REPRESENTATIVE" &&
      authUser.regionId !== exhibitor.regionId
    ) {
      return NextResponse.json(
        { error: "Representante não pertence à região do expositor." },
        { status: 403 }
      );
    }

    const stockLocationId =
      authUser.role === "REPRESENTATIVE"
        ? authUser.stockLocationId || authUser.region?.stockLocationId || null
        : exhibitor.region.stockLocationId;

    if (!stockLocationId) {
      return NextResponse.json(
        { error: "A região do expositor não possui estoque vinculado." },
        { status: 400 }
      );
    }

    if (
      authUser.role === "REPRESENTATIVE" &&
      authUser.stockLocationId &&
      authUser.stockLocationId !== stockLocationId
    ) {
      return NextResponse.json(
        { error: "Representante sem permissão para movimentar este estoque." },
        { status: 403 }
      );
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.productId))];

    const result = await prisma.$transaction(async (tx) => {
      const exhibitorStocks = await tx.exhibitorStock.findMany({
        where: {
          exhibitorId,
          productId: {
            in: productIds,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              priceCents: true,
              active: true,
            },
          },
        },
      });

      const stockMap = new Map(
        exhibitorStocks.map((stock) => [stock.productId, stock])
      );

      for (const item of normalizedItems) {
        const exhibitorStock = stockMap.get(item.productId);

        if (!exhibitorStock) {
          throw new Error("Produto não encontrado no estoque do expositor.");
        }

        if (!exhibitorStock.product.active) {
          throw new Error(
            `O produto "${exhibitorStock.product.name}" está inativo.`
          );
        }

        const totalRequested = item.returnQty + item.sellQty;

        if (totalRequested > exhibitorStock.quantity) {
          throw new Error(
            `Quantidade inválida para "${exhibitorStock.product.name}". Disponível no expositor: ${exhibitorStock.quantity}, informado: ${totalRequested}.`
          );
        }
      }

      const devolvedItems = normalizedItems.filter((item) => item.returnQty > 0);
      const soldItems = normalizedItems.filter((item) => item.sellQty > 0);

      for (const item of devolvedItems) {
        const exhibitorStock = stockMap.get(item.productId)!;

        await tx.exhibitorStock.update({
          where: {
            id: exhibitorStock.id,
          },
          data: {
            quantity: {
              decrement: item.returnQty,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId,
            exhibitorId,
            type: StockMovementType.IN,
            quantity: item.returnQty,
            note: `Devolução de produto do expositor ${exhibitor.code || exhibitor.name || exhibitor.id}`,
          },
        });

        await tx.stockBalance.upsert({
          where: {
            productId_stockLocationId: {
              productId: item.productId,
              stockLocationId,
            },
          },
          update: {
            quantity: {
              increment: item.returnQty,
            },
          },
          create: {
            productId: item.productId,
            stockLocationId,
            quantity: item.returnQty,
          },
        });
      }

      let order = null;
      let accountsReceivable = null;
      let receipt = null;

      if (soldItems.length > 0) {
        const subtotalCents = soldItems.reduce((sum, item) => {
          const exhibitorStock = stockMap.get(item.productId)!;
          return sum + item.sellQty * exhibitorStock.product.priceCents;
        }, 0);

        order = await tx.order.create({
          data: {
            regionId: exhibitor.regionId,
            clientId: exhibitor.clientId,
            exhibitorId,
            sellerId: authUser.id,
            type: OrderType.SALE,
            financialMovement: true,
            paymentMethod: PaymentMethod.CASH,
            paymentReceiver: PaymentReceiver.REGION,
            paymentStatus: PaymentStatus.PAID,
            status: "PAID",
            issuedAt: new Date(),
            subtotalCents,
            discountCents: 0,
            totalCents: subtotalCents,
            notes: `Venda registrada a partir da retirada do expositor ${exhibitor.code || exhibitor.name || exhibitor.id}.`,
            items: {
              create: soldItems.map((item) => {
                const exhibitorStock = stockMap.get(item.productId)!;

                return {
                  productId: item.productId,
                  qty: item.sellQty,
                  unitCents: exhibitorStock.product.priceCents,
                };
              }),
            },
          },
        });

        for (const item of soldItems) {
          const exhibitorStock = stockMap.get(item.productId)!;

          await tx.exhibitorStock.update({
            where: {
              id: exhibitorStock.id,
            },
            data: {
              quantity: {
                decrement: item.sellQty,
              },
            },
          });
        }

        accountsReceivable = await tx.accountsReceivable.create({
          data: {
            orderId: order.id,
            clientId: exhibitor.clientId,
            sellerId: authUser.id,
            regionId: exhibitor.regionId,
            paymentMethod: PaymentMethod.CASH,
            status: ReceivableStatus.PAID,
            amountCents: subtotalCents,
            receivedCents: subtotalCents,
            dueDate: new Date(),
            paidAt: new Date(),
            installmentCount: 1,
            notes: "Recebimento automático da venda realizada a partir do expositor.",
          },
        });

        await tx.accountsReceivableInstallment.create({
          data: {
            accountsReceivableId: accountsReceivable.id,
            installmentNumber: 1,
            amountCents: subtotalCents,
            dueDate: new Date(),
            paidAt: new Date(),
            installmentCount: 1,
            receivedCents: subtotalCents,
            status: ReceivableStatus.PAID,
            notes: "Parcela única da venda do expositor.",
          },
        });

        receipt = await tx.receipt.create({
          data: {
            accountsReceivableId: accountsReceivable.id,
            orderId: order.id,
            regionId: exhibitor.regionId,
            receivedById: authUser.id,
            amountCents: subtotalCents,
            paymentMethod: PaymentMethod.CASH,
            receivedAt: new Date(),
            location: ReceiptLocation.REGION,
            notes: "Recebimento automático em dinheiro da venda do expositor.",
          },
        });

        await tx.cashTransfer.create({
          data: {
            receiptId: receipt.id,
            regionId: exhibitor.regionId,
            transferredById: null,
            amountCents: subtotalCents,
            status: TransferStatus.PENDING,
            notes: "Aguardando repasse da região para a matriz.",
          },
        });
      }

      return {
        order,
        accountsReceivable,
        receipt,
      };
    });

    return NextResponse.json({
      ok: true,
      message: "Operação registrada com sucesso.",
      order: result.order,
      accountsReceivable: result.accountsReceivable,
      receipt: result.receipt,
    });
  } catch (error) {
    console.error("POST /api/exhibitors/[id]/return error:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao registrar devolução.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}