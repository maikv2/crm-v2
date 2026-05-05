import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-30T12:00:00.000Z");
const DUE_DATE = new Date("2026-05-08T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 32 },
    });

    if (existingOrder) {
      throw new Error("Pedido 32 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "27041269000172" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Dal Piva",
          tradeName: "Mercado Dal Piva",
          legalName: "Adriano Dal Piva",
          cnpj: "27041269000172",
          whatsapp: "49999914580",
          street: "João Batista Dal Piva",
          number: "888",
          district: "Centro",
          city: "Guatambu",
          state: "SC",
          cep: "89817000",
          stateRegistration: "258237023",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 32.",
        },
      });
    }

    const items = [
      { sku: "CB002", qty: 1, unitCents: 1650 },
      { sku: "CB003", qty: 2, unitCents: 1650 },
      { sku: "FN001", qty: 2, unitCents: 1850 },
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
        number: 32,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 8650,
        discountCents: 0,
        totalCents: 8650,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PENDING",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "506",
        nfeKey: "42260439531220000187550010000005061121430020",

        notes:
          "Importação manual. Pedido em boleto. Vencimento 08/05/2026. Em aberto. Não enviar WhatsApp.",

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

    await tx.accountsReceivable.create({
      data: {
        orderId: order.id,
        clientId: client.id,
        sellerId: SELLER_ID,
        regionId: REGION_ID,
        paymentMethod: "BOLETO",
        status: "PENDING",
        amountCents: 8650,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto em aberto.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 8650,
              dueDate: DUE_DATE,
              paidAt: null,
              receivedCents: 0,
              status: "PENDING",
            },
          ],
        },
      },
    });

    await tx.financeTransaction.create({
      data: {
        scope: "MATRIX",
        type: "INCOME",
        status: "PENDING",
        category: "SALES",
        paymentMethod: "BOLETO",
        paymentStatus: "PENDING",
        paymentReceiver: "MATRIX",
        description: "Venda pedido 32 - Mercado Dal Piva",
        amountCents: 8650,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: null,
        competenceMonth: 5,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 32 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());