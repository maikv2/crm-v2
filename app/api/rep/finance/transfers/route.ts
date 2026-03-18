import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-user";
import { TransferStatus } from "@prisma/client";

function toInt(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
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
          receipt: {
            select: {
              id: true,
              amountCents: true,
              receivedAt: true,
            },
          },
        },
        orderBy: [
          { transferredAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 200,
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

    const body = await request.json();

    const amountCents = Math.max(0, toInt(body?.amountCents, 0));
    const notes =
      body?.notes === null || body?.notes === undefined
        ? null
        : String(body.notes).trim() || null;

    if (amountCents <= 0) {
      return NextResponse.json(
        { error: "Informe um valor de repasse válido." },
        { status: 400 }
      );
    }

    const pendingReceipt = await prisma.receipt.findFirst({
      where: {
        regionId: user.regionId,
        paymentMethod: "CASH",
        transfers: {
          none: {},
        },
      },
      orderBy: {
        receivedAt: "desc",
      },
      select: {
        id: true,
        amountCents: true,
      },
    });

    const transfer = await prisma.cashTransfer.create({
      data: {
        receiptId: pendingReceipt?.id ?? (
          await prisma.receipt.create({
            data: {
              accountsReceivableId: (
                await prisma.accountsReceivable.findFirst({
                  where: {
                    regionId: user.regionId,
                  },
                  select: { id: true },
                  orderBy: { createdAt: "desc" },
                })
              )?.id ?? (() => {
                throw new Error(
                  "Não foi possível registrar o repasse porque não existe uma conta a receber base na região."
                );
              })(),
              regionId: user.regionId,
              receivedById: user.id,
              amountCents,
              paymentMethod: "CASH",
              receivedAt: new Date(),
              location: "REGION",
              notes: "Recibo técnico criado automaticamente para registrar repasse à matriz.",
            },
            select: {
              id: true,
            },
          })
        ).id,
        regionId: user.regionId,
        transferredById: user.id,
        amountCents,
        transferredAt: new Date(),
        status: TransferStatus.TRANSFERRED,
        notes,
      },
      select: {
        id: true,
        amountCents: true,
        transferredAt: true,
        status: true,
        notes: true,
      },
    });

    return NextResponse.json({
      ok: true,
      item: transfer,
    });
  } catch (error) {
    console.error("REP FINANCE TRANSFERS POST ERROR:", error);

    const message =
      error instanceof Error ? error.message : "Erro ao registrar repasse.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}