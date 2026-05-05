import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REGION_ID = "b830d2fb-af76-4f19-a31d-45e243840038";
const SELLER_ID = "baa3354f-799a-4790-9b57-6812d1a3ab6d";

const ORDER_DATE = new Date("2026-04-29T12:00:00.000Z");
const DUE_DATE = new Date("2026-05-04T12:00:00.000Z");
const PAID_AT = new Date("2026-05-04T12:00:00.000Z");

async function main() {
  await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({ where: { number: 22 } });

    if (existingOrder) {
      throw new Error("Pedido 22 já existe no banco. Nada foi importado.");
    }

    let client = await tx.client.findUnique({
      where: { cnpj: "18702842000150" },
    });

    if (!client) {
      client = await tx.client.create({
        data: {
          name: "Mercado Água Amarela",
          tradeName: "Mercado Água Amarela",
          legalName: "Mercado Água Amarela Ltda",
          cnpj: "18702842000150",
          whatsapp: "49988568410",
          street: "Municipal Angelo Baldissera",
          number: "0",
          district: "Linha Água Amarela",
          city: "Chapecó",
          state: "SC",
          cep: "8980100",
          stateRegistration: "257125655",
          regionId: REGION_ID,
          active: true,
          roleClient: true,
          mapStatus: "CLIENT",
          notes: "Contato informado: Luiz Agua Amarela. Importado manualmente pelo pedido 22.",
        },
      });
    }

    const items = [
      { sku: "CB001", qty: 3, unitCents: 1650 },
      { sku: "CB002", qty: 4, unitCents: 1650 },
      { sku: "CB003", qty: 2, unitCents: 1650 },
      { sku: "CR003", qty: 3, unitCents: 2850 },
      { sku: "CR004", qty: 3, unitCents: 2850 },
      { sku: "CR005", qty: 1, unitCents: 2850 },
      { sku: "FN001", qty: 2, unitCents: 1850 },
      { sku: "FN005", qty: 1, unitCents: 4990 },
    ];

    const products = await tx.product.findMany({
      where: { sku: { in: items.map((item) => item.sku) } },
    });

    const getProduct = (sku: string) => {
      const product = products.find((p) => p.sku === sku);
      if (!product) {
        throw new Error(`Produto ${sku} não encontrado. Nada foi importado.`);
      }
      return product;
    };

    const commissionTotalCents = items.reduce((sum, item) => {
      const product = getProduct(item.sku);
      return sum + (product.commissionCents ?? 0) * item.qty;
    }, 0);

    const order = await tx.order.create({
      data: {
        number: 22,
        regionId: REGION_ID,
        clientId: client.id,
        sellerId: SELLER_ID,
        status: "CONFIRMED",
        issuedAt: ORDER_DATE,
        createdAt: ORDER_DATE,
        subtotalCents: 43490,
        discountCents: 0,
        totalCents: 43490,
        commissionTotalCents,
        paymentMethod: "BOLETO",
        paymentStatus: "PAID",
        paymentReceiver: "MATRIX",
        financialMovement: true,
        type: "SALE",

        nfeStatus: "AUTHORIZED",
        nfeNumber: "502",
        nfeKey: "42260439531220000187550010000005021951939202",

        notes:
          "Importação manual. Pedido em boleto. Vencimento em 04/05/2026 conforme PDF. Pago em 04/05/2026 conforme informado. Recebimento direto no caixa da matriz/V2. Não enviar WhatsApp, não gerar NF automática.",
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
        paymentMethod: "BOLETO",
        status: "PAID",
        amountCents: 43490,
        receivedCents: 43490,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        installmentCount: 1,
        notes: "Boleto vencido em 04/05/2026 e pago em 04/05/2026.",
        installments: {
          create: [
            {
              installmentNumber: 1,
              amountCents: 43490,
              dueDate: DUE_DATE,
              paidAt: PAID_AT,
              receivedCents: 43490,
              status: "PAID",
              notes: "Parcela única paga por boleto.",
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
        amountCents: 43490,
        paymentMethod: "BOLETO",
        receivedAt: PAID_AT,
        location: "MATRIX",
        notes: "Recebido via boleto diretamente no caixa da matriz/V2.",
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
        description: "Venda pedido 22 - Mercado Água Amarela",
        amountCents: 43490,
        regionId: REGION_ID,
        orderId: order.id,
        dueDate: DUE_DATE,
        paidAt: PAID_AT,
        competenceMonth: 5,
        competenceYear: 2026,
        isSystemGenerated: true,
        notes: "Importação manual. Boleto pago em 04/05/2026 diretamente para matriz.",
      },
    });

    console.log("Pedido 22 importado com sucesso:", order.number);
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