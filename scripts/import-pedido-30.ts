import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 30 },
    });

    if (existingOrder) {
      throw new Error("Pedido 30 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "02008584000177" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado e Açougue Giolo",
          tradeName: "Mercado e Açougue Giolo",
          legalName: "Mercado e Açougue Giolo",
          cnpj: "02008584000177",
          whatsapp: "4998210201",
          street: "Almirante Barroso",
          number: "497",
          district: "Centro",
          city: "Caxambú do Sul",
          state: "SC",
          cep: "89880000",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 30.",
        },
      });
    }

    const items = [
      { sku: "CB003", qty: 2, unitCents: 1650 },
      { sku: "CR003", qty: 1, unitCents: 2850 },
      { sku: "CR005", qty: 1, unitCents: 2850 },
      { sku: "FN004", qty: 1, unitCents: 3990 },
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
        number: 30,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 12990,
        discountCents: 0,
        totalCents: 12990,
        commissionTotalCents,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentReceiver: "REGION",
        financialMovement: true,
        type: "SALE",
        notes:
          "Importação manual. Cliente pagou em dinheiro. Recebido pela região e já repassado para matriz. Não enviar WhatsApp.",
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
        amountCents: 12990,
        receivedCents: 12990,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        installmentCount: 1,
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 12990,
              dueDate: ORDER_DATE,
              paidAt: ORDER_DATE,
              receivedCents: 12990,
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
        amountCents: 12990,
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
        amountCents: 12990,
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
        description: "Venda pedido 30 - Mercado e Açougue Giolo",
        amountCents: 12990,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 30 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());