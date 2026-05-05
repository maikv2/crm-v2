import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-04-30T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {

    const existingOrder = await tx.order.findUnique({
      where: { number: 3 },
    });

    if (existingOrder) {
      throw new Error("Pedido 3 já existe.");
    }

    // =========================
    // CLIENTE
    // =========================
    let client = await tx.client.findUnique({
      where: { cnpj: "08870840000540" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "FACRIFARMA Ltda",
          tradeName: "FACRIFARMA",
          legalName: "FACRIFARMA Ltda",
          cnpj: "08870840000540",
          whatsapp: "4989094385",
          street: "Rua Antônio Sachetti",
          number: "370",
          district: "Desbravador",
          city: "Chapecó",
          state: "SC",
          cep: "89811396",
          stateRegistration: "263212149",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Importado manualmente pelo pedido 3.",
        },
      });
    }

    // =========================
    // ITENS
    // =========================
    const items = [
      { sku: "CB002", qty: 2, unitCents: 1650 },
      { sku: "CB003", qty: 3, unitCents: 1650 },
      { sku: "CR003", qty: 1, unitCents: 2850 },
      { sku: "CR004", qty: 1, unitCents: 2850 },
      { sku: "CR005", qty: 3, unitCents: 2850 },
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
        number: 3,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 22500,
        discountCents: 0,
        totalCents: 22500,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "OVERDUE",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        // NF vinculada
        nfeStatus: "AUTHORIZED",
        nfeNumber: "495",
        nfeKey: "42260439531220000187550010000004951386295380",

        notes:
          "Importação manual. Pedido em boleto. Vencimento 30/04/2026. Boleto em aberto. Não enviar WhatsApp.",

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
    // CONTAS A RECEBER (EM ABERTO)
    // =========================
    await tx.accountsReceivable.create({
      data: {
        orderId: order.id,
        clientId: client.id,
        sellerId: SELLER_ID,
        regionId: REGION_ID,
        paymentMethod: "BOLETO",
        status: "OVERDUE",
        amountCents: 22500,
        receivedCents: 0,
        dueDate: DUE_DATE,
        paidAt: null,
        installmentCount: 1,
        notes: "Boleto vencido em 30/04/2026. Em aberto.",
        installments: {
          create: [{
            installmentNumber: 1,
            amountCents: 22500,
            dueDate: DUE_DATE,
            paidAt: null,
            receivedCents: 0,
            status: "OVERDUE"
          }]
        }
      }
    });

    // =========================
    // FINANCEIRO (PENDENTE)
    // =========================
    await tx.financeTransaction.create({
      data: {
        scope: "MATRIX",
        type: "INCOME",
        status: "PENDING",
        category: "SALES",
        paymentMethod: "BOLETO",
        paymentStatus: "OVERDUE",
        paymentReceiver: "MATRIX",
        description: "Venda pedido 3 - FACRIFARMA",
        amountCents: 22500,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: null,
        competenceMonth: 4,
        competenceYear: 2026,
        isSystemGenerated: true,
        notes: "Importação manual. Boleto em aberto/vencido.",
      }
    });

    console.log("Pedido 3 importado com sucesso");
  });
}

main()
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());