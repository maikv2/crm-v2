"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTheme } from "../../../../providers/theme-provider";
import { getThemeColors } from "../../../../../lib/theme";

const maintenanceTypes = [
  { value: "PREVENTIVE", label: "Preventiva" },
  { value: "CORRECTIVE", label: "Corretiva" },
  { value: "CLEANING", label: "Limpeza" },
  { value: "REPLACEMENT", label: "Troca" },
  { value: "COLLECTION", label: "Recolhimento" },
  { value: "REINSTALLATION", label: "Reinstalação" },
];

function formatDateBR(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("pt-BR");
}

function formatMaintenanceType(type?: string | null) {
  switch (type) {
    case "PREVENTIVE":
      return "Preventiva";
    case "CORRECTIVE":
      return "Corretiva";
    case "CLEANING":
      return "Limpeza";
    case "REPLACEMENT":
      return "Troca";
    case "COLLECTION":
      return "Recolhimento";
    case "REINSTALLATION":
      return "Reinstalação";
    default:
      return type ?? "-";
  }
}

export default function ExhibitorMaintenancePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);
  const exhibitorId = params?.id;

  const inputBg = theme.isDark ? "#0f172a" : "#ffffff";
  const subtleCard = theme.isDark ? "#0e1728" : "#f8fafc";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exhibitor, setExhibitor] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [type, setType] = useState("CORRECTIVE");
  const [description, setDescription] = useState("");
  const [solution, setSolution] = useState("");
  const [notes, setNotes] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");

  useEffect(() => {
    async function load() {
      if (!exhibitorId) return;

      try {
        setLoading(true);
        setError(null);

        const [exhibitorRes, historyRes] = await Promise.all([
          fetch(`/api/exhibitors/${exhibitorId}`),
          fetch(`/api/exhibitors/${exhibitorId}/maintenance`),
        ]);

        if (!exhibitorRes.ok) {
          const txt = await exhibitorRes.text();
          throw new Error(txt || "Erro ao carregar expositor");
        }

        if (!historyRes.ok) {
          const txt = await historyRes.text();
          throw new Error(txt || "Erro ao carregar histórico");
        }

        const exhibitorData = await exhibitorRes.json();
        const historyData = await historyRes.json();

        setExhibitor(exhibitorData);
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao carregar manutenção");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [exhibitorId]);

  async function reloadHistory() {
    if (!exhibitorId) return;

    const historyRes = await fetch(`/api/exhibitors/${exhibitorId}/maintenance`);
    const historyData = await historyRes.json();
    setHistory(Array.isArray(historyData) ? historyData : []);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!exhibitorId) {
      setError("Expositor não encontrado.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/exhibitors/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exhibitorId,
          type,
          description: description || null,
          solution: solution || null,
          notes: notes || null,
          nextActionAt: nextActionAt
            ? new Date(nextActionAt).toISOString()
            : null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Erro ao salvar manutenção");
      }

      setType("CORRECTIVE");
      setDescription("");
      setSolution("");
      setNotes("");
      setNextActionAt("");

      await reloadHistory();
      alert("Manutenção registrada com sucesso!");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao registrar manutenção");
    } finally {
      setSaving(false);
    }
  }

  const card: React.CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: 18,
    background: theme.cardBg,
    boxShadow: theme.isDark
      ? "0 10px 30px rgba(2,6,23,0.35)"
      : "0 8px 24px rgba(15,23,42,0.06)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: inputBg,
    color: theme.text,
    outline: "none",
    fontSize: 14,
  };

  const btn: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: theme.primary,
    border: `1px solid ${theme.primary}`,
    color: "#ffffff",
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        Carregando manutenção do expositor...
      </div>
    );
  }

  if (error && !exhibitor) {
    return (
      <div
        style={{
          padding: 24,
          color: theme.text,
          background: theme.pageBg,
          minHeight: "100%",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 0 }}>
          Erro ao carregar
        </h1>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            marginTop: 12,
            color: "#ef4444",
          }}
        >
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 24,
        color: theme.text,
        background: theme.pageBg,
        minHeight: "100%",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.subtext,
          marginBottom: 10,
        }}
      >
        🏠 / Expositores / Manutenção
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: theme.subtext,
              marginBottom: 6,
            }}
          >
            Expositor ID: {exhibitor?.id ?? "-"}
          </div>

          <h1
            style={{
              fontSize: 30,
              fontWeight: 900,
              margin: 0,
              color: theme.text,
            }}
          >
            Manutenção do expositor
          </h1>

          <div
            style={{
              marginTop: 10,
              color: theme.subtext,
              display: "grid",
              gap: 4,
            }}
          >
            <div>
              <b style={{ color: theme.text }}>Cliente:</b>{" "}
              {exhibitor?.client?.name ?? "-"}
            </div>
            <div>
              <b style={{ color: theme.text }}>Região:</b>{" "}
              {exhibitor?.region?.name ?? "-"}
            </div>
            <div>
              <b style={{ color: theme.text }}>Instalado em:</b>{" "}
              {formatDateBR(exhibitor?.installedAt)}
            </div>
            <div>
              <b style={{ color: theme.text }}>Última manutenção:</b>{" "}
              {formatDateBR(exhibitor?.lastMaintenanceAt)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            style={btn}
            onClick={() => router.push(`/exhibitors/${exhibitorId}`)}
          >
            Voltar aos detalhes
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
        }}
      >
        <div style={card}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 12,
              color: theme.text,
            }}
          >
            Registrar manutenção
          </div>

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Tipo
              </label>
              <select
                style={input}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {maintenanceTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Problema encontrado
              </label>
              <textarea
                style={{ ...input, minHeight: 90, resize: "vertical" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Solução aplicada
              </label>
              <textarea
                style={{ ...input, minHeight: 90, resize: "vertical" }}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Observações
              </label>
              <textarea
                style={{ ...input, minHeight: 90, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontWeight: 700,
                  color: theme.text,
                }}
              >
                Próxima ação (opcional)
              </label>
              <input
                style={input}
                type="datetime-local"
                value={nextActionAt}
                onChange={(e) => setNextActionAt(e.target.value)}
              />
            </div>

            {error && (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  color: "#ef4444",
                  marginBottom: 12,
                }}
              >
                {error}
              </pre>
            )}

            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? "Salvando..." : "Salvar manutenção"}
            </button>
          </form>
        </div>

        <div style={card}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              marginBottom: 12,
              color: theme.text,
            }}
          >
            Histórico de manutenção
          </div>

          {history.length === 0 ? (
            <div style={{ color: theme.subtext }}>
              Nenhuma manutenção registrada.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {history.map((m: any) => (
                <div
                  key={m.id}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    padding: 12,
                    background: subtleCard,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        color: theme.text,
                      }}
                    >
                      {formatMaintenanceType(m.type)}
                    </div>

                    <div style={{ color: theme.subtext }}>
                      {formatDateBR(m.performedAt)}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, color: theme.subtext }}>
                    <b style={{ color: theme.text }}>Problema:</b>{" "}
                    {m.description ?? "-"}
                  </div>

                  <div style={{ marginTop: 6, color: theme.subtext }}>
                    <b style={{ color: theme.text }}>Solução:</b>{" "}
                    {m.solution ?? "-"}
                  </div>

                  <div style={{ marginTop: 6, color: theme.subtext }}>
                    <b style={{ color: theme.text }}>Obs:</b> {m.notes ?? "-"}
                  </div>

                  <div style={{ marginTop: 6, color: theme.subtext }}>
                    <b style={{ color: theme.text }}>Próxima ação:</b>{" "}
                    {formatDateBR(m.nextActionAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}