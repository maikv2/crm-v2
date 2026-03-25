"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import { MobileCard, MobileSectionTitle } from "@/app/components/mobile/mobile-shell";
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

export default function MobileRepVisitPage() {
  const router = useRouter();
  const params = useSearchParams();

  const { theme } = useTheme();
  const colors = getThemeColors(theme);

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
        router.push(`/m/rep/orders/new?clientId=${clientId}`);
        return;
      }

      router.push("/m/rep");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao registrar visita.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 46,
    padding: "12px 14px",
    borderRadius: 14,
    border: `1px solid ${colors.border}`,
    background: colors.inputBg,
    color: colors.text,
    outline: "none",
    fontSize: 14,
  };

  if (loading) {
    return (
      <MobileRepPageFrame
        title="Registrar visita"
        subtitle="Carregando clientes"
        desktopHref="/rep/visit"
      >
        <MobileCard>
          <div style={{ color: colors.text, fontWeight: 800 }}>
            Carregando visita...
          </div>
        </MobileCard>
      </MobileRepPageFrame>
    );
  }

  return (
    <MobileRepPageFrame
      title="Registrar visita"
      subtitle="Registro operacional do representante"
      desktopHref="/rep/visit"
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        {error ? (
          <MobileCard
            style={{
              border: "1px solid #ef4444",
            }}
          >
            <div style={{ color: "#ef4444", fontWeight: 800, fontSize: 14 }}>
              {error}
            </div>
          </MobileCard>
        ) : null}

        <MobileCard>
          <MobileSectionTitle title="Cliente" />

          <div style={{ display: "grid", gap: 10 }}>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              style={inputStyle}
            />

            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecione um cliente</option>
              {filteredClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            {selectedClient ? (
              <div
                style={{
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.isDark ? "#0f172a" : "#f8fafc",
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 900, color: colors.text, fontSize: 14 }}>
                  {selectedClient.name}
                </div>
                <div style={{ color: colors.subtext, fontSize: 12 }}>
                  {selectedClient.city || "-"} • {selectedClient.neighborhood || "-"}
                </div>
                <div style={{ color: colors.subtext, fontSize: 12 }}>
                  {selectedClient.address || "-"}
                </div>
              </div>
            ) : null}
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Dados da visita" />

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontWeight: 800,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                Data da visita
              </div>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontWeight: 800,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                Próxima visita
              </div>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <div
                style={{
                  marginBottom: 6,
                  fontWeight: 800,
                  fontSize: 13,
                  color: colors.text,
                }}
              >
                Observações
              </div>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                placeholder="Descreva o que foi feito, situação do cliente, pedidos, estoque, necessidade de retorno..."
              />
            </div>
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Ações da visita" />

          <div style={{ display: "grid", gap: 10 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: colors.text,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={stockChecked}
                onChange={(e) => setStockChecked(e.target.checked)}
              />
              Estoque conferido
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: colors.text,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={maintenanceDone}
                onChange={(e) => setMaintenanceDone(e.target.checked)}
              />
              Manutenção realizada
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: colors.text,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={negotiationDone}
                onChange={(e) => setNegotiationDone(e.target.checked)}
              />
              Negociação realizada
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: colors.text,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={hadSale}
                onChange={(e) => setHadSale(e.target.checked)}
              />
              Houve venda nesta visita
            </label>
          </div>
        </MobileCard>

        <MobileCard>
          <MobileSectionTitle title="Resumo" />

          <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
            <div>
              <span style={{ color: colors.subtext }}>Cliente: </span>
              <strong style={{ color: colors.text }}>
                {selectedClient?.name || "Não selecionado"}
              </strong>
            </div>

            <div>
              <span style={{ color: colors.subtext }}>Cidade: </span>
              <strong style={{ color: colors.text }}>
                {selectedClient?.city || "-"}
              </strong>
            </div>

            <div>
              <span style={{ color: colors.subtext }}>Bairro: </span>
              <strong style={{ color: colors.text }}>
                {selectedClient?.neighborhood || "-"}
              </strong>
            </div>

            <div>
              <span style={{ color: colors.subtext }}>Endereço: </span>
              <strong style={{ color: colors.text }}>
                {selectedClient?.address || "-"}
              </strong>
            </div>

            <div>
              <span style={{ color: colors.subtext }}>Próxima visita: </span>
              <strong style={{ color: colors.text }}>
                {nextVisitDate || "-"}
              </strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              marginTop: 16,
              minHeight: 48,
              borderRadius: 14,
              border: "none",
              background: colors.primary,
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Salvando visita..."
              : hadSale
              ? "Salvar e ir para pedido"
              : "Salvar visita"}
          </button>
        </MobileCard>
      </form>
    </MobileRepPageFrame>
  );
}