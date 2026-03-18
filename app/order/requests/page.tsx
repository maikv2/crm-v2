"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
};

type Item = {
  id: string;
  quantity: number;
  product: Product;
};

type Request = {
  id: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  client: {
    id: string;
    name: string;
    code?: string | null;
  };
  items: Item[];
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("pt-BR");
}

export default function OrderRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/orders/requests");

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/orders/requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    load();
  }

  if (loading) {
    return <div style={{ padding: 30 }}>Carregando pedidos...</div>;
  }

  return (
    <div style={{ padding: 30 }}>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 900,
          marginBottom: 20,
        }}
      >
        Pedidos do Portal
      </h1>

      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>
                {req.client.name}
              </div>

              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Pedido feito em {formatDate(req.createdAt)}
              </div>
            </div>

            <div
              style={{
                fontWeight: 700,
                color: "#2563eb",
              }}
            >
              {req.status}
            </div>
          </div>

          <table
            style={{
              width: "100%",
              marginTop: 10,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f3f4f6",
                }}
              >
                <th style={{ padding: 10, textAlign: "left" }}>
                  Produto
                </th>

                <th style={{ padding: 10 }}>Qtd</th>

                <th style={{ padding: 10 }}>Preço</th>

                <th style={{ padding: 10 }}>Total</th>
              </tr>
            </thead>

            <tbody>
              {req.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 10 }}>
                    {item.product.name}
                  </td>

                  <td style={{ padding: 10, textAlign: "center" }}>
                    {item.quantity}
                  </td>

                  <td style={{ padding: 10, textAlign: "center" }}>
                    {money(item.product.priceCents)}
                  </td>

                  <td style={{ padding: 10, textAlign: "center" }}>
                    {money(
                      item.product.priceCents * item.quantity
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {req.notes && (
            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                color: "#374151",
              }}
            >
              Observação: {req.notes}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 16,
            }}
          >
            <button
              onClick={() => updateStatus(req.id, "APPROVED")}
              style={{
                background: "#16a34a",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Aprovar
            </button>

            <button
              onClick={() => updateStatus(req.id, "REJECTED")}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Rejeitar
            </button>

            <button
              onClick={() =>
                updateStatus(req.id, "CONVERTED_TO_ORDER")
              }
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Converter em Venda
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}