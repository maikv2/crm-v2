"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileInfoRow,
  MobileStatCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type ResponseShape = {
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

function statusLabel(value?: string | null) {
  const raw = String(value ?? "").toUpperCase();
  if (raw === "AWAITING_TRANSFER") return "Aguardando repasse";
  if (raw === "AWAITING_PAYMENT") return "Aguardando pagamento";
  if (raw === "AVAILABLE") return "Disponível";
  return raw || "Sem status";
}

export default function CommissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResponseShape | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/rep/finance/commissions", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Erro ao carregar comissões.");
        }

        if (active) setData(json);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Erro ao carregar comissões."
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

  return (
    <MobileRepPageFrame
      title="Comissões"
      subtitle="Resumo de comissões da região"
      desktopHref="/rep/finance"
    >
      {loading ? (
        <MobileCard>Carregando comissões...</MobileCard>
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
              label="Total"
              value={formatMoneyBR(data?.summary?.total ?? 0)}
            />
            <MobileStatCard
              label="Aguardando pagamento"
              value={formatMoneyBR(data?.summary?.awaitingPayment ?? 0)}
            />
            <MobileStatCard
              label="Aguardando repasse"
              value={formatMoneyBR(data?.summary?.awaitingTransfer ?? 0)}
            />
            <MobileStatCard
              label="Disponível"
              value={formatMoneyBR(data?.summary?.available ?? 0)}
            />
          </div>

          <MobileCard>
            <MobileSectionTitle title="Itens de comissão" />

            {(data?.items ?? []).length === 0 ? (
              <div style={{ fontSize: 13 }}>Nenhuma comissão encontrada.</div>
            ) : (
              (data?.items ?? []).map((item) => (
                <MobileInfoRow
                  key={item.id}
                  title={`Pedido #${item.orderNumber ?? "-"}`}
                  subtitle={`${item.clientName ?? "-"} • ${statusLabel(
                    item.status
                  )}`}
                  right={formatMoneyBR(item.commissionCents ?? 0)}
                />
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}