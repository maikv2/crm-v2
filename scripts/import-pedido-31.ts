import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 31 },
    });

    if (existingOrder) {
      throw new Error("Pedido 31 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "30057745000158" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Sartori",
          tradeName: "Mercado Sartori",
          legalName: "Mercado Sartori",
          cnpj: "30057745000158",
          whatsapp: "49999376726",
          street: "João Batista Dal Piva",
          number: "SN",
          district: "Centro",
          city: "Guatambu",
          state: "SC",
          cep: "89817000",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 31.",
        },
      });
    }

    const items = [
      { sku: "FN001", qty: 3, unitCents: 1850 },
    ];

    const products = await tx.product.findMany({
      where: { sku: { in: items.map((i) => i.sku) } },
    });

    const getProduct = (sku: string) => {
      const p = products.find((p) => p.sku === sku);
      if (!p) throw new Error(`Produto ${sku} não encontrado`);
      return p;
    };

    const commissionTotalCents = items.reduce((sum, item) => {
      const p = getProduct(item.sku);
      return sum + (p.commissionCents ?? 0) * item.qty;
    }, 0);

    const order = await tx.order.create({
      data: {
        number: 31,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 5550,
        discountCents: 0,
        totalCents: 5550,
        commissionTotalCents,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentReceiver: "REGION",
        financialMovement: true,
        type: "SALE",
        notes:
          "Importação manual. Pago em dinheiro, recebido na região e repassado para matriz. Não enviar WhatsApp.",
        items: {
          create: items.map((item) => {
            const p = getProduct(item.sku);

            return {
              productId: p.id,
              qty: item.qty,
              unitCents: item.unitCents,
              ncm: p.ncm,
              cfop: p.cfop,
              cst: p.cst,
              icmsRate: p.icmsRate,
              unit: p.commercialUnit,
            };
          }),
        },
      },
    });

    const receivable = await tx.accountsReceivable.create({
      data: {
        orderId: order.id,
        clientId: client.id,
        sellerId: SELLER_ID,
        regionId: REGION_ID,
        paymentMethod: "CASH",
        status: "PAID",
        amountCents: 5550,
        receivedCents: 5550,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        installmentCount: 1,
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 5550,
              dueDate: ORDER_DATE,
              paidAt: ORDER_DATE,
              receivedCents: 5550,
              status: "PAID",
            },
          ],
        },
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        accountsReceivableId: receivable.id,
        orderId: order.id,
        regionId: REGION_ID,
        receivedById: SELLER_ID,
        amountCents: 5550,
        paymentMethod: "CASH",
        receivedAt: ORDER_DATE,
        location: "REGION",
      },
    });

    await tx.cashTransfer.create({
      data: {
        receiptId: receipt.id,
        regionId: REGION_ID,
        transferredById: SELLER_ID,
        amountCents: 5550,
        transferredAt: ORDER_DATE,
        status: "TRANSFERRED",
      },
    });

    await tx.financeTransaction.create({
      data: {
        scope: "REGION",
        type: "INCOME",
        status: "PAID",
        category: "SALES",
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentReceiver: "REGION",
        description: "Venda pedido 31 - Mercado Sartori",
        amountCents: 5550,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 31 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());