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

const VALID_PAYMENT_METHODS = [
  "CASH",
  "PIX",
  "BOLETO",
  "CARD_DEBIT",
  "CARD_CREDIT",
] as const;

const VALID_PAYMENT_RECEIVERS = ["REGION", "MATRIX"] as const;

export async function PATCH(
  request: Request,
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

    if (authUser.role !== "ADMIN" && authUser.role !== "ADMINISTRATIVE") {
      return NextResponse.json(
        { error: "Apenas administrador ou financeiro pode editar pedidos." },
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

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Body inválido." },
        { status: 400 }
      );
    }

    const paymentMethod =
      typeof body.paymentMethod === "string" &&
      (VALID_PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod)
        ? body.paymentMethod
        : undefined;

    const paymentReceiver =
      typeof body.paymentReceiver === "string" &&
      (VALID_PAYMENT_RECEIVERS as readonly string[]).includes(
        body.paymentReceiver
      )
        ? body.paymentReceiver
        : undefined;

    const notes =
      typeof body.notes === "string" ? body.notes : undefined;

    const installments = Array.isArray(body.installments)
      ? body.installments
      : [];

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          accountsReceivables: {
            include: { installments: true },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      const orderUpdate: Record<string, unknown> = {};
      if (paymentMethod !== undefined) orderUpdate.paymentMethod = paymentMethod;
      if (paymentReceiver !== undefined)
        orderUpdate.paymentReceiver = paymentReceiver;
      if (notes !== undefined) orderUpdate.notes = notes;

      if (Object.keys(orderUpdate).length > 0) {
        await tx.order.update({
          where: { id },
          data: orderUpdate,
        });
      }

      if (
        paymentMethod !== undefined &&
        order.accountsReceivables.length > 0
      ) {
        await tx.accountsReceivable.updateMany({
          where: { orderId: id },
          data: { paymentMethod: paymentMethod as any },
        });
      }

      const allInstallments = order.accountsReceivables.flatMap(
        (r) => r.installments
      );

      for (const inst of installments) {
        if (!inst || typeof inst.id !== "string") continue;

        const existing = allInstallments.find((i) => i.id === inst.id);
        if (!existing) continue;
        if (existing.status === "PAID") continue;

        const update: Record<string, unknown> = {};

        if (typeof inst.dueDate === "string" && inst.dueDate.trim()) {
          const d = new Date(inst.dueDate);
          if (!Number.isNaN(d.getTime())) {
            update.dueDate = d;
          }
        }

        if (
          typeof inst.amountCents === "number" &&
          Number.isFinite(inst.amountCents) &&
          inst.amountCents >= 0
        ) {
          update.amountCents = Math.round(inst.amountCents);
        }

        if (Object.keys(update).length === 0) continue;

        await tx.accountsReceivableInstallment.update({
          where: { id: inst.id },
          data: update,
        });
      }

      for (const ar of order.accountsReceivables) {
        const refreshed = await tx.accountsReceivableInstallment.findMany({
          where: { accountsReceivableId: ar.id },
          select: { amountCents: true },
        });
        const total = refreshed.reduce(
          (acc, x) => acc + (x.amountCents ?? 0),
          0
        );
        await tx.accountsReceivable.update({
          where: { id: ar.id },
          data: { amountCents: total },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      message: "Pedido atualizado com sucesso.",
    });
  } catch (error) {
    console.error("PATCH /api/orders/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar pedido.";
    return NextResponse.json({ error: message }, { status: 500 });
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