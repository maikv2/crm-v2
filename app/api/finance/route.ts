import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  FinanceCategoryType,
  FinanceEntryType,
  FinanceScope,
  FinanceStatus,
} from "@prisma/client";

export async function GET() {
  try {
    const transactions = await prisma.financeTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        region: {
          select: {
            id: true,
            name: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Erro ao buscar lançamentos financeiros:", error);

    return NextResponse.json(
      { error: "Erro ao buscar lançamentos financeiros." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const scopeRaw = String(body.scope ?? "").toUpperCase().trim();
    const typeRaw = String(body.type ?? "").toUpperCase().trim();
    const categoryRaw = String(body.category ?? "").toUpperCase().trim();
    const description = String(body.description ?? "").trim();

    const amountCents = Number(body.amountCents ?? 0);

    const regionId =
      typeof body.regionId === "string" && body.regionId.trim()
        ? body.regionId.trim()
        : null;

    const dueDate =
      typeof body.dueDate === "string" && body.dueDate.trim()
        ? new Date(body.dueDate)
        : null;

    const paidAt =
      typeof body.paidAt === "string" && body.paidAt.trim()
        ? new Date(body.paidAt)
        : null;

    const notes =
      typeof body.notes === "string" && body.notes.trim()
        ? body.notes.trim()
        : null;

    if (!Object.values(FinanceScope).includes(scopeRaw as FinanceScope)) {
      return NextResponse.json(
        { error: "Escopo inválido. Use MATRIX ou REGION." },
        { status: 400 }
      );
    }

    if (!Object.values(FinanceEntryType).includes(typeRaw as FinanceEntryType)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use INCOME ou EXPENSE." },
        { status: 400 }
      );
    }

    if (
      !Object.values(FinanceCategoryType).includes(
        categoryRaw as FinanceCategoryType
      )
    ) {
      return NextResponse.json(
        { error: "Categoria inválida." },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: "Descrição é obrigatória." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "Valor inválido." },
        { status: 400 }
      );
    }

    if (scopeRaw === FinanceScope.REGION && !regionId) {
      return NextResponse.json(
        { error: "Para lançamentos regionais, a região é obrigatória." },
        { status: 400 }
      );
    }

    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: "Data de vencimento inválida." },
        { status: 400 }
      );
    }

    if (paidAt && Number.isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { error: "Data de pagamento inválida." },
        { status: 400 }
      );
    }

    const transaction = await prisma.financeTransaction.create({
      data: {
        scope: scopeRaw as FinanceScope,
        type: typeRaw as FinanceEntryType,
        category: categoryRaw as FinanceCategoryType,
        status: paidAt ? FinanceStatus.PAID : FinanceStatus.PENDING,
        description,
        amountCents,
        regionId,
        dueDate,
        paidAt,
        notes,
        competenceMonth: dueDate ? dueDate.getMonth() + 1 : null,
        competenceYear: dueDate ? dueDate.getFullYear() : null,
        isSystemGenerated: false,
      },
      include: {
        region: {
          select: {
            id: true,
            name: true,
          },
        },
        investor: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar lançamento financeiro:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar lançamento financeiro.",
      },
      { status: 500 }
    );
  }
}