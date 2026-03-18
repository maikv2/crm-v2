import { NextResponse } from "next/server"
import { OrderType, StockMovementType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type ProductInput = {
  productId: string
  qty: number
}

type InstallBody = {
  clientId: string
  regionId: string
  sellerId?: string | null
  stockLocationId: string
  installedAt?: string
  products: ProductInput[]
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as InstallBody

    const {
      clientId,
      regionId,
      sellerId,
      stockLocationId,
      installedAt,
      products,
    } = body

    if (
      !clientId ||
      !regionId ||
      !stockLocationId ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    for (const item of products) {
      if (!item.productId || !item.qty || item.qty <= 0) {
        return NextResponse.json(
          { error: "Produtos inválidos" },
          { status: 400 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const exhibitor = await tx.exhibitor.create({
        data: {
          clientId,
          regionId,
          installedAt: installedAt ? new Date(installedAt) : new Date(),
        },
      })

      const order = await tx.order.create({
        data: {
          regionId,
          clientId,
          exhibitorId: exhibitor.id,
          sellerId: sellerId ?? null,
          type: OrderType.EXHIBITOR_INITIAL_STOCK,
          financialMovement: false,
        },
      })

      let totalCents = 0

      for (const item of products) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        })

        if (!product) {
          throw new Error(`Produto não encontrado: ${item.productId}`)
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            qty: item.qty,
            unitCents: product.priceCents,
          },
        })

        totalCents += product.priceCents * item.qty

        await tx.exhibitorInitialItem.create({
          data: {
            exhibitorId: exhibitor.id,
            productId: item.productId,
            quantity: item.qty,
          },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            stockLocationId,
            exhibitorId: exhibitor.id,
            orderId: order.id,
            type: StockMovementType.OUT,
            quantity: item.qty,
            note: "Estoque inicial do expositor",
          },
        })
      }

      await tx.order.update({
        where: { id: order.id },
        data: { totalCents },
      })

      return exhibitor
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro ao instalar expositor:", error)

    return NextResponse.json(
      { error: "Erro ao instalar expositor" },
      { status: 500 }
    )
  }
}