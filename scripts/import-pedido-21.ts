import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-04-30T12:00:00.000Z");
const PAID_AT = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({ where: { number: 21 } });

    if (existingOrder) {
      throw new Error("Pedido 21 já existe.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "06085212000103" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Candatti Supermercado Ltda",
          tradeName: "Candatti Supermercado",
          legalName: "Candatti Supermercado Ltda",
          cnpj: "06085212000103",
          whatsapp: "4933245104",
          street: "Rancho Queimado",
          number: "241",
          district: "Lider",
          city: "Chapecó",
          state: "SC",
          cep: "89804440",
          stateRegistration: "254705871",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 21.",
        },
      });
    }

    const items = [
      { sku: "CB002", qty: 2, unitCents: 1650 },
      { sku: "CB003", qty: 4, unitCents: 1650 },
      { sku: "CR004", qty: 4, unitCents: 2850 },
      { sku: "CR005", qty: 4, unitCents: 2850 },
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
        number: 21,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 32700,
        discountCents: 0,
        totalCents: 32700,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PAID",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "499",
        nfeKey: "42260439531220000187550010000004991941105840",

        notes:
          "Importação manual. Pedido em boleto. Vencimento em 30/04/2026. Pago e recebido diretamente na matriz. Não enviar WhatsApp.",

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
        paymentMethod: "BOLETO",
        status: "PAID",
        amountCents: 32700,
        receivedCents: 32700,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        installmentCount: 1,
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 32700,
              dueDate: DUE_DATE,
              paidAt: PAID_AT,
              receivedCents: 32700,
              status: "PAID",
            },
          ],
        },
      },
    });

    await tx.receipt.create({
      data: {
        accountsReceivableId: receivable.id,
        orderId: order.id,
        regionId: REGION_ID,
        receivedById: SELLER_ID,
        amountCents: 32700,
        paymentMethod: "BOLETO",
        receivedAt: PAID_AT,
        location: "MATRIX",
      },
    });

    await tx.financeTransaction.create({
      data: {
        scope: "MATRIX",
        type: "INCOME",
        status: "PAID",
        category: "SALES",
        paymentMethod: "BOLETO",
        paymentStatus: "PAID",
        paymentReceiver: "MATRIX",
        description: "Venda pedido 21 - Candatti Supermercado",
        amountCents: 32700,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
      },
    });

    console.log("Pedido 21 importado com sucesso");
  });
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());