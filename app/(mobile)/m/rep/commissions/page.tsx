"use client";

import { useEffect, useState } from "react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  formatMoneyBR,
} from "@/app/components/mobile/mobile-shell";

type CommissionItem = {
  id: string;
  orderNumber?: number | string | null;
  clientName?: string | null;
  commissionCents?: number | null;
  status?: "AVAILABLE" | "AWAITING_TRANSFER" | "AWAITING_PAYMENT" | string;
};

type CommissionResponse = {
  items: CommissionItem[];
  summary: {
    total: number;
    available: number;
    awaitingTransfer: number;
    awaitingPayment: number;
  };
};

function getStatusLabel(status?: string) {
  if (status === "AVAILABLE") return "Disponível";
  if (status === "AWAITING_TRANSFER") return "Aguardando repasse";
  if (status === "AWAITING_PAYMENT") return "Aguardando pagamento";
  return "Sem status";
}

export default function RepCommissionsMobile() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CommissionResponse>({
    items: [],
    summary: {
      total: 0,
      available: 0,
      awaitingTransfer: 0,
      awaitingPayment: 0,
    },
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/rep/finance/commissions", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao carregar comissões.");
      }

      setData({
        items: Array.isArray(json?.items) ? json.items : [],
        summary: {
          total: Number(json?.summary?.total ?? 0),
          available: Number(json?.summary?.available ?? 0),
          awaitingTransfer: Number(json?.summary?.awaitingTransfer ?? 0),
          awaitingPayment: Number(json?.summary?.awaitingPayment ?? 0),
        },
      });
    } catch (error) {
      console.error(error);
      setData({
        items: [],
        summary: {
          total: 0,
          available: 0,
          awaitingTransfer: 0,
          awaitingPayment: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileRepPageFrame
      title="Comissões"
      subtitle="Comissões do representante"
      desktopHref="/rep/finance/commissions"
    >
      {loading ? (
        <MobileCard>Carregando comissões...</MobileCard>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <MobileCard>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Total
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {formatMoneyBR(data.summary.total)}
              </div>
            </MobileCard>

            <MobileCard>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Aguardando pagamento
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {formatMoneyBR(data.summary.awaitingPayment)}
              </div>
            </MobileCard>

            <MobileCard>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Aguardando repasse
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {formatMoneyBR(data.summary.awaitingTransfer)}
              </div>
            </MobileCard>

            <MobileCard>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                Disponível
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                {formatMoneyBR(data.summary.available)}
              </div>
            </MobileCard>
          </div>

          <MobileCard>
            {data.items.length === 0 ? (
              <div>Nenhuma comissão encontrada.</div>
            ) : (
              data.items.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 0",
                    borderBottom:
                      index === data.items.length - 1 ? "none" : "1px solid #eee",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Pedido #{item.orderNumber ?? "-"}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      opacity: 0.75,
                      marginBottom: 6,
                    }}
                  >
                    {item.clientName || "Cliente"}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                      }}
                    >
                      {formatMoneyBR(item.commissionCents ?? 0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </MobileCard>
        </>
      )}
    </MobileRepPageFrame>
  );
}