import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";
const STOCK_LOCATION_ID = "b0307a56-ba6e-47b4-a719-035cc592f3f9";

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 23 },
    });

    if (existingOrder) {
      throw new Error("Pedido 23 já existe no banco. Nada foi importado.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "83022004000106" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Dall Rosa",
          tradeName: "Mercado Dall Rosa",
          legalName: "Mercado Dall Rosa",
          cnpj: "83022004000106",
          whatsapp: "49984030884",
          street: "Manoel Gregório de Mattos",
          number: "31",
          district: "Marechal Bormann",
          city: "Chapecó",
          state: "SC",
          cep: "89816170",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 23.",
        },
      });
    }

    const products = await tx.product.findMany({
      where: {
        sku: { in: ["CB002", "CR004"] },
      },
    });

    const cb002 = products.find((p) => p.sku === "CB002");
    const cr004 = products.find((p) => p.sku === "CR004");

    if (!cb002 || !cr004) {
      throw new Error("Produto CB002 ou CR004 não encontrado. Nada foi importado.");
    }

    const order = await tx.order.create({
      data: {
        number: 23,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: new Date("2026-04-29T12:00:00.000Z"),
        createdAt: new Date("2026-04-29T12:00:00.000Z"),
        subtotalCents: 9000,
        discountCents: 0,
        totalCents: 9000,
        commissionTotalCents: 2000,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentReceiver: "REGION",
        financialMovement: true,
        notes:
          "Importação manual. Cliente pagou em dinheiro. Valor recebido pela região/representante e já repassado para a matriz. Não enviar WhatsApp, não gerar NF automática.",
        type: "SALE",
        items: {
          create: [
            {
              productId: cb002.id,
              qty: 2,
              unitCents: 1650,
              ncm: cb002.ncm,
              cfop: cb002.cfop,
              cst: cb002.cst,
              icmsRate: cb002.icmsRate,
              unit: cb002.commercialUnit,
            },
            {
              productId: cr004.id,
              qty: 2,
              unitCents: 2850,
              ncm: cr004.ncm,
              cfop: cr004.cfop,
              cst: cr004.cst,
              icmsRate: cr004.icmsRate,
              unit: cr004.commercialUnit,
            },
          ],
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
        amountCents: 9000,
        receivedCents: 9000,
        dueDate: new Date("2026-04-29T12:00:00.000Z"),
        paidAt: new Date("2026-04-29T12:00:00.000Z"),
        installmentCount: 1,
        notes: "Recebimento importado manualmente. Pedido já pago.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 9000,
              dueDate: new Date("2026-04-29T12:00:00.000Z"),
              paidAt: new Date("2026-04-29T12:00:00.000Z"),
              receivedCents: 9000,
              status: "PAID",
              notes: "Parcela única paga.",
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
        amountCents: 9000,
        paymentMethod: "CASH",
        receivedAt: new Date("2026-04-29T12:00:00.000Z"),
        location: "REGION",
        notes: "Recebido em dinheiro pela região/representante.",
      },
    });

    await tx.cashTransfer.create({
      data: {
        receiptId: receipt.id,
        regionId: REGION_ID,
        transferredById: SELLER_ID,
        amountCents: 9000,
        transferredAt: new Date("2026-04-29T12:00:00.000Z"),
        status: "TRANSFERRED",
        notes: "Repasse já realizado para a matriz V2.",
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
        description: "Venda pedido 23 - Mercado Dall Rosa",
        amountCents: 9000,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: new Date("2026-04-29T12:00:00.000Z"),
        paidAt: new Date("2026-04-29T12:00:00.000Z"),
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
        notes: "Importação manual. Valor recebido na região e repassado para matriz.",
      },
    });

    console.log("Pedido 23 importado com sucesso:", order.number);
  });
}

main()
  .catch((error) => {
    console.error("Erro na importação:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });