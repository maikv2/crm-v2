import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 24 },
    });

    if (existingOrder) {
      throw new Error("Pedido 24 já existe no banco. Nada foi importado.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "81856650000135" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Chimek",
          tradeName: "Mercado Chimek",
          legalName: "Mercado Chimek",
          cnpj: "81856650000135",
          whatsapp: "49999265983",
          street: "João Vicente Costa",
          number: "445",
          district: "Marechal Bormann",
          city: "Chapecó",
          state: "SC",
          cep: "89816150",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Contato informado: Antonio Chiamek. Importado manualmente pelo pedido 24.",
        },
      });
    }

    const skus = ["CB002", "CR001", "CR003", "CR004", "CR005", "FN001", "FN005"];

    const products = await tx.product.findMany({
      where: { sku: { in: skus } },
    });

    const getProduct = (sku: string) => {
      const product = products.find((p) => p.sku === sku);
      if (!product) {
        throw new Error(`Produto ${sku} não encontrado. Nada foi importado.`);
      }
      return product;
    };

    const items = [
      { sku: "CB002", qty: 1, unitCents: 1650 },
      { sku: "CR001", qty: 1, unitCents: 2650 },
      { sku: "CR003", qty: 1, unitCents: 2850 },
      { sku: "CR004", qty: 2, unitCents: 2850 },
      { sku: "CR005", qty: 1, unitCents: 2850 },
      { sku: "FN001", qty: 3, unitCents: 1850 },
      { sku: "FN005", qty: 1, unitCents: 4990 },
    ];

    const commissionTotalCents = items.reduce((sum, item) => {
      const product = getProduct(item.sku);
      return sum + (product.commissionCents ?? 0) * item.qty;
    }, 0);

    const order = await tx.order.create({
      data: {
        number: 24,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 26240,
        discountCents: 0,
        totalCents: 26240,
        commissionTotalCents,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        paymentReceiver: "REGION",
        financialMovement: true,
        type: "SALE",
        notes:
          "Importação manual. Cliente pagou em dinheiro. Valor recebido pela região/representante e já repassado para a matriz. Não enviar WhatsApp, não gerar NF automática.",
        items: {
          create: items.map((item) => {
            const product = getProduct(item.sku);

            return {
              productId: product.id,
              qty: item.qty,
              unitCents: item.unitCents,
              ncm: product.ncm,
              cfop: product.cfop,
              cst: product.cst,
              icmsRate: product.icmsRate,
              unit: product.commercialUnit,
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
        amountCents: 26240,
        receivedCents: 26240,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        installmentCount: 1,
        notes: "Recebimento importado manualmente. Pedido já pago.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 26240,
              dueDate: ORDER_DATE,
              paidAt: ORDER_DATE,
              receivedCents: 26240,
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
        amountCents: 26240,
        paymentMethod: "CASH",
        receivedAt: ORDER_DATE,
        location: "REGION",
        notes: "Recebido em dinheiro pela região/representante.",
      },
    });

    await tx.cashTransfer.create({
      data: {
        receiptId: receipt.id,
        regionId: REGION_ID,
        transferredById: SELLER_ID,
        amountCents: 26240,
        transferredAt: ORDER_DATE,
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
        description: "Venda pedido 24 - Mercado Chimek",
        amountCents: 26240,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
        notes: "Importação manual. Valor recebido na região e repassado para matriz.",
      },
    });

    console.log("Pedido 24 importado com sucesso:", order.number);
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