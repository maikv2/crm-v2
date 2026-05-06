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

type Acerto = {
  id: string;
  weekStart: string;
  weekEnd: string;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  status: string;
  confirmedAt: string | null;
  payableCurrentWeekCents: number | null;
  payablePriorWeekCents: number | null;
};

type AcertoResponse = {
  latest: Acerto | null;
  acertos: Acerto[];
};

export default function RepFinanceCommissionsPage() {
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const [data, setData] = useState<Response | null>(null);
  const [acerto, setAcerto] = useState<AcertoResponse | null>(null);

  async function loadData() {
    const [commRes, acertoRes] = await Promise.all([
      fetch("/api/rep/finance/commissions", { cache: "no-store" }),
      fetch("/api/rep/finance/acerto", { cache: "no-store" }),
    ]);

    const [commJson, acertoJson] = await Promise.all([
      commRes.json(),
      acertoRes.json(),
    ]);

    setData(commJson);
    setAcerto(acertoJson);
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

        {/* ACERTO SEMANAL */}
        {acerto?.latest && (
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: 20,
              background: cardBg,
              marginBottom: 20,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: 16, fontWeight: 800 }}>
              Último Acerto Semanal
            </h3>
            <p style={{ fontSize: 13, color: muted, marginTop: 0, marginBottom: 16 }}>
              {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(acerto.latest.weekStart))}
              {" a "}
              {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(acerto.latest.weekEnd))}
              {" · "}
              {acerto.latest.ordersCount} pedido{acerto.latest.ordersCount !== 1 ? "s" : ""}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
              <AcertoCard
                label="Vendas desta semana"
                value={acerto.latest.payableCurrentWeekCents != null ? money(acerto.latest.payableCurrentWeekCents) : "—"}
                color="#1d4ed8"
                bg="#eff6ff"
                border={border}
              />
              <AcertoCard
                label="Vendas de semanas anteriores"
                value={acerto.latest.payablePriorWeekCents != null ? money(acerto.latest.payablePriorWeekCents) : "—"}
                color="#7e22ce"
                bg="#faf5ff"
                border={border}
              />
              <AcertoCard
                label="Para próximo acerto"
                value={money(acerto.latest.pendingCents)}
                color="#92400e"
                bg="#fffbeb"
                border={border}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0" }}>
              <span style={{ fontSize: 13, color: "#166534", fontWeight: 700 }}>
                Total {acerto.latest.status === "PAID" ? "pago" : "a pagar"} neste acerto
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>
                {money(acerto.latest.amountCents)}
              </span>
            </div>

            {acerto.latest.status === "PAID" && acerto.latest.confirmedAt && (
              <p style={{ fontSize: 12, color: muted, marginTop: 8, marginBottom: 0 }}>
                Pago em {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(acerto.latest.confirmedAt))}
              </p>
            )}
          </div>
        )}

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

function AcertoCard({
  label,
  value,
  color,
  bg,
  border,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: 12, background: bg }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}