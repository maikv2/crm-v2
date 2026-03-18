import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinanceStatus, PortalOrderRequestStatus, ReceivableStatus } from "@prisma/client";

type AlertSeverity = "critical" | "high" | "medium" | "low";
type AlertStatus = "pending" | "info" | "done";

type AlertItem = {
  id: string;
  kind: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  regionName: string | null;
  occurredAt: string;
  href: string;
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function centsToMoney(cents: number) {
  return (cents ?? 0) / 100;
}

function buildAlert(params: {
  id: string;
  kind: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  regionName?: string | null;
  occurredAt: Date | string;
  href: string;
}): AlertItem {
  return {
    id: params.id,
    kind: params.kind,
    severity: params.severity,
    status: params.status,
    title: params.title,
    description: params.description,
    regionName: params.regionName ?? null,
    occurredAt:
      params.occurredAt instanceof Date
        ? params.occurredAt.toISOString()
        : new Date(params.occurredAt).toISOString(),
    href: params.href,
  };
}

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const sevenDaysAgo = addDays(todayStart, -7);

    const [
      portalOrderRequests,
      overdueReceivables,
      receivablesDueToday,
      overdueFinance,
      financeDueToday,
      pendingCashTransfers,
      recentOrders,
      recentClients,
      recentExhibitors,
      recentMaintenances,
      pendingInvestorDistributions,
      pendingRepresentativeCommissions,
      openRepresentativeSettlements,
      recentReceipts,
      recentVisits,
    ] = await prisma.$transaction([
      prisma.portalOrderRequest.findMany({
        where: {
          status: PortalOrderRequestStatus.PENDING,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL, ReceivableStatus.OVERDUE],
          },
          dueDate: {
            lt: todayStart,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
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
        orderBy: {
          dueDate: "asc",
        },
        take: 20,
      }),

      prisma.accountsReceivable.findMany({
        where: {
          status: {
            in: [ReceivableStatus.PENDING, ReceivableStatus.PARTIAL, ReceivableStatus.OVERDUE],
          },
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
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
        orderBy: {
          dueDate: "asc",
        },
        take: 20,
      }),

      prisma.financeTransaction.findMany({
        where: {
          status: FinanceStatus.PENDING,
          dueDate: {
            lt: todayStart,
          },
        },
        include: {
          region: {
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
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 20,
      }),

      prisma.financeTransaction.findMany({
        where: {
          status: FinanceStatus.PENDING,
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          region: {
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
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: 20,
      }),

      prisma.cashTransfer.findMany({
        where: {
          status: "PENDING",
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          transferredBy: {
            select: {
              id: true,
              name: true,
            },
          },
          receipt: {
            select: {
              id: true,
              amountCents: true,
              receivedAt: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.order.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.client.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.exhibitor.findMany({
        where: {
          installedAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          installedAt: "desc",
        },
        take: 20,
      }),

      prisma.exhibitorMaintenance.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          exhibitor: {
            select: {
              id: true,
              code: true,
              name: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.investorDistribution.findMany({
        where: {
          status: FinanceStatus.PENDING,
        },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
          region: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            year: "desc",
          },
          {
            month: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 20,
      }),

      prisma.representativeCommission.findMany({
        where: {
          status: FinanceStatus.PENDING,
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          representative: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            year: "desc",
          },
          {
            month: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 20,
      }),

      prisma.representativeSettlement.findMany({
        where: {
          status: "OPEN",
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          representative: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          weekEnd: "desc",
        },
        take: 20,
      }),

      prisma.receipt.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          region: {
            select: {
              id: true,
              name: true,
            },
          },
          receivedBy: {
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
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),

      prisma.visit.findMany({
        where: {
          visitedAt: {
            gte: sevenDaysAgo,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              region: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          exhibitor: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          visitedAt: "desc",
        },
        take: 20,
      }),
    ]);

    const alerts: AlertItem[] = [];

    for (const item of portalOrderRequests) {
      const totalItems = item.items.reduce((sum, current) => sum + current.quantity, 0);

      alerts.push(
        buildAlert({
          id: `portal-order-request-${item.id}`,
          kind: "portal_order_request",
          severity: "high",
          status: "pending",
          title: "Solicitação de produtos do cliente",
          description: `${item.client.name} solicitou ${totalItems} item(ns) pelo portal do cliente e aguarda atendimento.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/portal-orders",
        })
      );
    }

    for (const item of overdueReceivables) {
      alerts.push(
        buildAlert({
          id: `receivable-overdue-${item.id}`,
          kind: "receivable_overdue",
          severity: "critical",
          status: "pending",
          title: "Boleto / conta a receber em atraso",
          description: `${item.client.name} possui recebível em atraso no valor de R$ ${centsToMoney(
            item.amountCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}. Pedido #${item.order.number}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.dueDate ?? item.createdAt,
          href: "/finance/accounts-receivable",
        })
      );
    }

    for (const item of receivablesDueToday) {
      alerts.push(
        buildAlert({
          id: `receivable-due-today-${item.id}`,
          kind: "receivable_due_today",
          severity: "high",
          status: "pending",
          title: "Conta a receber vence hoje",
          description: `${item.client.name} tem recebível vencendo hoje no valor de R$ ${centsToMoney(
            item.amountCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}. Pedido #${item.order.number}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.dueDate ?? item.createdAt,
          href: "/finance/accounts-receivable",
        })
      );
    }

    for (const item of overdueFinance) {
      alerts.push(
        buildAlert({
          id: `finance-overdue-${item.id}`,
          kind: "finance_overdue",
          severity: "critical",
          status: "pending",
          title: "Despesa / lançamento financeiro em atraso",
          description: `${item.description} está vencido e ainda pendente, no valor de R$ ${centsToMoney(
            item.amountCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.dueDate ?? item.createdAt,
          href: "/finance",
        })
      );
    }

    for (const item of financeDueToday) {
      alerts.push(
        buildAlert({
          id: `finance-due-today-${item.id}`,
          kind: "finance_due_today",
          severity: "high",
          status: "pending",
          title: "Despesa / lançamento vence hoje",
          description: `${item.description} vence hoje no valor de R$ ${centsToMoney(
            item.amountCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.dueDate ?? item.createdAt,
          href: "/finance",
        })
      );
    }

    for (const item of pendingCashTransfers) {
      alerts.push(
        buildAlert({
          id: `cash-transfer-${item.id}`,
          kind: "cash_transfer_pending",
          severity: "high",
          status: "pending",
          title: "Repasse pendente para a matriz",
          description: `Existe um repasse pendente de R$ ${centsToMoney(item.amountCents).toLocaleString(
            "pt-BR",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }
          )}${item.transferredBy?.name ? ` lançado por ${item.transferredBy.name}` : ""}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/finance/transfers",
        })
      );
    }

    for (const item of recentOrders) {
      alerts.push(
        buildAlert({
          id: `order-${item.id}`,
          kind: "new_order",
          severity: "medium",
          status: "info",
          title: "Novo pedido registrado",
          description: `Pedido #${item.number} criado para ${item.client.name} no valor de R$ ${centsToMoney(
            item.totalCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}${item.seller?.name ? ` por ${item.seller.name}` : ""}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/orders",
        })
      );
    }

    for (const item of recentClients) {
      alerts.push(
        buildAlert({
          id: `client-${item.id}`,
          kind: "new_client",
          severity: "low",
          status: "info",
          title: "Novo cliente cadastrado",
          description: `${item.name} foi cadastrado no sistema.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/clients",
        })
      );
    }

    for (const item of recentExhibitors) {
      alerts.push(
        buildAlert({
          id: `exhibitor-${item.id}`,
          kind: "new_exhibitor",
          severity: "medium",
          status: "info",
          title: "Novo expositor registrado",
          description: `${item.code ?? item.name ?? "Expositor"} foi vinculado ao cliente ${item.client.name}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.installedAt,
          href: "/exhibitors",
        })
      );
    }

    for (const item of recentMaintenances) {
      alerts.push(
        buildAlert({
          id: `maintenance-${item.id}`,
          kind: "maintenance_recorded",
          severity: "medium",
          status: "info",
          title: "Manutenção de expositor registrada",
          description: `${item.type} no expositor ${
            item.exhibitor.code ?? item.exhibitor.name ?? item.exhibitor.id
          } do cliente ${item.exhibitor.client.name}${item.user?.name ? ` por ${item.user.name}` : ""}.`,
          regionName: item.exhibitor.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/exhibitors",
        })
      );
    }

    for (const item of pendingInvestorDistributions) {
      alerts.push(
        buildAlert({
          id: `investor-distribution-${item.id}`,
          kind: "investor_distribution_pending",
          severity: "high",
          status: "pending",
          title: "Pagamento de investidor pendente",
          description: `${item.investor.name} possui distribuição pendente de R$ ${centsToMoney(
            item.totalDistributionCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} referente a ${String(item.month).padStart(2, "0")}/${item.year}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/investors",
        })
      );
    }

    for (const item of pendingRepresentativeCommissions) {
      alerts.push(
        buildAlert({
          id: `representative-commission-${item.id}`,
          kind: "representative_commission_pending",
          severity: "high",
          status: "pending",
          title: "Comissão de representante pendente",
          description: `${item.representative.name} possui comissão pendente de R$ ${centsToMoney(
            item.commissionCents
          ).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} referente a ${String(item.month).padStart(2, "0")}/${item.year}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/commissions",
        })
      );
    }

    for (const item of openRepresentativeSettlements) {
      alerts.push(
        buildAlert({
          id: `representative-settlement-${item.id}`,
          kind: "representative_settlement_open",
          severity: "medium",
          status: "pending",
          title: "Acerto semanal em aberto",
          description: `Há um acerto semanal em aberto${
            item.representative?.name ? ` para ${item.representative.name}` : ""
          } com saldo líquido de R$ ${centsToMoney(item.netSettlementCents).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.weekEnd,
          href: "/finance/representative-settlements",
        })
      );
    }

    for (const item of recentReceipts) {
      alerts.push(
        buildAlert({
          id: `receipt-${item.id}`,
          kind: "receipt_registered",
          severity: "low",
          status: "done",
          title: "Recebimento registrado",
          description: `Recebimento de R$ ${centsToMoney(item.amountCents).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}${item.receivedBy?.name ? ` lançado por ${item.receivedBy.name}` : ""}${
            item.order?.number ? ` no pedido #${item.order.number}` : ""
          }.`,
          regionName: item.region?.name ?? null,
          occurredAt: item.createdAt,
          href: "/finance/receipts",
        })
      );
    }

    for (const item of recentVisits) {
      alerts.push(
        buildAlert({
          id: `visit-${item.id}`,
          kind: "visit_registered",
          severity: "low",
          status: "info",
          title: "Visita registrada",
          description: `${item.user?.name ?? "Um usuário"} registrou visita para ${
            item.client.name
          }${item.hadSale ? " com venda" : ""}${item.maintenanceDone ? ", com manutenção" : ""}.`,
          regionName: item.client.region?.name ?? null,
          occurredAt: item.visitedAt,
          href: "/visits",
        })
      );
    }

    alerts.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    const limitedAlerts = alerts.slice(0, 120);

    const summary = {
      total: limitedAlerts.length,
      critical: limitedAlerts.filter((item) => item.severity === "critical").length,
      high: limitedAlerts.filter((item) => item.severity === "high").length,
      medium: limitedAlerts.filter((item) => item.severity === "medium").length,
      low: limitedAlerts.filter((item) => item.severity === "low").length,
      pendingAction: limitedAlerts.filter((item) => item.status === "pending").length,
      today: limitedAlerts.filter((item) => {
        const occurredAt = new Date(item.occurredAt);
        return occurredAt >= todayStart && occurredAt <= todayEnd;
      }).length,
    };

    const byKindMap = new Map<string, number>();
    const byRegionMap = new Map<string, number>();

    for (const item of limitedAlerts) {
      byKindMap.set(item.kind, (byKindMap.get(item.kind) ?? 0) + 1);

      const regionKey = item.regionName?.trim() || "Sem região";
      byRegionMap.set(regionKey, (byRegionMap.get(regionKey) ?? 0) + 1);
    }

    const byKind = Array.from(byKindMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const byRegion = Array.from(byRegionMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      summary,
      alerts: limitedAlerts,
      byKind,
      byRegion,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Error loading alerts overview:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar a central de avisos.",
      },
      { status: 500 }
    );
  }
}