"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleDollarSign, Receipt, Wallet } from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type CommissionSummaryResponse = {
  summary?: {
    total?: number;
    available?: number;
    awaitingTransfer?: number;
    awaitingPayment?: number;
  };
};

type ReceivablesResponse = {
  items?: Array<{
    id: string;
    amountCents?: number | null;
    dueDate?: string | null;
    status?: string | null;
  }>;
};

type TransfersResponse = {
  items?: Array<{
    id: string;
    amountCents?: number | null;
    status?: string | null;
  }>;
};

function Shortcut({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <MobileCard style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: colors.isDark ? "#111827" : "#e8f0ff",
              color: colors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: colors.subtext,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          </div>

          <ChevronRight size={16} color={colors.subtext} />
        </div>
      </MobileCard>
    </Link>
  );
}

export default function MobileRepFinancePage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissions, setCommissions] =
    useState<CommissionSummaryResponse | null>(null);
  const [receivables, setReceivables] =
    useState<ReceivablesResponse | null>(null);
  const [transfers, setTransfers] = useState<TransfersResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [commissionsRes, receivablesRes, transfersRes] = await Promise.all(
          [
            fetch("/api/rep/finance/commissions", { cache: "no-store" }),
            fetch("/api/rep/finance/receivables", { cache: "no-store" }),
            fetch("/api/rep/finance/transfers", { cache: "no-store" }),
          ]
        );

        const commissionsJson = await commissionsRes.json().catch(() => null);
        const receivablesJson = await receivablesRes.json().catch(() => null);
        const transfersJson = await transfersRes.json().catch(() => null);

        if (!commissionsRes.ok) {
          throw new Error(
            commissionsJson?.error || "Erro ao carregar financeiro."
          );
        }

        if (active) {
          setCommissions(commissionsJson);
          setReceivables(receivablesJson);
          setTransfers(transfersJson);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar financeiro."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const receivablesStats = useMemo(() => {
    const now = new Date();
    const items = receivables?.items ?? [];

    return items.reduce(
      (acc, item) => {
        const value = item.amountCents ?? 0;
        const isPaid = String(item.status ?? "").toUpperCase().includes("PAID");
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const overdue = !isPaid && dueDate && dueDate.getTime() < now.getTime();

        if (isPaid) acc.paid += value;
        else acc.open += value;

        if (overdue) acc.overdue += value;

        return acc;
      },
      {
        open: 0,
        overdue: 0,
        paid: 0,
      }
    );
  }, [receivables]);

  const transferStats = useMemo(() => {
    return (transfers?.items ?? []).reduce(
      (acc, item) => {
        const value = item.amountCents ?? 0;
        const status = String(item.status ?? "").toUpperCase();

        if (status.includes("PENDING")) acc.pending += value;
        else acc.done += value;

        return acc;
      },
      { pending: 0, done: 0 }
    );
  }, [transfers]);

  return (
    <MobileRepPageFrame
      title="Financeiro"
      subtitle="Resumo financeiro do representante"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando financeiro...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Total gerado"
              value={formatMoneyBR(commissions?.summary?.total ?? 0)}
              helper="Comissões acumuladas"
            />
            <MobileStatCard
              label="Aguardando pagamento"
              value={formatMoneyBR(commissions?.summary?.awaitingPayment ?? 0)}
              helper="Pedido ainda não pago"
            />
            <MobileStatCard
              label="Aguardando repasse"
              value={formatMoneyBR(commissions?.summary?.awaitingTransfer ?? 0)}
              helper="Pago pelo cliente"
            />
            <MobileStatCard
              label="Contas em aberto"
              value={formatMoneyBR(receivablesStats.open)}
              helper={formatMoneyBR(receivablesStats.overdue)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Atalhos financeiros" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/finance/commissions"
                title="Minhas comissões"
                subtitle="Acompanhar comissão gerada, pendente e disponível"
                icon={<CircleDollarSign size={18} />}
              />
              <Shortcut
                href="/m/rep/finance/receivables"
                title="Contas a receber"
                subtitle="Ver cobranças em aberto, pagas e atrasadas"
                icon={<Receipt size={18} />}
              />
              <Shortcut
                href="/m/rep/finance/transfers"
                title="Repasses"
                subtitle="Registrar e consultar repasses pelo celular"
                icon={<Wallet size={18} />}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Resumo rápido" />

            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                <span>Em aberto</span>
                <strong>{formatMoneyBR(receivablesStats.open)}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                <span>Em atraso</span>
                <strong>{formatMoneyBR(receivablesStats.overdue)}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                <span>Já pago</span>
                <strong>{formatMoneyBR(receivablesStats.paid)}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 14,
                  color: colors.text,
                }}
              >
                <span>Repasses pendentes</span>
                <strong>{formatMoneyBR(transferStats.pending)}</strong>
              </div>
            </div>
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}