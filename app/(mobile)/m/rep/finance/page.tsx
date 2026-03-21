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

type CommissionsResponse = {
  items?: Array<{
    id: string;
    orderNumber?: number | null;
    clientName?: string | null;
    commissionCents?: number | null;
    status?: string | null;
  }>;
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

export default function RepFinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<CommissionsResponse | null>(
    null
  );
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(
    null
  );
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

        const commissionsJson = (await commissionsRes
          .json()
          .catch(() => null)) as CommissionsResponse | null;
        const receivablesJson = (await receivablesRes
          .json()
          .catch(() => null)) as ReceivablesResponse | null;
        const transfersJson = (await transfersRes
          .json()
          .catch(() => null)) as TransfersResponse | null;

        if (!commissionsRes.ok) {
          throw new Error(
            (commissionsJson as any)?.error || "Erro ao carregar financeiro."
          );
        }

        if (active) {
          setCommissions(commissionsJson);
          setReceivables(receivablesJson);
          setTransfers(transfersJson);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar financeiro."
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

  const receivablesSummary = useMemo(() => {
    const now = new Date();
    return (receivables?.items ?? []).reduce(
      (acc, item) => {
        const value = item.amountCents ?? 0;
        const status = String(item.status ?? "").toUpperCase();
        const isPaid = status.includes("PAID");
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const overdue = !isPaid && dueDate && dueDate.getTime() < now.getTime();

        if (isPaid) acc.paid += value;
        else acc.open += value;
        if (overdue) acc.overdue += value;
        return acc;
      },
      { open: 0, overdue: 0, paid: 0 }
    );
  }, [receivables]);

  const transfersSummary = useMemo(() => {
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
      subtitle="Minhas comissões, contas a receber e repasses"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando financeiro...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <MobileCard>
            <MobileSectionTitle title="Minhas comissões" />
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
              />
              <MobileStatCard
                label="Aguardando pagamento"
                value={formatMoneyBR(commissions?.summary?.awaitingPayment ?? 0)}
              />
              <MobileStatCard
                label="Aguardando repasse"
                value={formatMoneyBR(
                  commissions?.summary?.awaitingTransfer ?? 0
                )}
              />
              <MobileStatCard
                label="Disponível"
                value={formatMoneyBR(commissions?.summary?.available ?? 0)}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Contas a receber da região" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: 12,
              }}
            >
              <MobileStatCard
                label="Em aberto"
                value={formatMoneyBR(receivablesSummary.open)}
              />
              <MobileStatCard
                label="Em atraso"
                value={formatMoneyBR(receivablesSummary.overdue)}
              />
              <MobileStatCard
                label="Já pagas"
                value={formatMoneyBR(receivablesSummary.paid)}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Repasses" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 12,
              }}
            >
              <MobileStatCard
                label="Pendentes"
                value={formatMoneyBR(transfersSummary.pending)}
              />
              <MobileStatCard
                label="Realizados"
                value={formatMoneyBR(transfersSummary.done)}
              />
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Abrir detalhes" />
            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/finance/commissions"
                title="Minhas comissões"
                subtitle="Ver comissão por pedido e status"
                icon={<CircleDollarSign size={18} />}
              />
              <Shortcut
                href="/m/rep/finance/receivables"
                title="Contas a receber"
                subtitle="Ver o que foi pago, aberto e atrasado"
                icon={<Receipt size={18} />}
              />
              <Shortcut
                href="/m/rep/finance/transfers"
                title="Repasses"
                subtitle="Registrar e consultar repasses"
                icon={<Wallet size={18} />}
              />
            </div>
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}