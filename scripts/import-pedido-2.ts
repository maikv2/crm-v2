import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { number: 2 },
    });

    if (existingOrder) {
      throw new Error("Pedido 2 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "08870840000117" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "FACRIFARMA Ltda",
          tradeName: "FACRIFARMA",
          legalName: "FACRIFARMA Ltda",
          cnpj: "08870840000117",
          whatsapp: "49989019974",
          street: "Rua Claudio Brito",
          number: "28",
          district: "Lider",
          city: "Chapecó",
          state: "SC",
          cep: "89805865",
          stateRegistration: "255404794",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 2.",
        },
      });
    }

    const items = [
      { sku: "CB003", qty: 5, unitCents: 1650 },
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
        number: 2,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 17940,
        discountCents: 0,
        totalCents: 17940,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "OVERDUE",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "494",
        nfeKey: "42260439531220000187550010000004941633834012",

        notes:
          "Importação manual. Pedido em boleto. Vencimento 30/04/2026. Boleto em aberto. Não enviar WhatsApp.",

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
        status: "OVERDUE",
        amountCents: 17940,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto vencido em 30/04/2026. Em aberto.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 17940,
              dueDate: DUE_DATE,
              paidAt: null,
              receivedCents: 0,
              status: "OVERDUE",
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
        paymentStatus: "OVERDUE",
        paymentReceiver: "MATRIX",
        description: "Venda pedido 2 - FACRIFARMA",
        amountCents: 17940,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: null,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
        notes: "Importação manual. Boleto em aberto/vencido.",
      },
    });

    console.log("Pedido 2 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());