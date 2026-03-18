"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

type CommissionItem = {
  id: string;
  orderNumber: number;
  clientName: string;
  commissionCents: number;
  status: "AVAILABLE" | "AWAITING_TRANSFER" | "AWAITING_PAYMENT";
};

type Response = {
  items: CommissionItem[];
  summary: {
    total: number;
    available: number;
    awaitingTransfer: number;
    awaitingPayment: number;
  };
};

export default function RepFinanceCommissionsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<Response | null>(null);

  async function loadData() {
    const res = await fetch("/api/rep/finance/commissions", {
      cache: "no-store",
    });

    const json = await res.json();

    setData(json);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!data) {
    return (
      <div style={{ padding: 24, background: pageBg }}>
        Carregando comissões...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: 24,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 1100 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 20 }}>
          Minhas Comissões
        </h1>

        {/* TOTAL */}
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 24,
            background: cardBg,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 14, color: muted }}>Total gerado</div>

          <div style={{ fontSize: 36, fontWeight: 900 }}>
            {money(data.summary.total)}
          </div>
        </div>

        {/* RESUMO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            label="Próximo pagamento (segunda)"
            value={money(data.summary.available)}
            theme={theme}
          />

          <SummaryCard
            label="Aguardando repasse da região"
            value={money(data.summary.awaitingTransfer)}
            theme={theme}
          />

          <SummaryCard
            label="Aguardando pagamento do cliente"
            value={money(data.summary.awaitingPayment)}
            theme={theme}
          />
        </div>

        {/* HISTÓRICO */}
        <div
          style={{
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: 16,
            background: cardBg,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Histórico de Comissões</h3>

          {data.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: `1px solid ${border}`,
                padding: "10px 0",
              }}
            >
              <div>
                <b>{item.clientName}</b>

                <div style={{ fontSize: 13, color: muted }}>
                  Pedido #{item.orderNumber}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900 }}>
                  {money(item.commissionCents)}
                </div>

                <div style={{ fontSize: 13, color: muted }}>
                  {labelStatus(item.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  const border = theme.isDark ? "#1e293b" : theme.border;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;

  return (
    <div
      style={{
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        background: cardBg,
      }}
    >
      <div style={{ fontSize: 13, color: theme.subtext }}>{label}</div>

      <div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function labelStatus(status: string) {
  if (status === "AVAILABLE") return "Pagamento segunda-feira";
  if (status === "AWAITING_TRANSFER") return "Aguardando repasse";
  return "Aguardando pagamento";
}