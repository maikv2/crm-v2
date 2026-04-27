import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Pedido inválido." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        region: true,
        seller: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    if (!order.client) {
      return NextResponse.json(
        { error: "Pedido sem cliente vinculado." },
        { status: 400 }
      );
    }

    if (!order.items || order.items.length === 0) {
      return NextResponse.json(
        { error: "Pedido sem itens." },
        { status: 400 }
      );
    }

    const produtosSemFiscal = order.items.filter((item) => {
      return !item.product?.ncm || !item.product?.origem;
    });

    if (produtosSemFiscal.length > 0) {
      return NextResponse.json(
        {
          error: "Existem produtos sem dados fiscais.",
          detalhes: produtosSemFiscal.map((item) => ({
            produto: item.product?.name,
            sku: item.product?.sku,
            ncm: item.product?.ncm,
            origem: item.product?.origem,
          })),
        },
        { status: 400 }
      );
    }

    const clientState = String(order.client.state || "SC").toUpperCase();
    const cfop = clientState === "SC" ? "5104" : "6104";

    const itens = order.items.map((item, index) => ({
      numeroItem: index + 1,
      codigo: item.product?.sku || item.productId,
      descricao: item.product?.name || "Produto",
      ncm: item.product?.ncm,
      cest: item.product?.cest || null,
      origem: item.product?.origem || "2",
      cfop,
      quantidade: item.qty,
      valorUnitarioCents: item.unitCents,
      valorTotalCents: item.qty * item.unitCents,
    }));

    return NextResponse.json({
      ok: true,
      message: "NF-e preparada para emissão.",
      orderId: order.id,
      orderNumber: order.number,
      cfop,
      cliente: {
        nome: order.client.legalName || order.client.name,
        cnpj: order.client.cnpj,
        cpf: order.client.cpf,
        cidade: order.client.city,
        estado: order.client.state,
      },
      itens,
      totalCents: order.totalCents,
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/nfe error:", error);

    return NextResponse.json(
      { error: "Erro interno ao preparar NF-e." },
      { status: 500 }
    );
  }
}