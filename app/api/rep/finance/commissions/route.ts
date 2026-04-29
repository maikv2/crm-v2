import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { PaymentReceiver, PaymentStatus, TransferStatus } from "@prisma/client";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json({
        items: [],
        summary: {
          total: 0,
          available: 0,
          awaitingTransfer: 0,
          awaitingPayment: 0,
        },
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        regionId: user.regionId,
        commissionTotalCents: {
          gt: 0,
        },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        receipts: {
          select: {
            id: true,
            orderId: true,
            amountCents: true,
            transfers: {
              select: {
                id: true,
                status: true,
                transferredAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let total = 0;
    let awaitingPayment = 0;
    let awaitingTransfer = 0;
    let available = 0;

    const items = orders.map((order) => {
      const commission = order.commissionTotalCents ?? 0;

      total += commission;

      let status: "AVAILABLE" | "AWAITING_TRANSFER" | "AWAITING_PAYMENT";

      const hasTransferredToMatrix = order.receipts.some((receipt) =>
        receipt.transfers.some(
          (transfer) => transfer.status === TransferStatus.TRANSFERRED
        )
      );

      if (order.paymentStatus !== PaymentStatus.PAID) {
        status = "AWAITING_PAYMENT";
        awaitingPayment += commission;
      } else if (order.paymentReceiver === PaymentReceiver.MATRIX) {
        status = "AVAILABLE";
        available += commission;
      } else if (hasTransferredToMatrix) {
        status = "AVAILABLE";
        available += commission;
      } else {
        status = "AWAITING_TRANSFER";
        awaitingTransfer += commission;
      }

      return {
        id: order.id,
        orderNumber: order.number,
        clientName: order.client?.name ?? "-",
        commissionCents: commission,
        status,
      };
    });

    return NextResponse.json({
      items,
      summary: {
        total,
        available,
        awaitingTransfer,
        awaitingPayment,
      },
    });
  } catch (error) {
    console.error("Erro ao carregar comissões:", error);

    return NextResponse.json(
      { error: "Erro ao carregar comissões." },
      { status: 500 }
    );
  }
}