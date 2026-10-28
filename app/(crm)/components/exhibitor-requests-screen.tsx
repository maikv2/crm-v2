"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "../../providers/theme-provider";
import { getThemeColors } from "../../../lib/theme";
import { clientMatchesSearch } from "../../../lib/client-search";
import {
  EXHIBITOR_REQUEST_MATERIALS,
  EXHIBITOR_REQUEST_MOUNTINGS,
  formatExpectedDate,
  formatRequestNumber,
  materialLabel,
  mountingLabel,
  statusLabel,
  type ExhibitorRequestMaterial,
  type ExhibitorRequestMounting,
  type ExhibitorRequestStatus,
} from "../../../lib/exhibitor-requests";

type ThemeShape = ReturnType<typeof getThemeColors>;

type ClientOption = {
  id: string;
  name: string;
  tradeName?: string | null;
  code?: string | null;
  city?: string | null;
  state?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  region?: { id: string; name: string } | null;
};

type ExhibitorRequest = {
  id: string;
  number: number;
  material: string;
  mounting: string;
  quantity: number;
  expectedAt: string;
  notes?: string | null;
  status: ExhibitorRequestStatus;
  whatsappSentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  client: ClientOption;
  region?: { id: string; name: string } | null;
  requestedBy?: { id: string; name: string } | null;
};

type StatusFilter = ExhibitorRequestStatus | "ALL";

type Feedback = { type: "success" | "error"; text: string } | null;

function todayPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Dias ate a data prevista (negativo = atrasado) */
function daysUntil(expectedAt: string) {
  const expected = expectedAt.slice(0, 10);
  const today = todayPlus(0);
  const diff = Date.parse(`${expected}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(diff / 86400000);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ExhibitorRequestsScreen({ mode }: { mode: "admin" | "representative" }) {
  const { theme: themeMode } = useTheme();
  const theme = getThemeColors(themeMode);
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [requests, setRequests] = useState<ExhibitorRequest[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(Boolean(preselectedClientId));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<{ id: string; value: string } | null>(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const res = await fetch("/api/exhibitor-requests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao carregar solicitações");
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Erro ao carregar solicitações" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
    fetch("/api/exhibitor-requests/clients", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((error) => console.error(error));
  }, []);

  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING");
    return {
      PENDING: pending.length,
      late: pending.filter((r) => daysUntil(r.expectedAt) < 0).length,
      DELIVERED: requests.filter((r) => r.status === "DELIVERED").length,
      CANCELED: requests.filter((r) => r.status === "CANCELED").length,
      ALL: requests.length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      return (
        clientMatchesSearch(r.client, search) ||
        formatRequestNumber(r.number).toLowerCase().includes(search.trim().toLowerCase())
      );
    });
  }, [requests, statusFilter, search]);

  async function patchRequest(id: string, body: Record<string, unknown>, successText: string) {
    try {
      setBusyId(id);
      const res = await fetch(`/api/exhibitor-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao atualizar");
      setRequests((current) => current.map((r) => (r.id === id ? data : r)));
      setFeedback({ type: "success", text: successText });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Erro ao atualizar" });
    } finally {
      setBusyId(null);
    }
  }

  async function resendWhatsapp(request: ExhibitorRequest) {
    try {
      setBusyId(request.id);
      const res = await fetch(`/api/exhibitor-requests/${request.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar WhatsApp");
      setRequests((current) =>
        current.map((r) => (r.id === request.id ? { ...r, whatsappSentAt: new Date().toISOString() } : r))
      );
      setFeedback({ type: "success", text: `Cópia enviada pelo WhatsApp para ${data.phone}.` });
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : "Erro ao enviar WhatsApp" });
    } finally {
      setBusyId(null);
    }
  }

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "PENDING", label: "Aguardando entrega", count: counts.PENDING },
    { key: "DELIVERED", label: "Entregues", count: counts.DELIVERED },
    { key: "CANCELED", label: "Canceladas", count: counts.CANCELED },
    { key: "ALL", label: "Todas", count: counts.ALL },
  ];

  return (
    <div style={{ background: theme.pageBg, color: theme.text, minHeight: "100%", padding: "24px 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.subtext, marginBottom: 10 }}>
              🏪 / {mode === "representative" ? "Representante" : "Expositores"} / Solicitações
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Solicitações de expositor</div>
            <div style={{ marginTop: 6, fontSize: 13, color: theme.subtext }}>
              Peça um expositor novo para o cliente. A cópia vai pelo WhatsApp e a entrega aparece no mapa e
              nos avisos até ser concluída.
            </div>
          </div>

          <button type="button" onClick={() => setShowForm((v) => !v)} style={primaryButton(theme)}>
            {showForm ? "Fechar formulário" : "+ Nova solicitação"}
          </button>
        </div>

        {feedback ? (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              color: feedback.type === "error" ? "#b91c1c" : "#15803d",
              background: feedback.type === "error" ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${feedback.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            }}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 900 }}
            >
              ×
            </button>
          </div>
        ) : null}

        {showForm ? (
          <RequestForm
            theme={theme}
            clients={clients}
            initialClientId={preselectedClientId}
            onCancel={() => setShowForm(false)}
            onCreated={(created, text, isError) => {
              setRequests((current) => [created, ...current]);
              setStatusFilter("PENDING");
              setShowForm(false);
              setFeedback({ type: isError ? "error" : "success", text });
            }}
          />
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: `1px solid ${active ? theme.primary : theme.border}`,
                  background: active ? theme.primary : theme.cardBg,
                  color: active ? "#ffffff" : theme.text,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
          {counts.late > 0 ? (
            <span
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                background: "#fee2e2",
                color: "#b91c1c",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {counts.late} atrasada(s)
            </span>
          ) : null}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente, cidade ou número (SOL-0001)"
          style={{ ...inputStyle(theme), marginBottom: 14 }}
        />

        {loading ? (
          <div style={{ fontSize: 14, color: theme.subtext }}>Carregando solicitações...</div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: `1px dashed ${theme.border}`,
              textAlign: "center",
              color: theme.subtext,
              fontSize: 14,
            }}
          >
            Nenhuma solicitação {statusFilter === "PENDING" ? "aguardando entrega" : "encontrada"}.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((request) => (
              <RequestCard
                key={request.id}
                theme={theme}
                mode={mode}
                request={request}
                busy={busyId === request.id}
                editingDate={editingDate?.id === request.id ? editingDate.value : null}
                onEditDate={(value) => setEditingDate(value === null ? null : { id: request.id, value })}
                onSaveDate={async (value) => {
                  await patchRequest(request.id, { expectedAt: value }, "Data prevista atualizada.");
                  setEditingDate(null);
                }}
                onDeliver={() => {
                  if (!confirm(`Marcar ${formatRequestNumber(request.number)} como entregue?`)) return;
                  patchRequest(request.id, { status: "DELIVERED" }, "Solicitação marcada como entregue.");
                }}
                onCancel={() => {
                  if (!confirm(`Cancelar a solicitação ${formatRequestNumber(request.number)}?`)) return;
                  patchRequest(request.id, { status: "CANCELED" }, "Solicitação cancelada.");
                }}
                onReopen={() => patchRequest(request.id, { status: "PENDING" }, "Solicitação reaberta.")}
                onResend={() => resendWhatsapp(request)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestForm({
  theme,
  clients,
  initialClientId,
  onCancel,
  onCreated,
}: {
  theme: ThemeShape;
  clients: ClientOption[];
  initialClientId: string | null;
  onCancel: () => void;
  onCreated: (request: ExhibitorRequest, text: string, isError: boolean) => void;
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState(initialClientId || "");
  const [material, setMaterial] = useState<ExhibitorRequestMaterial>("ACRYLIC");
  const [mounting, setMounting] = useState<ExhibitorRequestMounting>("COUNTER");
  const [quantity, setQuantity] = useState(1);
  const [expectedAt, setExpectedAt] = useState(todayPlus(7));
  const [notes, setNotes] = useState("");
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  useEffect(() => {
    setPhone(selectedClient?.whatsapp || selectedClient?.phone || "");
  }, [selectedClient?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const clientMatches = useMemo(() => {
    if (!clientSearch.trim()) return [];
    return clients.filter((c) => clientMatchesSearch(c, clientSearch)).slice(0, 8);
  }, [clients, clientSearch]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Selecione o cliente.");
      return;
    }
    if (!expectedAt) {
      setError("Informe a data prevista para levar o expositor.");
      return;
    }
    if (sendWhatsapp && !phone.trim()) {
      setError("Informe o WhatsApp do cliente ou desmarque o envio da cópia.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/exhibitor-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, material, mounting, quantity, expectedAt, notes, sendWhatsapp, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar solicitação");

      const number = formatRequestNumber(data.request.number);
      if (data.whatsapp && !data.whatsapp.ok) {
        onCreated(
          data.request,
          `Solicitação ${number} salva, mas a cópia não foi enviada: ${data.whatsapp.error} Use "Reenviar WhatsApp".`,
          true
        );
      } else if (data.whatsapp?.ok) {
        onCreated(data.request, `Solicitação ${number} salva e cópia enviada pelo WhatsApp.`, false);
      } else {
        onCreated(data.request, `Solicitação ${number} salva.`, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar solicitação");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 18,
        padding: 18,
        marginBottom: 20,
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900 }}>Nova solicitação de expositor</div>

      <Field label="Cliente" theme={theme}>
        {selectedClient ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.inputBg,
            }}
          >
            <div>
              <div style={{ fontWeight: 800 }}>{selectedClient.tradeName || selectedClient.name}</div>
              <div style={{ fontSize: 12, color: theme.subtext }}>
                {[selectedClient.code, selectedClient.city, selectedClient.region?.name].filter(Boolean).join(" · ") || "-"}
              </div>
              {selectedClient.latitude == null || selectedClient.longitude == null ? (
                <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 700, marginTop: 4 }}>
                  Cliente sem localização: a entrega não vai aparecer no mapa até marcar o ponto dele.
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => setClientId("")} style={secondaryButton(theme)}>
              Trocar
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Digite nome, código, cidade ou CNPJ do cliente"
              style={inputStyle(theme)}
              autoFocus
            />
            {clientMatches.length > 0 ? (
              <div
                style={{
                  marginTop: 6,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: theme.cardBg,
                }}
              >
                {clientMatches.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setClientId(client.id);
                      setClientSearch("");
                    }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderBottom: `1px solid ${theme.border}`,
                      background: "transparent",
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{client.tradeName || client.name}</div>
                    <div style={{ fontSize: 12, color: theme.subtext }}>
                      {[client.code, client.city, client.region?.name].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            ) : clientSearch.trim() ? (
              <div style={{ fontSize: 12, color: theme.subtext, marginTop: 6 }}>Nenhum cliente encontrado.</div>
            ) : null}
            <div style={{ fontSize: 12, color: theme.subtext, marginTop: 6 }}>
              Cliente ainda não cadastrado?{" "}
              <Link href="/clients/new" style={{ color: theme.primary, fontWeight: 700 }}>
                Cadastrar cliente
              </Link>
            </div>
          </div>
        )}
      </Field>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Field label="Material" theme={theme}>
          <ChoiceGroup
            theme={theme}
            options={EXHIBITOR_REQUEST_MATERIALS}
            value={material}
            onChange={(v) => setMaterial(v as ExhibitorRequestMaterial)}
          />
        </Field>
        <Field label="Tipo" theme={theme}>
          <ChoiceGroup
            theme={theme}
            options={EXHIBITOR_REQUEST_MOUNTINGS}
            value={mounting}
            onChange={(v) => setMounting(v as ExhibitorRequestMounting)}
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Field label="Quantidade" theme={theme}>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            style={{ ...inputStyle(theme), width: 110 }}
          />
        </Field>
        <Field label="Data prevista para levar" theme={theme}>
          <input
            type="date"
            value={expectedAt}
            min={todayPlus(0)}
            onChange={(e) => setExpectedAt(e.target.value)}
            style={{ ...inputStyle(theme), width: 180 }}
          />
        </Field>
      </div>

      <Field label="Observações" theme={theme}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex.: medidas do espaço, cor, melhor horário para entrega"
          rows={3}
          style={{ ...inputStyle(theme), height: "auto", padding: 12, resize: "vertical" }}
        />
      </Field>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          padding: 12,
          borderRadius: 12,
          background: theme.isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4",
          border: `1px solid ${theme.isDark ? "rgba(34,197,94,0.25)" : "#bbf7d0"}`,
        }}
      >
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          <input type="checkbox" checked={sendWhatsapp} onChange={(e) => setSendWhatsapp(e.target.checked)} />
          Enviar cópia da solicitação pelo WhatsApp do cliente
        </label>
        {sendWhatsapp ? (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp do cliente"
            style={{ ...inputStyle(theme), width: 200 }}
          />
        ) : null}
      </div>

      {error ? <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>{error}</div> : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" disabled={saving} style={{ ...primaryButton(theme), opacity: saving ? 0.7 : 1 }}>
          {saving ? "Salvando..." : sendWhatsapp ? "Salvar e enviar pelo WhatsApp" : "Salvar solicitação"}
        </button>
        <button type="button" onClick={onCancel} style={secondaryButton(theme)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function RequestCard({
  theme,
  mode,
  request,
  busy,
  editingDate,
  onEditDate,
  onSaveDate,
  onDeliver,
  onCancel,
  onReopen,
  onResend,
}: {
  theme: ThemeShape;
  mode: "admin" | "representative";
  request: ExhibitorRequest;
  busy: boolean;
  editingDate: string | null;
  onEditDate: (value: string | null) => void;
  onSaveDate: (value: string) => void;
  onDeliver: () => void;
  onCancel: () => void;
  onReopen: () => void;
  onResend: () => void;
}) {
  const days = daysUntil(request.expectedAt);
  const pending = request.status === "PENDING";

  const dueBadge = !pending
    ? null
    : days < 0
      ? { text: `Atrasado ${Math.abs(days)} dia(s)`, color: "#b91c1c", bg: "#fee2e2" }
      : days === 0
        ? { text: "Levar hoje", color: "#b45309", bg: "#fef3c7" }
        : days <= 3
          ? { text: `Faltam ${days} dia(s)`, color: "#b45309", bg: "#fef3c7" }
          : { text: `Faltam ${days} dias`, color: "#1d4ed8", bg: "#dbeafe" };

  const statusColors =
    request.status === "DELIVERED"
      ? { color: "#15803d", bg: "#dcfce7" }
      : request.status === "CANCELED"
        ? { color: "#64748b", bg: "#f1f5f9" }
        : { color: "#0f766e", bg: "#ccfbf1" };

  const hasLocation = request.client.latitude != null && request.client.longitude != null;

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: 16,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 900, color: theme.subtext }}>
              {formatRequestNumber(request.number)}
            </span>
            <Badge {...statusColors} text={statusLabel(request.status)} />
            {dueBadge ? <Badge {...dueBadge} /> : null}
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, marginTop: 6 }}>
            {request.client.tradeName || request.client.name}
          </div>
          <div style={{ fontSize: 13, color: theme.subtext, marginTop: 2 }}>
            {[request.client.city, request.region?.name].filter(Boolean).join(" · ") || "-"}
            {!hasLocation ? " · sem localização no mapa" : ""}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: theme.subtext, fontWeight: 700 }}>Previsão</div>
          {editingDate !== null ? (
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input
                type="date"
                value={editingDate}
                onChange={(e) => onEditDate(e.target.value)}
                style={{ ...inputStyle(theme), width: 160, height: 34 }}
              />
              <button type="button" disabled={busy || !editingDate} onClick={() => onSaveDate(editingDate)} style={smallButton(theme, true)}>
                Salvar
              </button>
              <button type="button" onClick={() => onEditDate(null)} style={smallButton(theme)}>
                ×
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 18, fontWeight: 900 }}>{formatExpectedDate(request.expectedAt)}</div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          marginTop: 12,
          fontSize: 13,
        }}
      >
        <InfoItem theme={theme} label="Expositor">
          {mountingLabel(request.mounting)} · {materialLabel(request.material)}
        </InfoItem>
        <InfoItem theme={theme} label="Quantidade">{request.quantity}</InfoItem>
        <InfoItem theme={theme} label="Vendedor">{request.requestedBy?.name || "-"}</InfoItem>
        <InfoItem theme={theme} label="Solicitado em">{formatDateTime(request.createdAt)}</InfoItem>
        <InfoItem theme={theme} label="WhatsApp">
          {request.whatsappSentAt ? `Enviado ${formatDateTime(request.whatsappSentAt)}` : "Não enviado"}
        </InfoItem>
        {request.deliveredAt ? (
          <InfoItem theme={theme} label="Entregue em">{formatDateTime(request.deliveredAt)}</InfoItem>
        ) : null}
      </div>

      {request.notes ? (
        <div style={{ marginTop: 10, fontSize: 13, color: theme.subtext }}>
          <strong style={{ color: theme.text }}>Obs.:</strong> {request.notes}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <button type="button" disabled={busy} onClick={onResend} style={smallButton(theme)}>
          {request.whatsappSentAt ? "Reenviar WhatsApp" : "Enviar WhatsApp"}
        </button>
        {pending ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEditDate(request.expectedAt.slice(0, 10))}
              style={smallButton(theme)}
            >
              Alterar data
            </button>
            <button type="button" disabled={busy} onClick={onDeliver} style={smallButton(theme, true)}>
              Marcar como entregue
            </button>
            <button type="button" disabled={busy} onClick={onCancel} style={{ ...smallButton(theme), color: "#b91c1c" }}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={onReopen} style={smallButton(theme)}>
            Reabrir
          </button>
        )}
        {request.status === "DELIVERED" && mode === "admin" ? (
          <Link href="/exhibitors/new" style={{ ...smallButton(theme), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Cadastrar expositor instalado
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, theme, children }: { label: string; theme: ThemeShape; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 auto" }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: theme.subtext, textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}

function ChoiceGroup({
  theme,
  options,
  value,
  onChange,
}: {
  theme: ThemeShape;
  options: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {Object.entries(options).map(([key, label]) => {
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 12,
              border: `2px solid ${active ? theme.primary : theme.border}`,
              background: active ? theme.primary : theme.inputBg,
              color: active ? "#ffffff" : theme.text,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 900,
        color,
        background: bg,
        borderRadius: 999,
        padding: "3px 9px",
      }}
    >
      {text}
    </span>
  );
}

function InfoItem({ theme, label, children }: { theme: ThemeShape; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.subtext, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: 2 }}>{children}</div>
    </div>
  );
}

function inputStyle(theme: ThemeShape): React.CSSProperties {
  return {
    width: "100%",
    height: 42,
    padding: "0 12px",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };
}

function primaryButton(theme: ThemeShape): React.CSSProperties {
  return {
    height: 42,
    padding: "0 18px",
    borderRadius: 12,
    border: "none",
    background: theme.primary,
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  };
}

function secondaryButton(theme: ThemeShape): React.CSSProperties {
  return {
    height: 42,
    padding: "0 18px",
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  };
}

function smallButton(theme: ThemeShape, primary = false): React.CSSProperties {
  return {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: primary ? "none" : `1px solid ${theme.border}`,
    background: primary ? "#16a34a" : theme.cardBg,
    color: primary ? "#ffffff" : theme.text,
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  };
}
