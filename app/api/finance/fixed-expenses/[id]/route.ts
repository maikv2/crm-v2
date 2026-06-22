import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceCategoryType, FinanceScope, PaymentMethod } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (typeof body.description === "string" && body.description.trim()) {
      data.description = body.description.trim();
    }
    if (body.amountCents !== undefined) {
      const v = Math.round(Number(body.amountCents));
      if (v > 0) data.amountCents = v;
    }
    if (typeof body.scope === "string") {
      const s = body.scope.toUpperCase().trim();
      if (Object.values(FinanceScope).includes(s as FinanceScope)) data.scope = s;
    }
    if (typeof body.category === "string") {
      const c = body.category.toUpperCase().trim();
      if (Object.values(FinanceCategoryType).includes(c as FinanceCategoryType)) data.category = c;
    }
    if (body.regionId !== undefined) {
      data.regionId = typeof body.regionId === "string" && body.regionId.trim() ? body.regionId.trim() : null;
    }
    if (body.active !== undefined) data.active = Boolean(body.active);
    if (body.dayOfMonth !== undefined) data.dayOfMonth = Math.min(28, Math.max(1, Number(body.dayOfMonth)));
    if (body.notes !== undefined) {
      data.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
    }
    if (body.paymentMethod !== undefined) {
      const pm = typeof body.paymentMethod === "string" ? body.paymentMethod.toUpperCase().trim() : null;
      data.paymentMethod = pm && Object.values(PaymentMethod).includes(pm as PaymentMethod) ? pm : null;
    }

    const expense = await prisma.fixedExpense.update({
      where: { id },
      data,
      include: { region: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("PUT /api/finance/fixed-expenses/[id] error:", error);
    return NextResponse.json({ error: "Erro ao atualizar despesa fixa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    await prisma.fixedExpense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/finance/fixed-expenses/[id] error:", error);
    return NextResponse.json({ error: "Erro ao excluir despesa fixa." }, { status: 500 });
  }
}
