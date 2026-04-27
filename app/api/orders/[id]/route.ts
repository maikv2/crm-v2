import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { StockMovementType } from "@prisma/client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            region: true,
          },
        },
        region: true,
        seller: true,
        items: {
          include: {
            product: true,
          },
        },
        defectReturnItems: {
          include: {
            product: true,
          },
        },
        accountsReceivables: {
          include: {
            installments: true,
            receipts: {
              include: {
                transfers: true,
              },
            },
          },
        },
        receipts: {
          include: {
            transfers: true,
          },
        },
        stockMovements: true,
        financeTransactions: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar pedido." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administrador pode excluir pedidos." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: { id },
          include: {
            items: true,
            defectReturnItems: true,
            stockMovements: true,
            accountsReceivables: {
              include: {
                receipts: {
                  include: {
                    transfers: true,
                  },
                },
                installments: true,
              },
            },
            receipts: {
              include: {
                transfers: true,
              },
            },
            financeTransactions: true,
          },
        });

        if (!order) {
          throw new Error("Pedido não encontrado.");
        }

        for (const movement of order.stockMovements) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_stockLocationId: {
                productId: movement.productId,
                stockLocationId: movement.stockLocationId,
              },
            },
            select: {
              id: true,
              quantity: true,
            },
          });

          if (!balance) {
            await tx.stockBalance.create({
              data: {
                productId: movement.productId,
                stockLocationId: movement.stockLocationId,
                quantity:
                  movement.type === StockMovementType.OUT ||
                  movement.type === StockMovementType.TRANSFER_OUT
                    ? movement.quantity
                    : 0,
              },
            });

            continue;
          }

          if (
            movement.type === StockMovementType.OUT ||
            movement.type === StockMovementType.TRANSFER_OUT
          ) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                quantity: {
                  increment: movement.quantity,
                },
              },
            });
          }

          if (
            movement.type === StockMovementType.IN ||
            movement.type === StockMovementType.TRANSFER_IN
          ) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: {
                quantity: {
                  decrement: movement.quantity,
                },
              },
            });
          }
        }

        const receivableIds = order.accountsReceivables.map((item) => item.id);
        const receiptIdsFromReceivables = order.accountsReceivables.flatMap(
          (item) => item.receipts.map((receipt) => receipt.id)
        );
        const receiptIdsFromOrder = order.receipts.map((receipt) => receipt.id);
        const receiptIds = Array.from(
          new Set([...receiptIdsFromReceivables, ...receiptIdsFromOrder])
        );

        if (receiptIds.length > 0) {
          await tx.cashTransfer.deleteMany({
            where: {
              receiptId: {
                in: receiptIds,
              },
            },
          });
        }

        if (receiptIds.length > 0) {
          await tx.receipt.deleteMany({
            where: {
              id: {
                in: receiptIds,
              },
            },
          });
        }

        if (receivableIds.length > 0) {
          await tx.accountsReceivableInstallment.deleteMany({
            where: {
              accountsReceivableId: {
                in: receivableIds,
              },
            },
          });

          await tx.accountsReceivable.deleteMany({
            where: {
              id: {
                in: receivableIds,
              },
            },
          });
        }

        await tx.financeTransaction.deleteMany({
          where: {
            orderId: order.id,
          },
        });

        await tx.stockMovement.deleteMany({
          where: {
            orderId: order.id,
          },
        });

        await tx.defectReturnItem.deleteMany({
          where: {
            orderId: order.id,
          },
        });

        await tx.orderItem.deleteMany({
          where: {
            orderId: order.id,
          },
        });

        await tx.order.delete({
          where: {
            id: order.id,
          },
        });

        return {
          deletedOrderId: order.id,
          deletedOrderNumber: order.number,
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return NextResponse.json({
      ok: true,
      message: "Pedido excluído definitivamente com sucesso.",
      order: result,
    });
  } catch (error) {
    console.error("DELETE /api/orders/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao excluir pedido.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}