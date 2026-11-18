import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  DefectReturnStatus,
  OrderType,
  PaymentMethod,
  PaymentReceiver,
  PaymentStatus,
  ReceivableStatus,
  ReceiptLocation,
  StockMovementType,
  TransferStatus,
} from "@prisma/client";

// ────────────────────────────────────────────────────────────────────────────
// Helpers compartilhados com a edição
// ────────────────────────────────────────────────────────────────────────────

type OrderItemInput = {
  productId: string;
  qty: number;
  unitCents?: number | null;
};

type DefectReturnItemInput = {
  productId: string;
  quantity: number;
  reason?: string | null;
  notes?: string | null;
};

function isValidUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function toInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function isValidDate(value: unknown) {
  if (!value) return false;
  const d = new Date(String(value));
  return !Number.isNaN(d.getTime());
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value ?? "").toUpperCase();
  switch (method) {
    case "CASH":
      return PaymentMethod.CASH;
    case "PIX":
      return PaymentMethod.PIX;
    case "BOLETO":
    case "BANK_SLIP":
      return PaymentMethod.BOLETO;
    case "CARD_DEBIT":
    case "DEBIT":
    case "DEBIT_CARD":
      return PaymentMethod.CARD_DEBIT;
    case "CARD_CREDIT":
    case "CREDIT":
    case "CREDIT_CARD":
      return PaymentMethod.CARD_CREDIT;
    default:
      return PaymentMethod.CASH;
  }
}

function getFinancialRules(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case PaymentMethod.PIX:
      return {
        paymentStatus: PaymentStatus.PAID,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PAID,
        receiptLocation: ReceiptLocation.MATRIX,
        autoCreateReceipt: true,
        autoPaidAt: true,
      };
    case PaymentMethod.CASH:
      return {
        paymentStatus: PaymentStatus.PAID,
        paymentReceiver: PaymentReceiver.REGION,
        receivableStatus: ReceivableStatus.PAID,
        receiptLocation: ReceiptLocation.REGION,
        autoCreateReceipt: true,
        autoPaidAt: true,
      };
    case PaymentMethod.CARD_DEBIT:
      return {
        paymentStatus: PaymentStatus.PAID,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PAID,
        receiptLocation: ReceiptLocation.MATRIX,
        autoCreateReceipt: true,
        autoPaidAt: true,
      };
    case PaymentMethod.BOLETO:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
    case PaymentMethod.CARD_CREDIT:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
    default:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.REGION,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
  }
}

function buildInstallments(params: {
  totalCents: number;
  installmentCount: number;
  installmentDates?: string[];
  firstDueDate?: Date | null;
  defaultStatus: ReceivableStatus;
}) {
  const {
    totalCents,
    installmentCount,
    installmentDates = [],
    firstDueDate,
    defaultStatus,
  } = params;

  const safeCount = Math.max(1, installmentCount);
  const baseValue = Math.floor(totalCents / safeCount);
  const remainder = totalCents % safeCount;

  const installments = [];

  for (let i = 0; i < safeCount; i++) {
    const amountCents = baseValue + (i < remainder ? 1 : 0);
    let dueDate: Date;
    if (installmentDates[i] && isValidDate(installmentDates[i])) {
      dueDate = new Date(installmentDates[i]);
    } else if (firstDueDate) {
      dueDate = addMonths(firstDueDate, i);
    } else {
      dueDate = addMonths(new Date(), i);
    }
    installments.push({
      installmentNumber: i + 1,
      amountCents,
      dueDate,
      status: defaultStatus,
      receivedCents: defaultStatus === ReceivableStatus.PAID ? amountCents : 0,
      paidAt: defaultStatus === ReceivableStatus.PAID ? new Date() : null,
    });
  }

  return installments;
}

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

