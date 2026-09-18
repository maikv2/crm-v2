"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type RequestItem = {
  name: string;
  sku: string;
  quantity: number;
  priceCents: number;
};

type RequestDetails = {
  id: string;
  status: string;
  clientName: string;
  clientCode: string | null;
  subtotalCents: number;
  items: RequestItem[];
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OrderApprovalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const [details, setDetails] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  useEffect(() => {
    if (!token) {
      setError("Link invalido ou expirado.");
      setLoading(false);
      return;
    }

    fetch(`/api/order-approval?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Link invalido ou expirado.");
        setDetails(data.request);
        if (data.request.status !== "PENDING") setApproved(data.request.status === "APPROVED");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Link invalido ou expirado."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch("/api/order-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Nao foi possivel aprovar o pedido.");
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel aprovar o pedido.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.isDark ? "#081225" : theme.pageBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: theme.text,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          border: `1px solid ${border}`,
          borderRadius: 18,
          padding: 28,
          background: cardBg,
          boxShadow: theme.isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 18 }}>Aprovar pedido</div>

        {loading ? (
          <div style={{ color: muted, fontSize: 14 }}>Carregando...</div>
        ) : error && !details ? (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: theme.isDark ? "rgba(127,29,29,0.18)" : "#fef2f2",
              color: "#dc2626",
              padding: 12,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : details ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontSize: 14 }}>
              <strong>{details.clientName}</strong>
              {details.clientCode ? <span style={{ color: muted }}> ({details.clientCode})</span> : null}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              {details.items.map((item, index) => (
                <div key={index} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span style={{ color: muted }}>{money(item.priceCents * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, borderTop: `1px solid ${border}`, paddingTop: 10 }}>
              <span>Total</span>
              <span>{money(details.subtotalCents)}</span>
            </div>

            {approved ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid #bbf7d0",
                  background: theme.isDark ? "rgba(20,83,45,0.22)" : "#f0fdf4",
                  color: theme.isDark ? "#86efac" : "#15803d",
                  padding: 12,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Pedido aprovado. Entre no CRM pra escolher o vendedor e converter em pedido de verdade.
              </div>
            ) : (
              <>
                {error ? (
                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid #fecaca",
                      background: theme.isDark ? "rgba(127,29,29,0.18)" : "#fef2f2",
                      color: "#dc2626",
                      padding: 12,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {error}
                  </div>
                ) : null}
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  style={{
                    height: 46,
                    borderRadius: 12,
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: approving ? "not-allowed" : "pointer",
                    opacity: approving ? 0.75 : 1,
                  }}
                >
                  {approving ? "Aprovando..." : "Aprovar pedido"}
                </button>
              </>
            )}

            <Link href="/orders/requests" style={{ textAlign: "center", fontSize: 13, color: muted }}>
              Abrir no CRM
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function OrderApprovalPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Carregando...</div>}>
      <OrderApprovalContent />
    </Suspense>
  );
}
