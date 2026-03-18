"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatMoneyBRFromCents(cents?: number | null) {
  if (cents == null) return "-";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ClientOrdersPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;

      setLoading(true);
      setError(null);

      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        const txt = await res.text();
        setError(txt);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setClient(data);
      setLoading(false);
    }

    load();
  }, [id]);

  const card: React.CSSProperties = {
    border: "1px solid #2a2a2a",
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.02)",
    color: "white",
  };

  const btn: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #555",
    background: "black",
    color: "white",
    cursor: "pointer",
    fontWeight: 800,
  };

  if (loading) {
    return <div style={{ padding: 24, color: "white" }}>Carregando histórico...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: "white" }}>
        <h1>Erro ao carregar</h1>
        <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ padding: 24, color: "white" }}>
        Cliente não encontrado.
      </div>
    );
  }

  const orders = [...(client.orders ?? [])].sort(
    (a: any, b: any) =>
      new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );

  return (
    <div style={{ padding: 24, color: "white", maxWidth: 1200 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Histórico de Compras
          </h1>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Cliente: {client.name}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={btn} onClick={() => router.push(`/clients/${id}`)}>
            Voltar ao cliente
          </button>
          <button style={btn} onClick={() => router.push(`/orders/new?clientId=${id}`)}>
            + Novo pedido
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={card}>
          <div style={{ opacity: 0.7 }}>Nenhuma compra cadastrada.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {orders.map((o: any) => (
            <div key={o.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>
                    {o.status ?? "-"}
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    Data: {formatDateBR(o.issuedAt)}
                  </div>
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    Vendedor: {o.sellerId ?? "-"}
                  </div>
                </div>

                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  {formatMoneyBRFromCents(o.totalCents)}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  Itens comprados
                </div>

                {(o.items ?? []).length === 0 ? (
                  <div style={{ opacity: 0.7 }}>
                    Nenhum item encontrado neste pedido.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {o.items.map((item: any) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          borderTop: "1px solid #1f1f1f",
                          paddingTop: 8,
                        }}
                      >
                        <div>{item.product?.name ?? "Produto"}</div>
                        <div style={{ fontWeight: 800 }}>
                          {item.qty} un
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}