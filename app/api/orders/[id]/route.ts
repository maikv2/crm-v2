import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import {
  ExternalPaymentStatus,
  PaymentMethod,
  PaymentReceiver,
  PaymentStatus,
  ReceiptLocation,
  ReceivableStatus,
  StockMovementType,
} from "@prisma/client";
import { recomputeOrderPaymentStatus } from "@/lib/receivables";

type OrderItemPatchInput = {
  productId: string;
  qty: number;
  unitCents?: number | null;
};

type PaymentSplitPatchInput = {
  id?: string;
  paymentMethod?: string;
  amountCents?: number;
  dueDate?: string;
  installmentCount?: number;
  installmentDates?: string[];
};

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
        externalPayments: true,
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

function isValidUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function toInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function getFinancialRules(paymentMethod: PaymentMethod) {
  switch (paymentMethod) {
    case PaymentMethod.PIX:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null as ReceiptLocation | null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
    case PaymentMethod.CASH:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.REGION,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null as ReceiptLocation | null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
    case PaymentMethod.CARD_DEBIT:
      return {
        paymentStatus: PaymentStatus.PAID,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PAID,
        receiptLocation: ReceiptLocation.MATRIX as ReceiptLocation | null,
        autoCreateReceipt: true,
        autoPaidAt: true,
      };
    case PaymentMethod.BOLETO:
    case PaymentMethod.CARD_CREDIT:
    default:
      return {
        paymentStatus: PaymentStatus.PENDING,
        paymentReceiver: PaymentReceiver.MATRIX,
        receivableStatus: ReceivableStatus.PENDING,
        receiptLocation: null as ReceiptLocation | null,
        autoCreateReceipt: false,
        autoPaidAt: false,
      };
  }
}

function dateFromInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function distributeInstallments(totalCents: number, count: number) {
  const safeCount = Math.max(1, count);
  const base = Math.floor(totalCents / safeCount);
  const remainder = totalCents % safeCount;
  return Array.from({ length: safeCount }, (_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

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

    const paymentReceiver =
      typeof body.paymentReceiver === "string" &&
      (VALID_PAYMENT_RECEIVERS as readonly string[]).includes(
        body.paymentReceiver
      )
        ? (body.paymentReceiver as PaymentReceiver)
        : undefined;

    const notes = typeof body.notes === "string" ? body.notes : undefined;
    const hasItemsPatch = Array.isArray(body.items);
    const itemsInput = hasItemsPatch ? (body.items as OrderItemPatchInput[]) : [];
    const discountCents =
      typeof body.discountCents === "number" && Number.isFinite(body.discountCents)
        ? Math.max(0, Math.round(body.discountCents))
        : undefined;

    // Divisão de forma de pagamento (ex: parte em dinheiro + parte em
    // boleto). Quando enviado, é a ÚNICA fonte da verdade sobre as
    // AccountsReceivable do pedido — substitui o campo `paymentMethod` solto.
    const hasPaymentsPatch = Array.isArray(body.payments);
    const paymentsPatchInput: PaymentSplitPatchInput[] = hasPaymentsPatch
      ? (body.payments as PaymentSplitPatchInput[])
      : [];

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          region: true,
          items: true,
          stockMovements: true,
          accountsReceivables: {
            include: { installments: true, receipts: true },
          },
        },
      });

      if (!order) {
        throw new Error("Pedido não encontrado.");
      }

      const activeReceivables = order.accountsReceivables.filter(
        (item) => item.status !== ReceivableStatus.CANCELED
      );
      const originalItems = new Map<string, number>();
      for (const item of order.items) {
        originalItems.set(item.productId, (originalItems.get(item.productId) ?? 0) + item.qty);
      }

      let subtotalCents = order.subtotalCents ?? 0;
      let commissionTotalCents = order.commissionTotalCents ?? 0;
      const nextDiscountCents = discountCents ?? order.discountCents ?? 0;
      let totalCents = Math.max(0, subtotalCents - nextDiscountCents);

      if (hasItemsPatch) {
        if (!itemsInput.length) {
          throw new Error("Adicione pelo menos um item ao pedido.");
        }

        const grouped = new Map<string, { productId: string; qty: number; unitCents: number }>();
        for (const item of itemsInput) {
          if (!isValidUuid(item.productId)) {
            throw new Error("Há produto inválido no pedido.");
          }

          const qty = Math.max(1, toInt(item.qty, 0));
          const unitCents =
            item.unitCents != null ? Math.max(0, toInt(item.unitCents, 0)) : 0;
          const existing = grouped.get(item.productId);
          grouped.set(item.productId, {
            productId: item.productId,
            qty: (existing?.qty ?? 0) + qty,
            unitCents,
          });
        }

        const productIds = [...grouped.keys()];
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
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

        if (products.length !== productIds.length) {
          throw new Error("Um ou mais produtos não foram encontrados.");
        }

        const productMap = new Map(products.map((product) => [product.id, product]));
        const normalizedItems = [...grouped.values()].map((item) => {
          const product = productMap.get(item.productId);
          if (!product) throw new Error("Produto inválido encontrado.");
          const alreadyInOrder = originalItems.has(product.id);
          if (!product.active && !alreadyInOrder) {
            throw new Error(`O produto "${product.name}" está inativo.`);
          }
          const unitCents = item.unitCents || product.priceCents || 0;
          return {
            productId: product.id,
            qty: item.qty,
            unitCents,
            productName: product.name,
            ncm: product.ncm,
            cfop: product.cfop || "5104",
            cst: product.cst || "200",
            icmsRate: product.icmsRate ?? 17,
            unit: product.commercialUnit || "QU",
            commissionCents: product.commissionCents ?? 0,
          };
        });

        subtotalCents = normalizedItems.reduce(
          (sum, item) => sum + item.qty * item.unitCents,
          0
        );
        commissionTotalCents = normalizedItems.reduce(
          (sum, item) => sum + item.qty * item.commissionCents,
          0
        );
        totalCents = Math.max(0, subtotalCents - nextDiscountCents);

        const nextItems = new Map<string, number>();
        for (const item of normalizedItems) {
          nextItems.set(item.productId, (nextItems.get(item.productId) ?? 0) + item.qty);
        }

        const stockLocationId =
          order.stockMovements.find(
            (movement) =>
              movement.type === StockMovementType.OUT ||
              movement.type === StockMovementType.IN ||
              movement.type === StockMovementType.ADJUSTMENT
          )?.stockLocationId ?? order.region.stockLocationId;

        if (!stockLocationId) {
          throw new Error("Não foi possível identificar o estoque de origem do pedido.");
        }

        const diffProductIds = [...new Set([...originalItems.keys(), ...nextItems.keys()])];
        for (const productId of diffProductIds) {
          await tx.stockBalance.upsert({
            where: {
              productId_stockLocationId: {
                productId,
                stockLocationId,
              },
            },
            update: {},
            create: {
              productId,
              stockLocationId,
              quantity: 0,
            },
          });
        }

        const balances = await tx.stockBalance.findMany({
          where: { stockLocationId, productId: { in: diffProductIds } },
          select: { id: true, productId: true, quantity: true },
        });
        const balanceMap = new Map(balances.map((balance) => [balance.productId, balance]));

        for (const productId of diffProductIds) {
          const previousQty = originalItems.get(productId) ?? 0;
          const nextQty = nextItems.get(productId) ?? 0;
          const diff = nextQty - previousQty;
          if (diff === 0) continue;

          const balance = balanceMap.get(productId);
          if (!balance) throw new Error("Saldo de estoque não encontrado.");

          if (diff > 0 && balance.quantity < diff) {
            const productName = productMap.get(productId)?.name ?? "produto";
            throw new Error(
              `Estoque insuficiente para o produto "${productName}". Saldo atual: ${balance.quantity}, adicional solicitado: ${diff}.`
            );
          }

          await tx.stockMovement.create({
            data: {
              productId,
              stockLocationId,
              orderId: order.id,
              exhibitorId: order.exhibitorId ?? null,
              type: diff > 0 ? StockMovementType.OUT : StockMovementType.IN,
              quantity: Math.abs(diff),
              note: `Ajuste por edição do pedido PED-${String(order.number).padStart(4, "0")}.`,
            },
          });

          await tx.stockBalance.update({
            where: { id: balance.id },
            data: {
              quantity:
                diff > 0
                  ? { decrement: diff }
                  : { increment: Math.abs(diff) },
            },
          });
        }

        await tx.orderItem.deleteMany({ where: { orderId: order.id } });
        await tx.orderItem.createMany({
          data: normalizedItems.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            qty: item.qty,
            unitCents: item.unitCents,
            ncm: item.ncm,
            cfop: item.cfop,
            cst: item.cst,
            icmsRate: item.icmsRate,
            unit: item.unit,
          })),
        });
      } else if (discountCents !== undefined) {
        totalCents = Math.max(0, subtotalCents - nextDiscountCents);
      }

      // Se itens/desconto mudaram o total do pedido, mas ninguém mandou a
      // divisão de pagamento atualizada, não dá pra saber como redistribuir
      // o novo total entre as formas de pagamento existentes — melhor pedir
      // explicitamente do que deixar `AccountsReceivable.amountCents`
      // desatualizado em relação ao pedido.
      if (
        !hasPaymentsPatch &&
        (hasItemsPatch || discountCents !== undefined) &&
        totalCents !== (order.totalCents ?? 0) &&
        activeReceivables.length > 0
      ) {
        throw new Error(
          "Este pedido já tem forma de pagamento configurada. Ao alterar itens ou desconto, envie também a divisão de forma de pagamento atualizada."
        );
      }

      const orderUpdate: Record<string, unknown> = {};
      if (notes !== undefined) orderUpdate.notes = notes;
      if (hasItemsPatch || discountCents !== undefined) {
        orderUpdate.subtotalCents = subtotalCents;
        orderUpdate.discountCents = nextDiscountCents;
        orderUpdate.totalCents = totalCents;
        orderUpdate.commissionTotalCents = commissionTotalCents;
      }
      if (paymentReceiver !== undefined && !hasPaymentsPatch) {
        orderUpdate.paymentReceiver = paymentReceiver;
      }

      if (Object.keys(orderUpdate).length > 0) {
        await tx.order.update({
          where: { id },
          data: orderUpdate,
        });
      }

      if (hasPaymentsPatch) {
        if (!paymentsPatchInput.length) {
          throw new Error("Informe ao menos uma forma de pagamento.");
        }

        const normalizedSplits = paymentsPatchInput.map((item) => {
          const method =
            typeof item.paymentMethod === "string" &&
            (VALID_PAYMENT_METHODS as readonly string[]).includes(item.paymentMethod)
              ? (item.paymentMethod as PaymentMethod)
              : undefined;
          if (!method) {
            throw new Error("Forma de pagamento inválida na divisão de pagamento.");
          }
          return {
            id:
              typeof item.id === "string" && isValidUuid(item.id)
                ? item.id
                : undefined,
            paymentMethod: method,
            amountCents: Math.max(0, toInt(item.amountCents, 0)),
            dueDate: dateFromInput(item.dueDate),
            installmentCount: Math.max(1, toInt(item.installmentCount ?? 1, 1)),
            installmentDates: Array.isArray(item.installmentDates)
              ? item.installmentDates.map((d) => String(d))
              : ([] as string[]),
          };
        });

        const splitsSumCents = normalizedSplits.reduce(
          (sum, split) => sum + split.amountCents,
          0
        );
        if (splitsSumCents !== totalCents) {
          throw new Error(
            `A soma das formas de pagamento (${(splitsSumCents / 100).toFixed(
              2
            )}) não bate com o total do pedido (${(totalCents / 100).toFixed(2)}).`
          );
        }
        if (totalCents > 0 && normalizedSplits.some((split) => split.amountCents <= 0)) {
          throw new Error(
            "Cada forma de pagamento na divisão deve ter um valor maior que zero."
          );
        }

        const existingById = new Map(
          activeReceivables.map((item) => [item.id, item])
        );

        // Divisões existentes que não vieram mais na lista: só podem ser
        // canceladas se nada foi recebido nelas (nunca apagamos histórico
        // financeiro — só marcamos como cancelada).
        for (const existing of activeReceivables) {
          const stillPresent = normalizedSplits.some((split) => split.id === existing.id);
          if (stillPresent) continue;

          if ((existing.receivedCents ?? 0) > 0) {
            throw new Error(
              `Não é possível remover a forma de pagamento "${existing.paymentMethod}" pois já há valor recebido nela.`
            );
          }

          await tx.externalPayment.updateMany({
            where: {
              accountsReceivableId: existing.id,
              status: {
                in: [ExternalPaymentStatus.PENDING, ExternalPaymentStatus.OVERDUE],
              },
            },
            data: {
              status: ExternalPaymentStatus.CANCELED,
              canceledAt: new Date(),
              errorMessage: "Cobrança aberta cancelada no CRM por edição do pedido.",
            },
          });
          await tx.accountsReceivableInstallment.updateMany({
            where: { accountsReceivableId: existing.id, status: { not: ReceivableStatus.PAID } },
            data: { status: ReceivableStatus.CANCELED },
          });
          await tx.accountsReceivable.update({
            where: { id: existing.id },
            data: { status: ReceivableStatus.CANCELED },
          });
        }

        for (const split of normalizedSplits) {
          const existing = split.id ? existingById.get(split.id) : undefined;
          const splitRules = getFinancialRules(split.paymentMethod);

          if (existing) {
            const paidCentsForSplit = existing.receivedCents ?? 0;
            if (paidCentsForSplit > split.amountCents) {
              throw new Error(
                `O valor da forma de pagamento "${existing.paymentMethod}" não pode ficar menor do que o já recebido (${(paidCentsForSplit / 100).toFixed(2)}).`
              );
            }

            const existingInstallments = existing.installments.sort(
              (a, b) => a.installmentNumber - b.installmentNumber
            );
            const paidInstallments = existingInstallments.filter(
              (item) => item.status === ReceivableStatus.PAID
            );
            const openInstallments = existingInstallments.filter(
              (item) => item.status !== ReceivableStatus.PAID
            );
            const openTotalCents = Math.max(0, split.amountCents - paidCentsForSplit);
            const defaultAmounts = distributeInstallments(
              openTotalCents,
              split.installmentCount
            );

            await tx.externalPayment.updateMany({
              where: {
                accountsReceivableId: existing.id,
                status: {
                  in: [ExternalPaymentStatus.PENDING, ExternalPaymentStatus.OVERDUE],
                },
              },
              data: {
                status: ExternalPaymentStatus.CANCELED,
                canceledAt: new Date(),
                errorMessage: "Cobrança aberta cancelada no CRM por edição do pedido.",
              },
            });

            const seenOpenIds = new Set<string>();
            for (let index = 0; index < split.installmentCount; index++) {
              const target = openInstallments[index];
              const dueDate =
                dateFromInput(split.installmentDates[index]) ??
                target?.dueDate ??
                (split.dueDate ? addMonths(split.dueDate, index) : addMonths(new Date(), index));
              const amountCents = defaultAmounts[index] ?? 0;

              if (target) {
                seenOpenIds.add(target.id);
                await tx.accountsReceivableInstallment.update({
                  where: { id: target.id },
                  data: {
                    installmentNumber: paidInstallments.length + index + 1,
                    dueDate,
                    amountCents,
                    status: splitRules.receivableStatus,
                  },
                });
              } else {
                await tx.accountsReceivableInstallment.create({
                  data: {
                    accountsReceivableId: existing.id,
                    installmentNumber: paidInstallments.length + index + 1,
                    dueDate,
                    amountCents,
                    status: splitRules.receivableStatus,
                    receivedCents: 0,
                    paidAt: null,
                  },
                });
              }
            }

            const removeIds = openInstallments
              .filter((item) => !seenOpenIds.has(item.id))
              .map((item) => item.id);
            if (removeIds.length) {
              await tx.accountsReceivableInstallment.deleteMany({
                where: { id: { in: removeIds } },
              });
            }

            const refreshed = await tx.accountsReceivableInstallment.findMany({
              where: { accountsReceivableId: existing.id },
              orderBy: { installmentNumber: "asc" },
              select: { status: true, dueDate: true },
            });
            const allPaid =
              refreshed.length > 0 &&
              refreshed.every((item) => item.status === ReceivableStatus.PAID);

            await tx.accountsReceivable.update({
              where: { id: existing.id },
              data: {
                paymentMethod: split.paymentMethod,
                amountCents: split.amountCents,
                installmentCount: refreshed.length || 1,
                dueDate: refreshed[0]?.dueDate ?? split.dueDate ?? null,
                status: allPaid
                  ? ReceivableStatus.PAID
                  : paidCentsForSplit > 0
                  ? ReceivableStatus.PARTIAL
                  : splitRules.receivableStatus,
                paidAt: allPaid ? new Date() : existing.paidAt,
              },
            });
          } else {
            const created = await tx.accountsReceivable.create({
              data: {
                orderId: order.id,
                clientId: order.clientId,
                sellerId: order.sellerId,
                regionId: order.regionId,
                paymentMethod: split.paymentMethod,
                status: splitRules.receivableStatus,
                amountCents: split.amountCents,
                receivedCents: splitRules.autoPaidAt ? split.amountCents : 0,
                dueDate: split.dueDate,
                paidAt: splitRules.autoPaidAt ? new Date() : null,
                installmentCount: split.installmentCount,
              },
            });

            const amounts = distributeInstallments(split.amountCents, split.installmentCount);
            await tx.accountsReceivableInstallment.createMany({
              data: Array.from({ length: split.installmentCount }, (_, index) => ({
                accountsReceivableId: created.id,
                installmentNumber: index + 1,
                amountCents: amounts[index] ?? 0,
                dueDate:
                  dateFromInput(split.installmentDates[index]) ??
                  (split.dueDate ? addMonths(split.dueDate, index) : addMonths(new Date(), index)),
                status: splitRules.receivableStatus,
                receivedCents: splitRules.autoPaidAt ? amounts[index] ?? 0 : 0,
                paidAt: splitRules.autoPaidAt ? new Date() : null,
              })),
            });

            if (splitRules.autoCreateReceipt && splitRules.receiptLocation) {
              await tx.receipt.create({
                data: {
                  accountsReceivableId: created.id,
                  orderId: order.id,
                  regionId: order.regionId,
                  amountCents: split.amountCents,
                  paymentMethod: split.paymentMethod,
                  receivedAt: new Date(),
                  location: splitRules.receiptLocation,
                  notes: "Recebimento automático adicionado na edição do pedido.",
                },
              });
            }
          }
        }

        const finalReceivables = await tx.accountsReceivable.findMany({
          where: { orderId: order.id, status: { not: ReceivableStatus.CANCELED } },
          select: { paymentMethod: true, amountCents: true },
        });
        const primary = finalReceivables.reduce<
          (typeof finalReceivables)[number] | null
        >(
          (best, current) =>
            !best || current.amountCents > best.amountCents ? current : best,
          null
        );

        if (primary) {
          const primaryRules = getFinancialRules(primary.paymentMethod);
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentMethod: primary.paymentMethod,
              paymentReceiver: paymentReceiver ?? primaryRules.paymentReceiver,
            },
          });
        }
      }

      await recomputeOrderPaymentStatus(tx, order.id);
    }, {
      maxWait: 10000,
      timeout: 20000,
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
