import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-04-30T12:00:00.000Z");
const PAID_AT = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {

    const existingOrder = await tx.order.findUnique({
      where: { number: 5 },
    });

    if (existingOrder) {
      throw new Error("Pedido 5 já existe.");
    }

    // =========================
    // CLIENTE
    // =========================
    let client = await tx.client.findUnique({
      where: { cnpj: "10557188000127" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "MG Luchetta Supermercado Ltda",
          tradeName: "Luchetta Supermercado",
          legalName: "MG Luchetta Supermercado Ltda",
          cnpj: "10557188000127",
          whatsapp: "49991977677",
          street: "Rua Alberto Santos Dumont",
          number: "491 E",
          district: "São Cristóvão",
          city: "Chapecó",
          state: "SC",
          cep: "89804040",
          stateRegistration: "255761678",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 5.",
        },
      });
    }

    // =========================
    // ITENS
    // =========================
    const items = [
      { sku: "CB002", qty: 2, unitCents: 1650 },
      { sku: "CB003", qty: 2, unitCents: 1650 },
      { sku: "CR005", qty: 1, unitCents: 2850 },
    ];

    const products = await tx.product.findMany({
      where: { sku: { in: items.map(i => i.sku) } }
    });

    const getProduct = (sku: string) => {
      const p = products.find(p => p.sku === sku);
      if (!p) throw new Error(`Produto ${sku} não encontrado`);
      return p;
    };

    const commissionTotalCents = items.reduce((sum, item) => {
      const p = getProduct(item.sku);
      return sum + (p.commissionCents ?? 0) * item.qty;
    }, 0);

    // =========================
    // PEDIDO
    // =========================
    const order = await tx.order.create({
      data: {
        number: 5,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 9450,
        discountCents: 0,
        totalCents: 9450,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PAID",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "497",
        nfeKey: "42260439531220000187550010000004971955055080",

        notes:
          "Importação manual. Pedido em boleto. Pago em 30/04/2026 diretamente na matriz. Não enviar WhatsApp.",

        items: {
          create: items.map(item => {
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
          })
        }
      }
    });

    // =========================
    // CONTAS A RECEBER
    // =========================
    const receivable = await tx.accountsReceivable.create({
      data: {
        orderId: order.id,
        clientId: client.id,
        sellerId: SELLER_ID,
        regionId: REGION_ID,
        paymentMethod: "BOLETO",
        status: "PAID",
        amountCents: 9450,
        receivedCents: 9450,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        installmentCount: 1,
        installments: {
          create: [{
            installmentNumber: 1,
            amountCents: 9450,
            dueDate: DUE_DATE,
            paidAt: PAID_AT,
            receivedCents: 9450,
            status: "PAID"
          }]
        }
      }
    });

    // =========================
    // RECEBIMENTO (MATRIZ)
    // =========================
    await tx.receipt.create({
      data: {
        accountsReceivableId: receivable.id,
        orderId: order.id,
        regionId: REGION_ID,
        receivedById: SELLER_ID,
        amountCents: 9450,
        paymentMethod: "BOLETO",
        receivedAt: PAID_AT,
        location: "MATRIX",
      }
    });

    // =========================
    // FINANCEIRO
    // =========================
    await tx.financeTransaction.create({
      data: {
        scope: "MATRIX",
        type: "INCOME",
        status: "PAID",
        category: "SALES",
        paymentMethod: "BOLETO",
        paymentStatus: "PAID",
        paymentReceiver: "MATRIX",
        description: "Venda pedido 5 - Luchetta Supermercado",
        amountCents: 9450,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
      }
    });

    console.log("Pedido 5 importado com sucesso");
  });
}

main()
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());