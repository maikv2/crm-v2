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

function normalizeOrderType(value: unknown): OrderType {
  const raw = String(value ?? "").toUpperCase();

  switch (raw) {
    case "EXHIBITOR_INITIAL_STOCK":
      return OrderType.EXHIBITOR_INITIAL_STOCK;
    case "DEFECT_EXCHANGE":
      return OrderType.DEFECT_EXCHANGE;
    case "SALE":
    default:
      return OrderType.SALE;
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

function movementSignal(type: StockMovementType) {
  switch (type) {
    case StockMovementType.IN:
    case StockMovementType.TRANSFER_IN:
      return 1;
    case StockMovementType.OUT:
    case StockMovementType.TRANSFER_OUT:
      return -1;
    case StockMovementType.ADJUSTMENT:
      return 1;
    default:
      return 0;
  }
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

async function rebuildStockBalanceForProducts(
  tx: Omit<
    typeof prisma,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  stockLocationId: string,
  productIds: string[]
) {
  const movements = await tx.stockMovement.findMany({
    where: {
      stockLocationId,
      productId: { in: productIds },
    },
    select: {
      productId: true,
      type: true,
      quantity: true,
    },
  });

  const totals = new Map<string, number>();

  for (const productId of productIds) {
    totals.set(productId, 0);
  }

  for (const movement of movements) {
    const current = totals.get(movement.productId) ?? 0;
    const signal = movementSignal(movement.type);
    totals.set(movement.productId, current + signal * movement.quantity);
  }

  for (const productId of productIds) {
    const quantity = Math.max(0, totals.get(productId) ?? 0);

    await tx.stockBalance.upsert({
      where: {
        productId_stockLocationId: {
          productId,
          stockLocationId,
        },
      },
      update: {
        quantity,
      },
      create: {
        productId,
        stockLocationId,
        quantity,
      },
    });
  }
}

export async function GET() {
  try {
    const authUser = await getAuthUser();

    const where =
      authUser?.role === "REPRESENTATIVE" && authUser.regionId
        ? { regionId: authUser.regionId }
        : undefined;

    const orders = await prisma.order.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
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
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET /api/orders error:", error);

    return NextResponse.json(
      { error: "Erro ao carregar pedidos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthUser();
    const body = await request.json();

    const clientId = body.clientId as string | undefined;
    const exhibitorId = body.exhibitorId as string | undefined;
    const notes = (body.notes as string | undefined)?.trim() || null;

    const type = normalizeOrderType(body.type);
    const isDefectExchange = type === OrderType.DEFECT_EXCHANGE;

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

    const discountCents = isDefectExchange
      ? 0
      : Math.max(0, toInt(body.discountCents, 0));

    const itemsInput = Array.isArray(body.items)
      ? (body.items as OrderItemInput[])
      : [];

    const defectReturnItemsInput = Array.isArray(body.defectReturnItems)
      ? (body.defectReturnItems as DefectReturnItemInput[])
      : [];

    let regionId = body.regionId as string | undefined;
    let sellerId = body.sellerId as string | undefined;
    let stockLocationId = body.stockLocationId as string | undefined;

    if (authUser?.role === "REPRESENTATIVE") {
      if (!authUser.regionId) {
        return NextResponse.json(
          { error: "Representante sem região vinculada." },
          { status: 400 }
        );
      }

      regionId = authUser.regionId;
      sellerId = authUser.id;
      stockLocationId = authUser.stockLocationId || authUser.region?.stockLocationId || undefined;

      if (!stockLocationId) {
        return NextResponse.json(
          { error: "Representante sem estoque vinculado." },
          { status: 400 }
        );
      }
    }

    if (!isValidUuid(clientId)) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    if (!isValidUuid(regionId)) {
      return NextResponse.json({ error: "Região inválida." }, { status: 400 });
    }

    if (!isValidUuid(stockLocationId)) {
      return NextResponse.json(
        { error: "Local de estoque inválido." },
        { status: 400 }
      );
    }

    if (!itemsInput.length) {
      return NextResponse.json(
        { error: "Adicione pelo menos um item ao pedido." },
        { status: 400 }
      );
    }

    const productIds = itemsInput
      .map((item) => item.productId)
      .filter((id): id is string => isValidUuid(id));

    if (!productIds.length || productIds.length !== itemsInput.length) {
      return NextResponse.json(
        { error: "Há produto(s) inválido(s) no pedido." },
        { status: 400 }
      );
    }

    const defectProductIds = defectReturnItemsInput
      .map((item) => item.productId)
      .filter((id): id is string => isValidUuid(id));

    if (
      defectReturnItemsInput.length > 0 &&
      defectProductIds.length !== defectReturnItemsInput.length
    ) {
      return NextResponse.json(
        { error: "Há produto(s) inválido(s) nas devoluções por defeito." },
        { status: 400 }
      );
    }

    if (isDefectExchange && defectReturnItemsInput.length === 0) {
      return NextResponse.json(
        {
          error:
            "Para troca por defeito, informe ao menos um item devolvido com defeito.",
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({
        where: { id: clientId! },
        select: { id: true, regionId: true, name: true },
      });

      if (!client) {
        throw new Error("Cliente não encontrado.");
      }

      if (client.regionId !== regionId) {
        throw new Error("O cliente não pertence à região informada.");
      }

      if (authUser?.role === "REPRESENTATIVE" && client.regionId !== authUser.regionId) {
        throw new Error("O cliente não pertence à região do representante.");
      }

      if (sellerId) {
        const seller = await tx.user.findUnique({
          where: { id: sellerId },
          select: { id: true, regionId: true, role: true },
        });

        if (!seller) {
          throw new Error("Vendedor não encontrado.");
        }

        if (seller.regionId && seller.regionId !== regionId) {
          throw new Error("O vendedor não pertence à região informada.");
        }

        if (authUser?.role === "REPRESENTATIVE" && seller.id !== authUser.id) {
          throw new Error("Representante não pode criar pedido em nome de outro usuário.");
        }
      }

      if (exhibitorId) {
        const exhibitor = await tx.exhibitor.findUnique({
          where: { id: exhibitorId },
          select: { id: true, clientId: true, regionId: true },
        });

        if (!exhibitor) {
          throw new Error("Expositor não encontrado.");
        }

        if (exhibitor.clientId !== clientId) {
          throw new Error("O expositor não pertence ao cliente informado.");
        }

        if (exhibitor.regionId !== regionId) {
          throw new Error("O expositor não pertence à região informada.");
        }
      }

      const stockLocation = await tx.stockLocation.findUnique({
        where: { id: stockLocationId! },
        select: { id: true, active: true, name: true },
      });

      if (!stockLocation) {
        throw new Error("Local de estoque não encontrado.");
      }

      if (!stockLocation.active) {
        throw new Error("O local de estoque informado está inativo.");
      }

      if (authUser?.role === "REPRESENTATIVE") {
        const allowedStockLocationId =
          authUser.stockLocationId || authUser.region?.stockLocationId || null;

        if (allowedStockLocationId && stockLocation.id !== allowedStockLocationId) {
          throw new Error("O representante não pode usar outro estoque.");
        }
      }

      const allProductIds = [...new Set([...productIds, ...defectProductIds])];

      const products = await tx.product.findMany({
        where: { id: { in: allProductIds } },
        select: {
          id: true,
          name: true,
          priceCents: true,
          commissionCents: true,
          active: true,
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

        if (!product) {
          throw new Error("Produto inválido encontrado.");
        }

        if (!product.active) {
          throw new Error(`O produto "${product.name}" está inativo.`);
        }

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
        };
      });

      const normalizedDefectReturnItems = defectReturnItemsInput.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new Error("Produto inválido encontrado na devolução por defeito.");
        }

        if (!product.active) {
          throw new Error(
            `O produto devolvido "${product.name}" está inativo.`
          );
        }

        const quantity = Math.max(1, toInt(item.quantity, 0));

        return {
          productId: product.id,
          quantity,
          reason: item.reason?.trim() || null,
          notes: item.notes?.trim() || null,
          productName: product.name,
        };
      });

      const totalCents = isDefectExchange
        ? 0
        : Math.max(0, subtotalCents - discountCents);

      await rebuildStockBalanceForProducts(tx as any, stockLocationId!, productIds);

      const stockBalances = await tx.stockBalance.findMany({
        where: {
          stockLocationId: stockLocationId!,
          productId: { in: productIds },
        },
        select: {
          id: true,
          productId: true,
          quantity: true,
        },
      });

      const stockBalanceMap = new Map(
        stockBalances.map((balance) => [balance.productId, balance])
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

      const order = await tx.order.create({
        data: {
          regionId: regionId!,
          clientId: clientId!,
          exhibitorId: exhibitorId ?? null,
          sellerId: sellerId ?? null,
          type,
          financialMovement: !isDefectExchange,
          paymentMethod: isDefectExchange ? PaymentMethod.CASH : paymentMethod,
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
          issuedAt: new Date(),
          subtotalCents: isDefectExchange ? 0 : subtotalCents,
          discountCents,
          totalCents,
          notes,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              unitCents: item.unitCents,
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
        include: {
          items: true,
          defectReturnItems: true,
          client: true,
          seller: true,
        },
      });

      for (const item of normalizedItems) {
        const balance = stockBalanceMap.get(item.productId)!;

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId: stockLocationId!,
            orderId: order.id,
            exhibitorId: exhibitorId ?? null,
            type: StockMovementType.OUT,
            quantity: item.qty,
            note: isDefectExchange
              ? `Saída por troca por defeito PED-${String(order.number).padStart(
                  4,
                  "0"
                )}`
              : `Saída por pedido PED-${String(order.number).padStart(4, "0")}`,
          },
        });

        await tx.stockBalance.update({
          where: { id: balance.id },
          data: {
            quantity: {
              decrement: item.qty,
            },
          },
        });
      }

      if (isDefectExchange) {
        return {
          order,
          accountsReceivable: null,
          receipt: null,
        };
      }

      const accountsReceivable = await tx.accountsReceivable.create({
        data: {
          orderId: order.id,
          clientId: clientId!,
          sellerId: sellerId ?? null,
          regionId: regionId!,
          paymentMethod,
          status: rules.receivableStatus,
          amountCents: totalCents,
          receivedCents: rules.autoCreateReceipt ? totalCents : 0,
          dueDate,
          paidAt: rules.autoPaidAt ? new Date() : null,
          installmentCount,
          notes:
            paymentMethod === PaymentMethod.PIX
              ? "Recebimento automático por PIX."
              : paymentMethod === PaymentMethod.CASH
              ? "Recebimento registrado em dinheiro na região."
              : paymentMethod === PaymentMethod.CARD_DEBIT
              ? "Recebimento automático por cartão de débito."
              : paymentMethod === PaymentMethod.BOLETO
              ? "Conta a receber gerada por boleto."
              : paymentMethod === PaymentMethod.CARD_CREDIT
              ? "Conta a receber gerada por cartão de crédito."
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
            orderId: order.id,
            regionId: regionId!,
            receivedById: sellerId ?? null,
            amountCents: totalCents,
            paymentMethod,
            receivedAt: new Date(),
            location: rules.receiptLocation,
            notes:
              paymentMethod === PaymentMethod.PIX
                ? "Recebimento automático via PIX instantâneo."
                : paymentMethod === PaymentMethod.CASH
                ? "Recebimento em dinheiro retido na região até repasse."
                : paymentMethod === PaymentMethod.CARD_DEBIT
                ? "Recebimento automático por cartão de débito."
                : null,
          },
        });

        if (paymentMethod === PaymentMethod.CASH) {
          await tx.cashTransfer.create({
            data: {
              receiptId: receipt.id,
              regionId: regionId!,
              transferredById: null,
              amountCents: totalCents,
              status: TransferStatus.PENDING,
              notes: "Aguardando repasse da região para a matriz.",
            },
          });
        }
      }

      return {
        order,
        accountsReceivable,
        receipt,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        message: isDefectExchangeMessage(body.type),
        order: result.order,
        accountsReceivable: result.accountsReceivable,
        receipt: result.receipt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/orders error:", error);

    const message =
      error instanceof Error ? error.message : "Erro interno ao criar pedido.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isDefectExchangeMessage(type: unknown) {
  return normalizeOrderType(type) === OrderType.DEFECT_EXCHANGE
    ? "Troca por defeito registrada com sucesso."
    : "Pedido criado com sucesso.";
}