import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceCategoryType, FinanceScope, PaymentMethod } from "@prisma/client";

export async function GET() {
  try {
    const expenses = await prisma.fixedExpense.findMany({
      include: { region: { select: { id: true, name: true } } },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    });

    // Para despesas da matriz, busca total de regiões ativas
    const activeRegionsCount = await prisma.region.count({ where: { active: true } });

    const result = expenses.map((e) => ({
      ...e,
      amountCents: e.amountCents,
      perRegionCents: e.scope === "MATRIX" && activeRegionsCount > 0
        ? Math.round(e.amountCents / activeRegionsCount)
        : null,
      activeRegionsCount: e.scope === "MATRIX" ? activeRegionsCount : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/finance/fixed-expenses error:", error);
    return NextResponse.json({ error: "Erro ao buscar despesas fixas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const description = String(body.description ?? "").trim();
    if (!description) return NextResponse.json({ error: "Descrição obrigatória." }, { status: 400 });

    const amountCents = Math.round(Number(body.amountCents ?? 0));
    if (!amountCents || amountCents <= 0) return NextResponse.json({ error: "Valor deve ser maior que zero." }, { status: 400 });

    const scopeRaw = String(body.scope ?? "").toUpperCase().trim();
    if (!Object.values(FinanceScope).includes(scopeRaw as FinanceScope)) {
      return NextResponse.json({ error: "Escopo inválido. Use MATRIX ou REGION." }, { status: 400 });
    }
    const scope = scopeRaw as FinanceScope;

    const categoryRaw = String(body.category ?? "").toUpperCase().trim();
    if (!Object.values(FinanceCategoryType).includes(categoryRaw as FinanceCategoryType)) {
      return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    }
    const category = categoryRaw as FinanceCategoryType;

    const regionId = scope === "REGION" && typeof body.regionId === "string" && body.regionId.trim()
      ? body.regionId.trim()
      : null;

    if (scope === "REGION" && !regionId) {
      return NextResponse.json({ error: "Região obrigatória para despesas regionais." }, { status: 400 });
    }

    const paymentMethodRaw = typeof body.paymentMethod === "string" && body.paymentMethod.trim()
      ? body.paymentMethod.trim().toUpperCase()
      : null;
    const paymentMethod = paymentMethodRaw && Object.values(PaymentMethod).includes(paymentMethodRaw as PaymentMethod)
      ? (paymentMethodRaw as PaymentMethod)
      : null;

    const dayOfMonth = Math.min(28, Math.max(1, Number(body.dayOfMonth ?? 1)));
    const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

    const expense = await prisma.fixedExpense.create({
      data: { description, amountCents, scope, category, regionId, paymentMethod, dayOfMonth, notes },
      include: { region: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/fixed-expenses error:", error);
    return NextResponse.json({ error: "Erro ao criar despesa fixa." }, { status: 500 });
  }
}
