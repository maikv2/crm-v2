"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, CircleDollarSign, Receipt, Wallet } from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type AcertoSummary = {
  totalPayable: number;
  currentWeekCents: number;
  priorWeeksCents: number;
  pendingOverdueCents: number;
  pendingNormalCents: number;
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
                wordBreak: "break-word",
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
                wordBreak: "break-word",
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

function FinanceMetricCard({
  label,
  value,
  highlight = false,
  color,
  bg,
  borderColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
  bg?: string;
  borderColor?: string;
}) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 14,
        border: `1px solid ${borderColor ?? (highlight ? colors.primary : colors.border)}`,
        background: bg ?? colors.cardBg,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: color ?? colors.subtext,
          marginBottom: 8,
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {label}
      </div>

      <div
        style={{
          minWidth: 0,
          fontSize: "clamp(16px, 4vw, 22px)",
          lineHeight: 1.15,
          fontWeight: 900,
          color: color ?? (highlight ? colors.primary : colors.text),
          letterSpacing: -0.3,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function RepFinancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acerto, setAcerto] = useState<AcertoSummary | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesResponse | null>(null);
  const [transfers, setTransfers] = useState<TransfersResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [acertoRes, receivablesRes, transfersRes] = await Promise.all([
          fetch("/api/rep/finance/acerto", { cache: "no-store" }),
          fetch("/api/rep/finance/receivables", { cache: "no-store" }),
          fetch("/api/rep/finance/transfers", { cache: "no-store" }),
        ]);

        const acertoJson = await acertoRes.json().catch(() => null);
        const receivablesJson = (await receivablesRes.json().catch(() => null)) as ReceivablesResponse | null;
        const transfersJson = (await transfersRes.json().catch(() => null)) as TransfersResponse | null;

        if (!acertoRes.ok) {
          throw new Error(acertoJson?.error || "Erro ao carregar financeiro.");
        }

        if (active) {
          setAcerto(acertoJson?.summary ?? null);
          setReceivables(receivablesJson);
          setTransfers(transfersJson);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erro ao carregar financeiro.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => { active = false; };
  }, []);

  const receivablesSummary = useMemo(() => {
    const now = new Date();

    return (receivables?.items ?? []).reduce(
      (acc, item) => {
        const value = Number(item.amountCents || 0);
        const status = String(item.status ?? "").toUpperCase();
        const isPaid = status.includes("PAID");
        const dueDate = item.dueDate ? new Date(item.dueDate) : null;
        const isOverdue =
          !isPaid && !!dueDate && dueDate.getTime() < now.getTime();

        if (!isPaid && isOverdue) {
          acc.overdue += value;
        } else if (!isPaid) {
          acc.open += value;
        }

        return acc;
      },
      { open: 0, overdue: 0 }
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
            <MobileSectionTitle title="Comissões" />

            {/* Card principal: a receber esta semana */}
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                A receber esta semana
              </div>
              <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
                Comissão liberada sobre pagamentos confirmados
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#166534", marginTop: 4 }}>
                {formatMoneyBR(acerto?.totalPayable ?? 0)}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
              {(acerto?.pendingOverdueCents ?? 0) > 0 && (
                <FinanceMetricCard
                  label="⚠ Clientes em atraso"
                  value={formatMoneyBR(acerto?.pendingOverdueCents ?? 0)}
                  color="#dc2626"
                  bg="#fef2f2"
                  borderColor="#fecaca"
                />
              )}
              {(acerto?.pendingNormalCents ?? 0) > 0 && (
                <FinanceMetricCard
                  label="Aguardando clientes"
                  value={formatMoneyBR(acerto?.pendingNormalCents ?? 0)}
                  color="#92400e"
                  bg="#fffbeb"
                  borderColor="#fde68a"
                />
              )}
            </div>
          </MobileCard>

          <MobileCard>
            <MobileSectionTitle title="Contas a receber da região" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 12,
              }}
            >
              <FinanceMetricCard
                label="Em aberto"
                value={formatMoneyBR(receivablesSummary.open)}
              />
              <FinanceMetricCard
                label="Em atraso"
                value={formatMoneyBR(receivablesSummary.overdue)}
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
              <FinanceMetricCard
                label="Pendentes"
                value={formatMoneyBR(transfersSummary.pending)}
              />
              <FinanceMetricCard
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
                subtitle="Ver o que está em aberto e em atraso"
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