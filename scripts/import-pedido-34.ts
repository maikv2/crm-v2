import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-05-04T12:00:00.000Z");
const DUE_DATE = new Date("2026-05-07T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({ where: { number: 34 } });

    if (existingOrder) throw new Error("Pedido 34 já existe.");

    let client = await tx.client.findUnique({
      where: { cnpj: "20259722000172" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Supermix",
          tradeName: "Supermix",
          legalName: "Supermix Supermercado Ltda",
          cnpj: "20259722000172",
          whatsapp: "49999705022",
          street: "Rua Sete de Setembro",
          number: "35",
          district: "Centro",
          city: "Seara",
          state: "SC",
          cep: "89770000",
          stateRegistration: "260593532",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Contato: Jaque Super Mix Seara. Importado manualmente pelo pedido 34.",
        },
      });
    }

    const items = [
      { sku: "CB001", qty: 1, unitCents: 1650 },
      { sku: "CB002", qty: 2, unitCents: 1650 },
      { sku: "CB003", qty: 2, unitCents: 1650 },
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
        number: 34,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 8250,
        discountCents: 0,
        totalCents: 8250,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PENDING",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "508",
        nfeKey: "42260539531220000187550010000005081420936870",

        notes:
          "Importação manual. Pedido em boleto. Vencimento 07/05/2026. Em aberto. Não enviar WhatsApp.",

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
        amountCents: 8250,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto em aberto.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 8250,
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
        description: "Venda pedido 34 - Supermix",
        amountCents: 8250,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: null,
        competenceMonth: 5,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 34 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());