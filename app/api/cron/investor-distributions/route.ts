import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalculateRegionMonthlyResult } from "@/lib/region-financial-engine";
import { generateInvestorDistributions } from "@/lib/investor-distribution";
import {
  normalizeBrazilPhone,
  sendText,
  ZApiConfigError,
  ZApiRequestError,
} from "@/lib/zapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Todo dia 10, fecha o mês anterior em regime de caixa (só conta o que foi
// efetivamente recebido — vendas parceladas entram no mês da parcela paga,
// não no mês da venda), avisa o financeiro por WhatsApp para confirmar o
// pagamento via Pix manualmente, e manda um relatório (vendas, despesas e
// divisão de lucro) para o WhatsApp cadastrado de cada investidor. O sistema
// NUNCA transfere dinheiro sozinho — mesmo padrão já usado no fechamento
// semanal de comissão dos representantes.

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function getPreviousMonthPeriod(now = new Date()) {
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const month = currentMonth === 1 ? 12 : currentMonth - 1;
  const year = currentMonth === 1 ? currentYear - 1 : currentYear;
  return { month, year };
}

async function getFinanceContact() {
  const financeUser =
    (await prisma.user.findFirst({
      where: {
        role: "ADMINISTRATIVE",
        active: true,
        name: { contains: "Patricia", mode: "insensitive" },
      },
      select: { id: true, name: true, phone: true },
    })) ||
    (await prisma.user.findFirst({
      where: { role: "ADMINISTRATIVE", active: true, phone: { not: null } },
      select: { id: true, name: true, phone: true },
    }));

  const phone =
    normalizeBrazilPhone(financeUser?.phone) ||
    normalizeBrazilPhone(process.env.FINANCIAL_WHATSAPP);

  if (!phone) return null;

  return {
    name: financeUser?.name || "Financeiro",
    phone,
  };
}

type InvestorReportRegionEntry = {
  regionName: string;
  grossRevenueCents: number;
  cmvCents: number;
  logisticsCents: number;
  commissionCents: number;
  taxesCents: number;
  administrativeCents: number;
  operatingProfitCents: number;
  stockReplenishmentCents: number;
  distributableCents: number;
  investorPoolCents: number;
  companyPoolCents: number;
  quotaCount: number;
  totalDistributionCents: number;
};

type InvestorReport = {
  investorId: string;
  investorName: string;
  investorPhone: string | null;
  regions: InvestorReportRegionEntry[];
};

