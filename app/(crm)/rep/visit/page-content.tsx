"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type Client = {
  id: string;
  name: string;
  city?: string | null;
  neighborhood?: string | null;
  address?: string | null;
  region?: {
    id: string;
    name: string;
  } | null;
};

function toLocalDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RepVisitPage() {
  const router = useRouter();
  const params = useSearchParams();

  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const pageBg = theme.isDark ? "#081225" : theme.pageBg;
  const cardBg = theme.isDark ? "#0f172a" : theme.cardBg;
  const border = theme.isDark ? "#1e293b" : theme.border;
  const muted = theme.isDark ? "#94a3b8" : "#64748b";

  const clientIdFromUrl = params.get("clientId") || "";

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientId, setClientId] = useState(clientIdFromUrl);
  const [clientSearch, setClientSearch] = useState("");

  const [visitDate, setVisitDate] = useState(toLocalDateInputValue(new Date()));
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [notes, setNotes] = useState("");

  const [hadSale, setHadSale] = useState(false);
  const [maintenanceDone, setMaintenanceDone] = useState(false);
  const [stockChecked, setStockChecked] = useState(true);
  const [negotiationDone, setNegotiationDone] = useState(false);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/rep/clients", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao carregar clientes.");
      }

      setClients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao carregar clientes.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const normalized = clientSearch.trim().toLowerCase();

    return clients
      .filter((client) => {
        if (!normalized) return true;

        const haystack = [
          client.name,
          client.city,
          client.neighborhood,
          client.address,
          client.region?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalized);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [clients, clientSearch]);

  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === clientId) ?? null;
  }, [clients, clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      if (!clientId) {
        throw new Error("Selecione um cliente.");
      }

      if (!notes.trim()) {
        throw new Error("Descreva a visita.");
      }

      const payload = {
        clientId,
        visitDate,
        nextVisitDate: nextVisitDate || null,
        notes: notes.trim(),
        hadSale,
        maintenanceDone,
        stockChecked,
        negotiationDone,
      };

      const res = await fetch("/api/rep/visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao registrar visita.");
      }

      if (hadSale) {
        router.push(`/rep/orders/new?clientId=${clientId}`);
        return;
      }

      router.push("/rep/agenda");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao registrar visita.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    outline: "none",
  };

  const btn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: "#2563eb",
    border: "1px solid #2563eb",
    color: "white",
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: pageBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.text,
        }}
      >
        Carregando visita...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        minHeight: "100vh",
        background: pageBg,
        padding: 24,
        color: theme.text,
        width: "100%",
      }}
    >
      <div style={{ maxWidth: 1100 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>
              Registrar visita
            </h1>
            <div style={{ color: muted, marginTop: 6 }}>
              Registro operacional do representante
            </div>
          </div>

          <button
            type="button"
            style={btn}
            onClick={() => router.push("/rep/agenda")}
          >
            Voltar à agenda
          </button>
        </div>

        {error ? (
          <div
            style={{
              border: `1px solid #6b2a2a`,
              borderRadius: 16,
              padding: 16,
              background: "rgba(120,0,0,0.12)",
              color: "#ffd6d6",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 16,
                background: cardBg,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                Cliente
              </div>

              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
              />

              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {filteredClients.map((client) => {
                  const selected = client.id === clientId;

                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setClientId(client.id)}
                      style={{
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        cursor: "pointer",
                        border: selected
                          ? "1px solid #2563eb"
                          : `1px solid ${border}`,
                        background: selected
                          ? "rgba(37,99,235,0.18)"
                          : theme.isDark
                          ? "#0b1324"
                          : "#f8fafc",
                        color: theme.text,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{client.name}</div>
                      <div
                        style={{
                          color: muted,
                          fontSize: 13,
                          marginTop: 4,
                        }}
                      >
                        {client.city || "-"} · {client.neighborhood || "-"}
                      </div>
                    </button>
                  );
                })}

                {!filteredClients.length ? (
                  <div style={{ color: muted }}>
                    Nenhum cliente encontrado.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 16,
                background: cardBg,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                Dados da visita
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Data da visita
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Próxima visita
                  </label>
                  <input
                    type="date"
                    value={nextVisitDate}
                    onChange={(e) => setNextVisitDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Observações
                  </label>
                  <textarea
                    rows={6}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ ...inputStyle, resize: "vertical" }}
                    placeholder="Descreva o que foi feito, situação do cliente, pedidos, estoque, necessidade de retorno..."
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 16,
                background: cardBg,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                Ações da visita
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={stockChecked}
                    onChange={(e) => setStockChecked(e.target.checked)}
                  />
                  Estoque conferido
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={maintenanceDone}
                    onChange={(e) => setMaintenanceDone(e.target.checked)}
                  />
                  Manutenção realizada
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={negotiationDone}
                    onChange={(e) => setNegotiationDone(e.target.checked)}
                  />
                  Negociação realizada
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={hadSale}
                    onChange={(e) => setHadSale(e.target.checked)}
                  />
                  Houve venda nesta visita
                </label>
              </div>
            </div>

            <div
              style={{
                border: `1px solid ${border}`,
                borderRadius: 16,
                padding: 16,
                background: cardBg,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>
                Resumo
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <span style={{ color: muted }}>Cliente:</span>{" "}
                  <b>{selectedClient?.name || "Não selecionado"}</b>
                </div>

                <div>
                  <span style={{ color: muted }}>Cidade:</span>{" "}
                  <b>{selectedClient?.city || "-"}</b>
                </div>

                <div>
                  <span style={{ color: muted }}>Bairro:</span>{" "}
                  <b>{selectedClient?.neighborhood || "-"}</b>
                </div>

                <div>
                  <span style={{ color: muted }}>Endereço:</span>{" "}
                  <b>{selectedClient?.address || "-"}</b>
                </div>

                <div>
                  <span style={{ color: muted }}>Próxima visita:</span>{" "}
                  <b>{nextVisitDate || "-"}</b>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  marginTop: 16,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Salvando visita..."
                  : hadSale
                  ? "Salvar e ir para pedido"
                  : "Salvar visita"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}