// ────────────────────────────────────────────────────────────────────────────
// PUT — Editar pedido existente
// Estratégia: dentro de uma única transação, devolve estoque dos itens
// originais, apaga financeiro/recebimentos/movimentos do pedido e recria
// tudo a partir do payload novo, mantendo o mesmo Order (id e número).
// ────────────────────────────────────────────────────────────────────────────
export async function PUT(
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

    if (authUser.role !== "ADMIN" && authUser.role !== "REPRESENTATIVE") {
      return NextResponse.json(
        { error: "Apenas administrador ou representante pode editar pedidos." },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const paymentMethod = normalizePaymentMethod(body.paymentMethod);

    const dueDate =
      body.dueDate && isValidDate(body.dueDate)
        ? new Date(body.dueDate)
        : null;

    const installmentCount = Math.max(1, toInt(body.installmentCount, 1));

    const installmentDates: string[] = Array.isArray(body.installmentDates)
      ? (body.installmentDates as unknown[])
          .map((d) => String(d))
          .filter((d) => isValidDate(d))
      : [];

    const itemsInput = Array.isArray(body.items)
      ? (body.items as OrderItemInput[])
      : [];

    const defectReturnItemsInput = Array.isArray(body.defectReturnItems)
      ? (body.defectReturnItems as DefectReturnItemInput[])
      : [];

    const notes = (body.notes as string | undefined)?.trim() || null;

    if (!itemsInput.length) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item ao pedido." },
        { status: 400 }
      );
    }

    const productIds = itemsInput
      .map((item) => item.productId)
      .filter((pid): pid is string => isValidUuid(pid));

    if (!productIds.length || productIds.length !== itemsInput.length) {
      return NextResponse.json(
        { error: "Há produto(s) inválido(s) no pedido." },
        { status: 400 }
      );
    }

    const defectProductIds = defectReturnItemsInput
      .map((item) => item.productId)
      .filter((pid): pid is string => isValidUuid(pid));

    if (
      defectReturnItemsInput.length > 0 &&
      defectProductIds.length !== defectReturnItemsInput.length
    ) {
      return NextResponse.json(
        { error: "Há produto(s) inválido(s) nas devoluções por defeito." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1) Buscar pedido atual
        const existing = await tx.order.findUnique({
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

        if (!existing) {
          throw new Error("Pedido não encontrado.");
        }

        // Bloquear edição quando NF-e já foi emitida com sucesso
        if (existing.nfeStatus === "AUTHORIZED" || existing.nfeStatus === "ISSUED") {
          throw new Error(
            "Não é possível editar um pedido com NF-e já emitida. Cancele a NF-e antes."
          );
        }

        // Representante só pode editar pedidos da própria região
        if (
          authUser.role === "REPRESENTATIVE" &&
          existing.regionId !== authUser.regionId
        ) {
          throw new Error("Você não pode editar pedidos de outra região.");
        }

        const isDefectExchange = existing.type === OrderType.DEFECT_EXCHANGE;
        const discountCents = isDefectExchange
          ? 0
          : Math.max(0, toInt(body.discountCents, 0));

        // 2) Reverter movimentos de estoque do pedido original
        for (const movement of existing.stockMovements) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_stockLocationId: {
                productId: movement.productId,
                stockLocationId: movement.stockLocationId,
              },
            },
            select: { id: true, quantity: true },
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
              data: { quantity: { increment: movement.quantity } },
            });
          }

          if (
            movement.type === StockMovementType.IN ||
            movement.type === StockMovementType.TRANSFER_IN
          ) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: { quantity: { decrement: movement.quantity } },
            });
          }
        }

        // 3) Apagar dependentes (receipts/transfers/installments/AR/items/etc)
        const receivableIds = existing.accountsReceivables.map((r) => r.id);
        const receiptIdsFromAR = existing.accountsReceivables.flatMap((r) =>
          r.receipts.map((rc) => rc.id)
        );
        const receiptIdsFromOrder = existing.receipts.map((r) => r.id);
        const receiptIds = Array.from(
          new Set([...receiptIdsFromAR, ...receiptIdsFromOrder])
        );

        if (receiptIds.length > 0) {
          await tx.cashTransfer.deleteMany({
            where: { receiptId: { in: receiptIds } },
          });
          await tx.receipt.deleteMany({ where: { id: { in: receiptIds } } });
        }

        if (receivableIds.length > 0) {
          await tx.accountsReceivableInstallment.deleteMany({
            where: { accountsReceivableId: { in: receivableIds } },
          });
          await tx.accountsReceivable.deleteMany({
            where: { id: { in: receivableIds } },
          });
        }

        await tx.financeTransaction.deleteMany({
          where: { orderId: existing.id },
        });
        await tx.stockMovement.deleteMany({
          where: { orderId: existing.id },
        });
        await tx.defectReturnItem.deleteMany({
          where: { orderId: existing.id },
        });
        await tx.orderItem.deleteMany({
          where: { orderId: existing.id },
        });

        // 4) Validar produtos novos
        const allProductIds = [...new Set([...productIds, ...defectProductIds])];

        const products = await tx.product.findMany({
          where: { id: { in: allProductIds } },
          select: {
            id: true,
            name: true,
            priceCents: true,
            commissionCents: true,
            active: true,
            ncm: true,
            cfop: true,
            cst: true,
            icmsRate: true,
            commercialUnit: true,
          },
        });

        if (products.length !== allProductIds.length) {
          throw new Error("Um ou mais produtos não foram encontrados.");
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        let subtotalCents = 0;
        let commissionTotalCents = 0;

        const normalizedItems = itemsInput.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) throw new Error("Produto inválido encontrado.");
          if (!product.active)
            throw new Error(`O produto "${product.name}" está inativo.`);

          const qty = Math.max(1, toInt(item.qty, 0));
          const unitCents = isDefectExchange
            ? 0
            : item.unitCents != null
            ? Math.max(0, toInt(item.unitCents, 0))
            : Math.max(0, product.priceCents);

          subtotalCents += qty * unitCents;
          if (!isDefectExchange) {
            commissionTotalCents += qty * (product.commissionCents ?? 0);
          }

          return {
            productId: product.id,
            qty,
            unitCents,
            productName: product.name,
            ncm: product.ncm,
            cfop: product.cfop || "5104",
            cst: product.cst || "200",
            icmsRate: product.icmsRate ?? 17,
            unit: product.commercialUnit || "QU",
          };
        });

        const normalizedDefectReturnItems = defectReturnItemsInput.map(
          (item) => {
            const product = productMap.get(item.productId);
            if (!product)
              throw new Error(
                "Produto inválido encontrado na devolução por defeito."
              );
            if (!product.active)
              throw new Error(
                `O produto devolvido "${product.name}" está inativo.`
              );

            const quantity = Math.max(1, toInt(item.quantity, 0));
            return {
              productId: product.id,
              quantity,
              reason: item.reason?.trim() || null,
              notes: item.notes?.trim() || null,
              productName: product.name,
            };
          }
        );

        const totalCents = isDefectExchange
          ? 0
          : Math.max(0, subtotalCents - discountCents);

        // 5) Determinar local de estoque (mantém o do primeiro movimento; se não houver, usa o da região)
        let stockLocationId =
          existing.stockMovements[0]?.stockLocationId ?? null;

        if (!stockLocationId) {
          const region = await tx.region.findUnique({
            where: { id: existing.regionId },
            select: { stockLocationId: true },
          });
          stockLocationId = region?.stockLocationId ?? null;
        }

        if (!stockLocationId) {
          throw new Error(
            "Não foi possível determinar o local de estoque do pedido."
          );
        }

        // Garante saldos para os produtos
        for (const productId of productIds) {
          await tx.stockBalance.upsert({
            where: {
              productId_stockLocationId: {
                productId,
                stockLocationId,
              },
            },
            update: {},
            create: { productId, stockLocationId, quantity: 0 },
          });
        }

        const stockBalances = await tx.stockBalance.findMany({
          where: {
            stockLocationId,
            productId: { in: productIds },
          },
          select: { id: true, productId: true, quantity: true },
        });

        const stockBalanceMap = new Map(
          stockBalances.map((b) => [b.productId, b])
        );

        for (const item of normalizedItems) {
          const balance = stockBalanceMap.get(item.productId);
          if (!balance || balance.quantity < item.qty) {
            throw new Error(
              `Estoque insuficiente para o produto "${item.productName}". Saldo atual: ${
                balance?.quantity ?? 0
              }, solicitado: ${item.qty}.`
            );
          }
        }

        const rules = getFinancialRules(paymentMethod);

        // 6) Atualizar cabeçalho do pedido + recriar itens
        const updatedOrder = await tx.order.update({
          where: { id: existing.id },
          data: {
            paymentMethod: isDefectExchange
              ? PaymentMethod.CASH
              : paymentMethod,
            paymentStatus: isDefectExchange
              ? PaymentStatus.CANCELLED
              : rules.paymentStatus,
            paymentReceiver: isDefectExchange
              ? PaymentReceiver.REGION
              : rules.paymentReceiver,
            commissionTotalCents: isDefectExchange ? 0 : commissionTotalCents,
            status: isDefectExchange
              ? "DEFECT_EXCHANGE"
              : rules.paymentStatus === PaymentStatus.PAID
              ? "PAID"
              : "PENDING",
            subtotalCents: isDefectExchange ? 0 : subtotalCents,
            discountCents,
            totalCents,
            notes,
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                qty: item.qty,
                unitCents: item.unitCents,
                ncm: item.ncm,
                cfop: item.cfop,
                cst: item.cst,
                icmsRate: item.icmsRate,
                unit: item.unit,
              })),
            },
            ...(normalizedDefectReturnItems.length > 0
              ? {
                  defectReturnItems: {
                    create: normalizedDefectReturnItems.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                      reason: item.reason,
                      notes: item.notes,
                      status: DefectReturnStatus.PENDING_REGION,
                      returnedAt: new Date(),
                    })),
                  },
                }
              : {}),
          },
          include: { items: true, defectReturnItems: true },
        });

        // 7) Recriar movimentos de estoque + decrementar saldos
        for (const item of normalizedItems) {
          const balance = stockBalanceMap.get(item.productId)!;

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              stockLocationId,
              orderId: updatedOrder.id,
              exhibitorId: existing.exhibitorId ?? null,
              type: StockMovementType.OUT,
              quantity: item.qty,
              note: isDefectExchange
                ? `Saída por troca por defeito PED-${String(
                    updatedOrder.number
                  ).padStart(4, "0")} (edição)`
                : `Saída por pedido PED-${String(updatedOrder.number).padStart(
                    4,
                    "0"
                  )} (edição)`,
            },
          });

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: { quantity: { decrement: item.qty } },
          });
        }

        if (isDefectExchange) {
          return { order: updatedOrder, accountsReceivable: null, receipt: null };
        }

        // 8) Recriar contas a receber + parcelas + recibos
        const accountsReceivable = await tx.accountsReceivable.create({
          data: {
            orderId: updatedOrder.id,
            clientId: existing.clientId,
            sellerId: existing.sellerId ?? null,
            regionId: existing.regionId,
            paymentMethod,
            status: rules.receivableStatus,
            amountCents: totalCents,
            receivedCents: rules.autoCreateReceipt ? totalCents : 0,
            dueDate,
            paidAt: rules.autoPaidAt ? new Date() : null,
            installmentCount,
            notes:
              paymentMethod === PaymentMethod.PIX
                ? "Recebimento automático por PIX (após edição)."
                : paymentMethod === PaymentMethod.CASH
                ? "Recebimento registrado em dinheiro na região (após edição)."
                : paymentMethod === PaymentMethod.CARD_DEBIT
                ? "Recebimento automático por cartão de débito (após edição)."
                : paymentMethod === PaymentMethod.BOLETO
                ? "Conta a receber gerada por boleto (após edição)."
                : paymentMethod === PaymentMethod.CARD_CREDIT
                ? "Conta a receber gerada por cartão de crédito (após edição)."
                : null,
          },
        });

        const installments = buildInstallments({
          totalCents,
          installmentCount,
          installmentDates,
          firstDueDate: dueDate,
          defaultStatus: rules.receivableStatus,
        });

        if (installments.length) {
          await tx.accountsReceivableInstallment.createMany({
            data: installments.map((item) => ({
              accountsReceivableId: accountsReceivable.id,
              installmentNumber: item.installmentNumber,
              amountCents: item.amountCents,
              dueDate: item.dueDate,
              paidAt: item.paidAt,
              receivedCents: item.receivedCents,
              status: item.status,
            })),
          });
        }

        let receipt = null;

        if (rules.autoCreateReceipt && rules.receiptLocation) {
          receipt = await tx.receipt.create({
            data: {
              accountsReceivableId: accountsReceivable.id,
              orderId: updatedOrder.id,
              regionId: existing.regionId,
              receivedById: existing.sellerId ?? null,
              amountCents: totalCents,
              paymentMethod,
              receivedAt: new Date(),
              location: rules.receiptLocation,
              notes:
                paymentMethod === PaymentMethod.PIX
                  ? "Recebimento automático via PIX instantâneo (após edição)."
                  : paymentMethod === PaymentMethod.CASH
                  ? "Recebimento em dinheiro retido na região até repasse (após edição)."
                  : paymentMethod === PaymentMethod.CARD_DEBIT
                  ? "Recebimento automático por cartão de débito (após edição)."
                  : null,
            },
          });

          if (paymentMethod === PaymentMethod.CASH) {
            await tx.cashTransfer.create({
              data: {
                receiptId: receipt.id,
                regionId: existing.regionId,
                transferredById: null,
                amountCents: totalCents,
                status: TransferStatus.PENDING,
                notes: "Aguardando repasse da região para a matriz (após edição).",
              },
            });
          }
        }

        return { order: updatedOrder, accountsReceivable, receipt };
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );

    return NextResponse.json({
      ok: true,
      message: "Pedido atualizado com sucesso.",
      order: result.order,
      accountsReceivable: result.accountsReceivable,
      receipt: result.receipt,
    });
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar pedido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}