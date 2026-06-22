import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceEntryType, FinanceScope, FinanceStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Mês/ano alvo (padrão: mês atual)
    const now = new Date();
    const month = Number(body.month ?? now.getMonth() + 1);
    const year = Number(body.year ?? now.getFullYear());

    // Data de vencimento base (dia configurado em cada despesa)
    function dueDate(day: number) {
      return new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
    }

    const [fixedExpenses, activeRegions] = await Promise.all([
      prisma.fixedExpense.findMany({
        where: { active: true },
        include: { region: { select: { id: true, name: true } } },
      }),
      prisma.region.findMany({ where: { active: true }, select: { id: true, name: true } }),
    ]);

    if (fixedExpenses.length === 0) {
      return NextResponse.json({ ok: true, created: 0, message: "Nenhuma despesa fixa ativa." });
    }

    const created: string[] = [];
    const skipped: string[] = [];

    for (const fe of fixedExpenses) {
      if (fe.scope === FinanceScope.REGION) {
        // Despesa regional: cria um único lançamento para a região
        if (!fe.regionId) { skipped.push(fe.id); continue; }

        const already = await prisma.financeTransaction.findFirst({
          where: {
            description: `[Fixa] ${fe.description}`,
            regionId: fe.regionId,
            competenceMonth: month,
            competenceYear: year,
          },
        });
        if (already) { skipped.push(fe.id); continue; }

        await prisma.financeTransaction.create({
          data: {
            scope: FinanceScope.REGION,
            type: FinanceEntryType.EXPENSE,
            status: FinanceStatus.PENDING,
            category: fe.category,
            description: `[Fixa] ${fe.description}`,
            amountCents: fe.amountCents,
            regionId: fe.regionId,
            paymentMethod: fe.paymentMethod ?? undefined,
            dueDate: dueDate(fe.dayOfMonth),
            competenceMonth: month,
            competenceYear: year,
            notes: fe.notes ?? `Despesa fixa recorrente — gerada automaticamente`,
            isSystemGenerated: true,
          },
        });
        created.push(fe.id);

      } else {
        // Despesa da matriz: divide igualmente entre todas as regiões ativas
        if (activeRegions.length === 0) { skipped.push(fe.id); continue; }

        const perRegionCents = Math.round(fe.amountCents / activeRegions.length);
        let anyCreated = false;

        for (const region of activeRegions) {
          const already = await prisma.financeTransaction.findFirst({
            where: {
              description: `[Fixa Matriz] ${fe.description}`,
              regionId: region.id,
              competenceMonth: month,
              competenceYear: year,
            },
          });
          if (already) continue;

          await prisma.financeTransaction.create({
            data: {
              scope: FinanceScope.REGION,
              type: FinanceEntryType.EXPENSE,
              status: FinanceStatus.PENDING,
              category: fe.category,
              description: `[Fixa Matriz] ${fe.description}`,
              amountCents: perRegionCents,
              regionId: region.id,
              paymentMethod: fe.paymentMethod ?? undefined,
              dueDate: dueDate(fe.dayOfMonth),
              competenceMonth: month,
              competenceYear: year,
              notes: `Despesa fixa da matriz dividida por ${activeRegions.length} regiões (total: R$ ${(fe.amountCents / 100).toFixed(2)})`,
              isSystemGenerated: true,
            },
          });
          anyCreated = true;
        }

        if (anyCreated) created.push(fe.id);
        else skipped.push(fe.id);
      }
    }

    return NextResponse.json({
      ok: true,
      month,
      year,
      created: created.length,
      skipped: skipped.length,
      activeRegions: activeRegions.length,
      message: `${created.length} despesa(s) lançada(s) para ${month}/${year}. ${skipped.length} já existiam.`,
    });
  } catch (error) {
    console.error("POST /api/finance/fixed-expenses/generate-month error:", error);
    return NextResponse.json({ error: "Erro ao gerar lançamentos." }, { status: 500 });
  }
}
