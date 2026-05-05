import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";
const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({ where: { number: 25 } });

    if (existingOrder) {
      throw new Error("Pedido 25 já existe no banco. Nada foi importado.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "82805623000104" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Barp",
          tradeName: "Mercado Barp",
          legalName: "Mercado Barp",
          cnpj: "82805623000104",
          whatsapp: "49999700567",
          street: "Geral",
          number: "S/n",
          district: "Serraria Reatto",
          city: "Chapecó",
          state: "SC",
          cep: "89801970",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Contato informado: Elisangela Barp. Importado manualmente pelo pedido 25.",
        },
      });
    }

    const items = [
      { sku: "CB001", qty: 3, unitCents: 1650 },
      { sku: "CB002", qty: 1, unitCents: 1650 },
      { sku: "CB003", qty: 2, unitCents: 1650 },
      { sku: "CR003", qty: 2, unitCents: 2850 },
      { sku: "CR004", qty: 1, unitCents: 2850 },
      { sku: "FN001", qty: 2, unitCents: 1850 },
    ];

    const products = await tx.product.findMany({
      where: { sku: { in: items.map((item) => item.sku) } },
    });

    const getProduct = (sku: string) => {
      const product = products.find((p) => p.sku === sku);
      if (!product) throw new Error(`Produto ${sku} não encontrado. Nada foi importado.`);
      return product;
    };

    const commissionTotalCents = items.reduce((sum, item) => {
      const product = getProduct(item.sku);
      return sum + (product.commissionCents ?? 0) * item.qty;
    }, 0);

    const order = await tx.order.create({
      data: {
        number: 25,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 22150,
        discountCents: 0,
        totalCents: 22150,
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
        amountCents: 22150,
        receivedCents: 22150,
        dueDate: ORDER_DATE,
        paidAt: ORDER_DATE,
        installmentCount: 1,
        notes: "Recebimento importado manualmente. Pedido já pago.",
        installments: {
          create: [{
            installmentNumber: 1,
            amountCents: 22150,
            dueDate: ORDER_DATE,
            paidAt: ORDER_DATE,
            receivedCents: 22150,
            status: "PAID",
            notes: "Parcela única paga.",
          }],
        },
      },
    });

    const receipt = await tx.receipt.create({
      data: {
        accountsReceivableId: receivable.id,
        orderId: order.id,
        regionId: REGION_ID,
        receivedById: SELLER_ID,
        amountCents: 22150,
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
        amountCents: 22150,
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
        description: "Venda pedido 25 - Mercado Barp",
        amountCents: 22150,
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

    console.log("Pedido 25 importado com sucesso:", order.number);
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