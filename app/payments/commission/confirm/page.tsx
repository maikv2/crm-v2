"use client";

import { useEffect, useMemo, useState } from "react";

type Confirmation = {
  representative: string;
  region: string;
  weekStart: string;
  weekEnd: string;
  amountCents: number;
  pendingCents: number;
  ordersCount: number;
  status: string;
  confirmedAt: string | null;
  tokenExpiresAt: string;
  description: string;
};

function centsToBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((value || 0) / 100);
}

function dateToBR(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function FinanceConfirmPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentToken = params.get("token") || "";
    setToken(currentToken);

    if (!currentToken) {
      setError("Link inválido: token não informado.");
      setLoading(false);
      return;
    }

    fetch(`/api/finance/commission-payment/confirm?token=${encodeURIComponent(currentToken)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao carregar pagamento.");
        setConfirmation(data.confirmation);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar pagamento.");
      })
      .finally(() => setLoading(false));
  }, []);

  const canConfirm = useMemo(() => {
    if (!confirmation) return false;
    return confirmation.status === "PENDING" && confirmation.amountCents > 0;
  }, [confirmation]);

  async function confirmPayment() {
    if (!token || !canConfirm) return;

    setConfirming(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/finance/commission-payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao confirmar pagamento.");

      setConfirmation(data.confirmation);
      setSuccess(data.alreadyPaid ? "Pagamento já estava confirmado." : "Pagamento confirmado e saída lançada no financeiro.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao confirmar pagamento.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <section
        style={{
          maxWidth: 680,
          margin: "0 auto",
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            CRM V2 Financeiro
          </div>
          <h1 style={{ margin: "8px 0 0", fontSize: 26, color: "#0f172a" }}>
            Confirmar pagamento
          </h1>
          <p style={{ margin: "8px 0 0", color: "#475569", lineHeight: 1.5 }}>
            Confira os dados abaixo antes de confirmar. Após confirmar, o sistema cria automaticamente uma saída no financeiro.
          </p>
        </div>

        {loading ? (
          <div style={{ color: "#475569" }}>Carregando lançamento...</div>
        ) : error ? (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 14,
              padding: 14,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : confirmation ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <Info label="Descrição" value={confirmation.description} />
              <Info label="Representante" value={confirmation.representative} />
              <Info label="Região" value={confirmation.region} />
              <Info
                label="Período"
                value={`${dateToBR(confirmation.weekStart)} a ${dateToBR(confirmation.weekEnd)}`}
              />
              <Info label="Pedidos no período" value={String(confirmation.ordersCount)} />
              <Info label="Valor a pagar agora" value={centsToBRL(confirmation.amountCents)} highlight />
              <Info label="Pendente para próximo acerto" value={centsToBRL(confirmation.pendingCents)} />
              <Info label="Status" value={confirmation.status === "PAID" ? "Pago" : confirmation.status} />
              {confirmation.confirmedAt ? (
                <Info label="Confirmado em" value={dateToBR(confirmation.confirmedAt)} />
              ) : null}
            </div>

            {success ? (
              <div
                style={{
                  background: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #bbf7d0",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                  fontWeight: 700,
                }}
              >
                {success}
              </div>
            ) : null}

            <button
              type="button"
              onClick={confirmPayment}
              disabled={!canConfirm || confirming}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 14,
                padding: "15px 18px",
                background: canConfirm ? "#16a34a" : "#94a3b8",
                color: "white",
                fontSize: 16,
                fontWeight: 800,
                cursor: canConfirm && !confirming ? "pointer" : "not-allowed",
              }}
            >
              {confirming
                ? "Confirmando..."
                : confirmation.status === "PAID"
                  ? "Pagamento já confirmado"
                  : "Confirmar pagamento e lançar saída"}
            </button>

            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
              Este link é individual, seguro e só deve ser usado para confirmar o pagamento informado acima.
            </p>
          </>
        ) : null}
      </section>
    </main>
  );
}

function Info({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 14,
        padding: 14,
        background: highlight ? "#f0fdf4" : "#f8fafc",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, color: highlight ? "#166534" : "#0f172a", fontWeight: highlight ? 900 : 700, fontSize: highlight ? 22 : 16 }}>
        {value}
      </div>
    </div>
  );
}
