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
    const transferIds = normalizeIds(body?.transferIds ?? body?.transferId ?? body?.id);
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
        },
        select: {
          id: true,
          amountCents: true,
        },
      });

      if (pendingTransfers.length !== uniqueIds.length) {
        throw new Error(
          "Um ou mais pedidos selecionados não estão pendentes ou não pertencem à sua região. Atualize a tela e tente novamente."
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
