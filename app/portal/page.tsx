"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  district?: string | null;
};

export default function PortalHomePage() {
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal-auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/portal/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setClient(data.client);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        Carregando portal...
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Portal do Cliente
      </h1>

      <div style={{ marginTop: 20 }}>
        <strong>{client.name}</strong>
      </div>

      <div style={{ marginTop: 5 }}>
        Código: {client.code}
      </div>

      <div style={{ marginTop: 5 }}>
        Cidade: {client.city} {client.district && `- ${client.district}`}
      </div>

      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>
          Serviços
        </h2>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          
          <button
            onClick={() => router.push("/portal/orders")}
            style={btn}
          >
            Meus Pedidos
          </button>

          <button
            onClick={() => router.push("/portal/finance")}
            style={btn}
          >
            Minhas Faturas
          </button>

          <button
            onClick={() => router.push("/portal/visit")}
            style={btn}
          >
            Solicitar Visita
          </button>

          <button
            onClick={() => router.push("/portal/catalog")}
            style={btn}
          >
            Ver Catálogo
          </button>

        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "14px 20px",
  borderRadius: 8,
  border: "1px solid #ddd",
  cursor: "pointer",
  background: "white",
};