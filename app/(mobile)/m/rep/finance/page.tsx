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
  dayCommissionCents?: number;
  weekCommissionCents?: number;
  monthCommissionCents?: number;
  totalGeneratedCents?: number;
  awaitingTransferCents?: number;
  transferredCents?: number;
};

type ReceivableItem = {
  id: string;
  clientName?: string | null;
  amountCents?: number | null;
  dueDate?: string | null;
  status?: string | null;
};

type ReceivablesResponse = {
  items?: ReceivableItem[];
  totalOpenCents?: number;
  overdueCents?: number;
  paidCents?: number;
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

  const [commissions, setCommissions] = useState<CommissionsResponse | null>(
    null
  );
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(
    null
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [commissionsRes, receivablesRes] = await Promise.all([
          fetch("/api/rep/commissions", { cache: "no-store" }),
          fetch("/api/rep/receivables", { cache: "no-store" }),
        ]);

        const commissionsJson = await commissionsRes.json().catch(() => null);
        const receivablesJson = await receivablesRes.json().catch(() => null);

        if (!commissionsRes.ok) {
          throw new Error(
            commissionsJson?.error || "Erro ao carregar comissões."
          );
        }

        if (active) {
          setCommissions(commissionsJson);
          setReceivables(receivablesRes.ok ? receivablesJson : null);
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

  const receivableStats = useMemo(() => {
    const items = receivables?.items ?? [];
    return {
      totalItems: items.length,
      totalOpenCents: receivables?.totalOpenCents ?? 0,
      overdueCents: receivables?.overdueCents ?? 0,
      paidCents: receivables?.paidCents ?? 0,
    };
  }, [receivables]);

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
          <MobileCard style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: colors.subtext,
                marginBottom: 8,
              }}
            >
              Comissão do mês
            </div>

            <div
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                fontWeight: 900,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {formatMoneyBR(commissions?.monthCommissionCents ?? 0)}
            </div>

            <div
              style={{
                fontSize: 13,
                color: colors.subtext,
              }}
            >
              Semana: {formatMoneyBR(commissions?.weekCommissionCents ?? 0)} •
              Hoje: {formatMoneyBR(commissions?.dayCommissionCents ?? 0)}
            </div>
          </MobileCard>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Total gerado"
              value={formatMoneyBR(commissions?.totalGeneratedCents ?? 0)}
              helper="Comissões acumuladas"
            />
            <MobileStatCard
              label="Aguardando repasse"
              value={formatMoneyBR(commissions?.awaitingTransferCents ?? 0)}
              helper="Pendente para receber"
            />
            <MobileStatCard
              label="Já repassado"
              value={formatMoneyBR(commissions?.transferredCents ?? 0)}
              helper="Histórico pago"
            />
            <MobileStatCard
              label="Contas abertas"
              value={formatMoneyBR(receivableStats.totalOpenCents)}
              helper={`${receivableStats.totalItems} títulos`}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Atalhos financeiros" />

            <div style={{ display: "grid", gap: 12 }}>
              <Shortcut
                href="/m/rep/finance/commissions"
                title="Minhas comissões"
                subtitle="Acompanhar comissão gerada, pendente e repassada"
                icon={<CircleDollarSign size={18} />}
              />

              <Shortcut
                href="/m/rep/finance/receivables"
                title="Contas a receber"
                subtitle="Ver cobranças em aberto, pagas e em atraso"
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
            <MobileSectionTitle title="Resumo de cobranças" />

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
                <strong>{formatMoneyBR(receivableStats.totalOpenCents)}</strong>
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
                <strong>{formatMoneyBR(receivableStats.overdueCents)}</strong>
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
                <span>Já pagas</span>
                <strong>{formatMoneyBR(receivableStats.paidCents)}</strong>
              </div>
            </div>
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}