function buildInvestorReportMessage(
  report: InvestorReport,
  periodLabel: string,
  payoutDateLabel: string
) {
  const lines: string[] = [
    `*Relatório mensal - ${report.investorName}*`,
    `Referência: ${periodLabel}`,
    "",
  ];

  let totalCents = 0;

  for (const region of report.regions) {
    totalCents += region.totalDistributionCents;

    lines.push(`*Região: ${region.regionName}*`);
    lines.push(`Vendas recebidas no mês: ${money(region.grossRevenueCents)}`);
    lines.push("Despesas:");
    lines.push(`  CMV: ${money(region.cmvCents)}`);
    lines.push(`  Logística: ${money(region.logisticsCents)}`);
    lines.push(`  Comissão: ${money(region.commissionCents)}`);
    lines.push(`  Impostos: ${money(region.taxesCents)}`);
    lines.push(`  Administrativo: ${money(region.administrativeCents)}`);
    lines.push(`Lucro operacional: ${money(region.operatingProfitCents)}`);
    lines.push(`Reposição de estoque (30%): ${money(region.stockReplenishmentCents)}`);
    lines.push(`Base distribuída (70%): ${money(region.distributableCents)}`);
    lines.push(
      `  → Investidores (60%): ${money(region.investorPoolCents)} | Empresa (40%): ${money(region.companyPoolCents)}`
    );
    lines.push(`Suas cotas nesta região: ${region.quotaCount}`);
    lines.push(`Seu valor: ${money(region.totalDistributionCents)}`);
    lines.push("");
  }

  lines.push(`*Total a receber: ${money(totalCents)}*`);
  lines.push(`Pagamento em: ${payoutDateLabel}`);
  lines.push("");
  lines.push(
    "Regra: só entra o que já foi efetivamente recebido no período (vendas parceladas contam quando a parcela é paga)."
  );

  return lines.join("\n");
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { month, year } = getPreviousMonthPeriod();
    const periodLabel = `${String(month).padStart(2, "0")}/${year}`;
    const payoutDateLabel = new Date().toLocaleDateString("pt-BR");

    const financeContact = await getFinanceContact();

    const regions = await prisma.region.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const investorPhones = new Map<string, string>();
    for (const investor of await prisma.investor.findMany({
      select: { id: true, phone: true },
    })) {
      const phone = normalizeBrazilPhone(investor.phone);
      if (phone) investorPhones.set(investor.id, phone);
    }

    const investorReports = new Map<string, InvestorReport>();

    const results: Array<{
      regionId: string;
      regionName: string;
      generatedCount: number;
      requested: Array<{ investorName: string; amountCents: number; sent: boolean }>;
      error?: string;
    }> = [];

    for (const region of regions) {
      try {
        const snapshot = await recalculateRegionMonthlyResult(region.id, month, year);
        const generated = await generateInvestorDistributions(region.id, month, year);

        const requested: Array<{ investorName: string; amountCents: number; sent: boolean }> = [];

        for (const investor of generated.investors) {
          if (investor.totalDistributionCents <= 0) continue;

          const distribution = await prisma.investorDistribution.findUnique({
            where: {
              regionId_investorId_month_year: {
                regionId: region.id,
                investorId: investor.investorId,
                month,
                year,
              },
            },
            select: { id: true, status: true, totalDistributionCents: true },
          });

          if (!distribution || distribution.status === "PAID") continue;

          const marker = `investor_payment_request:monthly:${distribution.id}`;

          const existing = await prisma.financeTransaction.findFirst({
            where: {
              investorId: investor.investorId,
              category: "INVESTOR_DISTRIBUTION",
              notes: marker,
            },
            select: { id: true },
          });

          if (existing) {
            // Já solicitado antes (pelo próprio investidor no portal, ou por
            // uma execução anterior deste cron) — não duplica nem reenvia o
            // relatório.
            continue;
          }

          // Acumula os dados desta região para o relatório consolidado do investidor
          // (ele pode ter cotas em mais de uma região).
          const existingReport = investorReports.get(investor.investorId);
          const regionEntry: InvestorReportRegionEntry = {
            regionName: region.name,
            grossRevenueCents: snapshot.grossRevenueCents,
            cmvCents: snapshot.cmvCents,
            logisticsCents: snapshot.logisticsCents,
            commissionCents: snapshot.commissionCents,
            taxesCents: snapshot.taxesCents,
            administrativeCents: snapshot.administrativeCents,
            operatingProfitCents: snapshot.operatingProfitCents,
            stockReplenishmentCents: snapshot.stockReplenishmentCents,
            distributableCents: snapshot.distributableCents,
            // Por cota (não 60/40 "cego" sobre o total): descontam-se as cotas
            // ainda não vendidas a nenhum investidor, que ficam com a empresa.
            investorPoolCents: generated.investorPoolCents,
            companyPoolCents: generated.companyPoolCents,
            quotaCount: investor.quotaCount,
            totalDistributionCents: distribution.totalDistributionCents,
          };

          if (existingReport) {
            existingReport.regions.push(regionEntry);
          } else {
            investorReports.set(investor.investorId, {
              investorId: investor.investorId,
              investorName: investor.investorName,
              investorPhone: investorPhones.get(investor.investorId) ?? null,
              regions: [regionEntry],
            });
          }

          const transaction = await prisma.financeTransaction.create({
            data: {
              scope: "REGION",
              type: "EXPENSE",
              status: "PENDING",
              category: "INVESTOR_DISTRIBUTION",
              description: `Pagamento automático (dia 10) - Distribuição mensal - ${investor.investorName} - ${periodLabel}`,
              amountCents: distribution.totalDistributionCents,
              regionId: region.id,
              investorId: investor.investorId,
              dueDate: new Date(),
              competenceMonth: month,
              competenceYear: year,
              isSystemGenerated: true,
              notes: marker,
            },
            select: { id: true },
          });

          let sent = false;

          if (financeContact) {
            const message = [
              "*Pagamento automático de investidor (dia 10)*",
              "",
              `Investidor: ${investor.investorName}`,
              investor.investorEmail ? `E-mail: ${investor.investorEmail}` : null,
              `Referência: ${periodLabel}`,
              `Região: ${region.name}`,
              `Cotas: ${investor.quotaCount}`,
              `Valor: ${money(distribution.totalDistributionCents)}`,
              "",
              "Base: regime de caixa (só valores já recebidos no período; vendas parceladas entram no mês da parcela paga).",
              `Lançamento financeiro: ${transaction.id}`,
            ]
              .filter(Boolean)
              .join("\n");

            try {
              await sendText({ phone: financeContact.phone, message });
              sent = true;
            } catch (sendError) {
              console.error(
                `Erro ao enviar WhatsApp para o financeiro (investidor ${investor.investorName}):`,
                sendError
              );
            }
          }

          requested.push({
            investorName: investor.investorName,
            amountCents: distribution.totalDistributionCents,
            sent,
          });
        }

        results.push({
          regionId: region.id,
          regionName: region.name,
          generatedCount: generated.generatedCount,
          requested,
        });
      } catch (error) {
        results.push({
          regionId: region.id,
          regionName: region.name,
          generatedCount: 0,
          requested: [],
          error:
            error instanceof Error
              ? error.message
              : "Erro ao processar distribuição da região.",
        });
      }
    }

    // Envia o relatório consolidado (vendas, despesas e divisão de lucro) para
    // o WhatsApp de cada investidor.
    const investorReportResults: Array<{
      investorName: string;
      sent: boolean;
      reason?: string;
    }> = [];

    for (const report of investorReports.values()) {
      if (!report.investorPhone) {
        investorReportResults.push({
          investorName: report.investorName,
          sent: false,
          reason: "Investidor sem WhatsApp cadastrado.",
        });
        continue;
      }

      const message = buildInvestorReportMessage(report, periodLabel, payoutDateLabel);

      try {
        await sendText({ phone: report.investorPhone, message });
        investorReportResults.push({ investorName: report.investorName, sent: true });
      } catch (sendError) {
        console.error(
          `Erro ao enviar relatório WhatsApp para o investidor ${report.investorName}:`,
          sendError
        );
        investorReportResults.push({
          investorName: report.investorName,
          sent: false,
          reason: sendError instanceof Error ? sendError.message : "Erro ao enviar.",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      period: { month, year, label: periodLabel },
      financeContact: financeContact
        ? { name: financeContact.name, phone: financeContact.phone }
        : null,
      regions: results,
      investorReports: investorReportResults,
    });
  } catch (error) {
    if (error instanceof ZApiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof ZApiRequestError) {
      return NextResponse.json(
        { error: error.message, detalhes: error.payload },
        { status: 502 }
      );
    }

    console.error("GET /api/cron/investor-distributions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar pagamento automático de investidores.",
      },
      { status: 500 }
    );
  }
}
