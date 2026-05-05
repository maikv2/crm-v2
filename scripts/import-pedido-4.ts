import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({ where: { number: 4 } });

    if (existingOrder) {
      throw new Error("Pedido 4 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "10157379000100" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado e Açougue Líder Ltda",
          tradeName: "Mercado e Açougue Líder",
          legalName: "Mercado e Açougue Líder Ltda",
          cnpj: "10157379000100",
          whatsapp: "4988456560",
          street: "Rua Uruguai",
          number: "407 D",
          district: "Lider",
          city: "Chapecó",
          state: "SC",
          cep: "89802500",
          stateRegistration: "255650604",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Contato informado: Amanda. Importado manualmente pelo pedido 4.",
        },
      });
    }

    const items = [
      { sku: "CB002", qty: 3, unitCents: 1650 },
      { sku: "CB003", qty: 3, unitCents: 1650 },
      { sku: "CR004", qty: 2, unitCents: 2850 },
      { sku: "CR005", qty: 1, unitCents: 2850 },
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
        number: 4,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 18450,
        discountCents: 0,
        totalCents: 18450,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "OVERDUE",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "496",
        nfeKey: "42260439531220000187550010000004961982250150",

        notes:
          "Importação manual. Pedido em boleto. Vencimento em 30/04/2026. Boleto em aberto/não pago. Não enviar WhatsApp.",

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
        amountCents: 18450,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto vencido em 30/04/2026. Em aberto.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 18450,
              dueDate: DUE_DATE,
              paidAt: null,
              receivedCents: 0,
              status: "OVERDUE",
              notes: "Parcela única em aberto.",
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
        description: "Venda pedido 4 - Mercado e Açougue Líder",
        amountCents: 18450,
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

    console.log("Pedido 4 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());