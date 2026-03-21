"use client";

import { useEffect, useMemo, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  MobileStatCard,
  formatDateBR,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type ResponseShape = {
  items?: Array<{
    id: string;
    amountCents?: number | null;
    dueDate?: string | null;
    status?: string | null;
    client?: {
      id: string;
      name?: string | null;
    } | null;
    order?: {
      id: string;
      number?: number | null;
    } | null;
  }>;
};

export default function RepFinanceReceivablesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/finance/receivables", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar contas a receber.");
        }

        if (active) setData(json);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar contas a receber."
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

  const summary = useMemo(() => {
    const now = new Date();
    return (data?.items ?? []).reduce(
      (acc, item) => {
        const value = item.amountCents ?? 0;
        const status = String(item.status ?? "").toUpperCase();
        const isPaid = status.includes("PAID");
        const due = item.dueDate ? new Date(item.dueDate) : null;
        const overdue = !isPaid && due && due.getTime() < now.getTime();

        if (isPaid) acc.paid += value;
        else acc.open += value;
        if (overdue) acc.overdue += value;

        return acc;
      },
      { open: 0, overdue: 0, paid: 0 }
    );
  }, [data]);

  return (
    <MobileRepPageFrame
      title="Contas a receber"
      subtitle="Cobranças da região"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando contas...</MobileCard>
      ) : error ? (
        <MobileCard>{error}</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0,1fr))",
              gap: 12,
            }}
          >
            <MobileStatCard
              label="Aberto"
              value={formatMoneyBR(summary.open)}
            />
            <MobileStatCard
              label="Atrasado"
              value={formatMoneyBR(summary.overdue)}
            />
            <MobileStatCard
              label="Pago"
              value={formatMoneyBR(summary.paid)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Parcelas" />

            {(data?.items ?? []).length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma parcela encontrada.</div>
            ) : (
              (data?.items ?? []).map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`${item.client?.name ?? "Cliente"} • Pedido #${
                    item.order?.number ?? "-"
                  }`}
                  subtitle={`Vencimento: ${formatDateBR(item.dueDate)} • ${
                    item.status ?? "Sem status"
                  }`}
                  right={formatMoneyBR(item.amountCents ?? 0)}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}