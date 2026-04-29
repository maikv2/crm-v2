import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { TransferStatus } from "@prisma/client";

function normalizeIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  const single = String(value || "").trim();
  return single ? [single] : [];
}

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
        region: null,
        items: [],
      });
    }

    const [region, items] = await Promise.all([
      prisma.region.findUnique({
        where: { id: user.regionId },
        select: {
          id: true,
          name: true,
        },
      }),

      prisma.cashTransfer.findMany({
        where: {
          regionId: user.regionId,
          receipt: {
            orderId: {
              not: null,
            },
          },
        },
        select: {
          id: true,
          amountCents: true,
          transferredAt: true,
          status: true,
          notes: true,
          createdAt: true,
          receipt: {
            select: {
              id: true,
              amountCents: true,
              receivedAt: true,
              paymentMethod: true,
              orderId: true,
              order: {
                select: {
                  id: true,
                  number: true,
                  issuedAt: true,
                  totalCents: true,
                  paymentMethod: true,
                  paymentStatus: true,
                  client: {
                    select: {
                      id: true,
                      name: true,
                      tradeName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { status: "asc" },
          { createdAt: "desc" },
        ],
        take: 300,
      }),
    ]);

    return NextResponse.json({
      region,
      items,
    });
  } catch (error) {
    console.error("REP FINANCE TRANSFERS GET ERROR:", error);

    return NextResponse.json(
      { error: "Erro ao carregar repasses do representante." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    if (!user.regionId) {
      return NextResponse.json(
        { error: "Representante sem região vinculada." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const transferIds = normalizeIds(
      body?.transferIds ?? body?.transferId ?? body?.id
    );
    const notes =
      body?.notes === null || body?.notes === undefined
        ? null
        : String(body.notes).trim() || null;

    if (!transferIds.length) {
      return NextResponse.json(
        { error: "Selecione pelo menos um pedido para repassar." },
        { status: 400 }
      );
    }

    const uniqueIds = Array.from(new Set(transferIds));

    const result = await prisma.$transaction(async (tx) => {
      const pendingTransfers = await tx.cashTransfer.findMany({
        where: {
          id: { in: uniqueIds },
          regionId: user.regionId,
          status: TransferStatus.PENDING,
          receipt: {
            orderId: {
              not: null,
            },
          },
        },
        select: {
          id: true,
          amountCents: true,
          receipt: {
            select: {
              id: true,
              orderId: true,
              order: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      if (pendingTransfers.length !== uniqueIds.length) {
        throw new Error(
          "Um ou mais pedidos selecionados não estão pendentes, não pertencem à sua região ou não possuem vínculo com pedido. Atualize a tela e tente novamente."
        );
      }

      const orderIds = pendingTransfers
        .map((item) => item.receipt.orderId)
        .filter((orderId): orderId is string => Boolean(orderId));

      const uniqueOrderIds = Array.from(new Set(orderIds));

      if (uniqueOrderIds.length !== orderIds.length) {
        throw new Error(
          "Você selecionou mais de um repasse para o mesmo pedido. Selecione apenas um repasse por pedido."
        );
      }

      const alreadyTransferred = await tx.cashTransfer.findFirst({
        where: {
          id: {
            notIn: uniqueIds,
          },
          regionId: user.regionId,
          status: TransferStatus.TRANSFERRED,
          receipt: {
            orderId: {
              in: uniqueOrderIds,
            },
          },
        },
        select: {
          id: true,
          receipt: {
            select: {
              order: {
                select: {
                  number: true,
                },
              },
            },
          },
        },
      });

      if (alreadyTransferred) {
        const number = alreadyTransferred.receipt.order?.number;
        throw new Error(
          number
            ? `O pedido PED-${String(number).padStart(4, "0")} já foi repassado anteriormente.`
            : "Um dos pedidos selecionados já foi repassado anteriormente."
        );
      }

      const now = new Date();
      const totalCents = pendingTransfers.reduce(
        (sum, item) => sum + Number(item.amountCents || 0),
        0
      );

      await tx.cashTransfer.updateMany({
        where: {
          id: { in: uniqueIds },
          regionId: user.regionId,
          status: TransferStatus.PENDING,
        },
        data: {
          transferredById: user.id,
          transferredAt: now,
          status: TransferStatus.TRANSFERRED,
          notes: notes || "Repasse realizado pelo representante.",
        },
      });

      return {
        count: pendingTransfers.length,
        totalCents,
        transferredAt: now,
      };
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("REP FINANCE TRANSFERS POST ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao registrar repasse.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
