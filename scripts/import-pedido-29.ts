import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-30T12:00:00.000Z");
const DUE_DATE = new Date("2026-05-05T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 29 },
    });

    if (existingOrder) {
      throw new Error("Pedido 29 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "05094516000166" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Posto Covatti",
          tradeName: "Posto Covatti",
          legalName: "Valmir Covatti",
          cnpj: "05094516000166",
          whatsapp: "49988192437",
          street: "Rua Judithe Dal Magro",
          number: "354",
          district: "Centro",
          city: "Lajeado Grande",
          state: "SC",
          cep: "89828000",
          stateRegistration: "254397158",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 29.",
        },
      });
    }

    const items = [
      { sku: "CB002", qty: 1, unitCents: 1650 },
      { sku: "CB003", qty: 4, unitCents: 1650 },
      { sku: "CR003", qty: 1, unitCents: 2850 },
      { sku: "CR004", qty: 2, unitCents: 2850 },
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
        number: 29,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 16800,
        discountCents: 0,
        totalCents: 16800,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PENDING",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "505",
        nfeKey: "42260439531220000187550010000005051277955123",

        notes:
          "Importação manual. Pedido em boleto. Vencimento 05/05/2026. Em aberto. Não enviar WhatsApp.",

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
        amountCents: 16800,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto em aberto.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 16800,
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
        description: "Venda pedido 29 - Posto Covatti",
        amountCents: 16800,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: null,
        competenceMonth: 5,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 29 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());