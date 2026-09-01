"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import MobileRepPageFrame from "@/app/components/mobile/mobile-rep-page-frame";
import {
  MobileCard,
  MobileSectionTitle,
  MobileStatCard,
  formatDateBR,
} from "@/app/components/mobile/mobile-shell";
import { useTheme } from "@/app/providers/theme-provider";
import { getThemeColors } from "@/lib/theme";

type ClientItem = {
  id: string;
  name?: string | null;
  tradeName?: string | null;
  legalName?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type TaskItem = {
  id: string;
  title: string;
  notes?: string | null;
  type: string;
  priority: string;
  status: string;
  dueAt?: string | null;
  completedAt?: string | null;
  client?: {
    id: string;
    name?: string | null;
    tradeName?: string | null;
    city?: string | null;
    state?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

type TaskBucket = "today" | "late" | "next" | "done";

const taskTypeLabels: Record<string, string> = {
  TASK: "Tarefa",
  CALL: "Ligação",
  VISIT: "Visita",
  FOLLOW_UP: "Retorno",
  NOTE: "Nota",
};

function resolveClients(data: unknown): ClientItem[] {
  if (Array.isArray(data)) return data as ClientItem[];
  if (data && typeof data === "object") {
    const record = data as { items?: ClientItem[]; clients?: ClientItem[] };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.clients)) return record.clients;
  }
  return [];
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toInputDateTime(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function phoneDigits(value?: string | null) {
  return String(value ?? "").replace(/\D/g, "");
}

function whatsappDigits(value?: string | null) {
  const digits = phoneDigits(value);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function classifyTask(task: TaskItem): TaskBucket {
  if (task.status === "DONE") return "done";
  if (!task.dueAt) return "next";

  const dueAt = new Date(task.dueAt);
  if (Number.isNaN(dueAt.getTime())) return "next";

  if (dueAt < startOfDay()) return "late";
  if (dueAt <= endOfDay()) return "today";
  return "next";
}

function clientName(client?: TaskItem["client"] | ClientItem | null) {
  return client?.tradeName?.trim() || client?.name?.trim() || "Sem cliente";
}

export default function MobileRepAgendaPage() {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<TaskBucket>("today");
  const [query, setQuery] = useState("");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [priority, setPriority] = useState("NORMAL");
  const [dueAt, setDueAt] = useState(toInputDateTime());

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tasksRes, clientsRes] = await Promise.all([
        fetch("/api/rep/tasks", { cache: "no-store" }),
        fetch("/api/rep/clients", { cache: "no-store" }),
      ]);

      const tasksJson = await tasksRes.json().catch(() => null);
      const clientsJson = await clientsRes.json().catch(() => null);

      if (!tasksRes.ok) {
        throw new Error(tasksJson?.error || "Erro ao carregar agenda.");
      }

      setTasks(Array.isArray(tasksJson?.items) ? tasksJson.items : []);
      setClients(clientsRes.ok ? resolveClients(clientsJson) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const grouped = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        acc[classifyTask(task)].push(task);
        return acc;
      },
      { today: [], late: [], next: [], done: [] } as Record<TaskBucket, TaskItem[]>
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const source = grouped[bucket] ?? [];

    return source.filter((task) => {
      if (!normalized) return true;
      const haystack = [
        task.title,
        task.notes,
        taskTypeLabels[task.type] ?? task.type,
        task.client?.name,
        task.client?.tradeName,
        task.client?.city,
        task.client?.state,
        task.client?.phone,
        task.client?.whatsapp,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [bucket, grouped, query]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const res = await fetch("/api/rep/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes,
          clientId: clientId || null,
          type,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao criar tarefa.");
      }

      if (json?.task) {
        setTasks((prev) => [json.task, ...prev]);
      }

      setTitle("");
      setNotes("");
      setClientId("");
      setType("FOLLOW_UP");
      setPriority("NORMAL");
      setDueAt(toInputDateTime());
      setBucket("today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar tarefa.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: TaskItem, completed: boolean) {
    try {
      const res = await fetch(`/api/rep/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Erro ao atualizar tarefa.");
      }

      if (json?.task) {
        setTasks((prev) =>
          prev.map((item) => (item.id === task.id ? json.task : item))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar tarefa.");
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    padding: "0 12px",
    outline: "none",
    boxSizing: "border-box",
    fontSize: 14,
  };

  const iconButtonStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.cardBg,
    color: colors.text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <MobileRepPageFrame
      title="Agenda"
      subtitle="Tarefas, retornos, visitas e notas do dia"
      desktopHref="/rep/agenda"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 12,
        }}
      >
        <MobileStatCard label="Hoje" value={String(grouped.today.length)} />
        <MobileStatCard label="Atrasadas" value={String(grouped.late.length)} />
        <MobileStatCard label="Próximas" value={String(grouped.next.length)} />
        <MobileStatCard label="Concluídas" value={String(grouped.done.length)} />
      </div>

      <MobileCard>
        <MobileSectionTitle title="Adicionar rápido" />

        <form onSubmit={createTask} style={{ display: "grid", gap: 10 }}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex: Ligar para cliente, enviar proposta..."
            style={fieldStyle}
            required
          />

          <select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            style={fieldStyle}
          >
            <option value="">Sem cliente vinculado</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientName(client)}
                {client.city ? ` - ${client.city}` : ""}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 10,
            }}
          >
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              style={fieldStyle}
            >
              <option value="FOLLOW_UP">Retorno</option>
              <option value="CALL">Ligação</option>
              <option value="VISIT">Visita</option>
              <option value="TASK">Tarefa</option>
              <option value="NOTE">Nota</option>
            </select>

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              style={fieldStyle}
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="LOW">Baixa</option>
            </select>
          </div>

          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            style={fieldStyle}
          />

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anotação rápida"
            style={{
              ...fieldStyle,
              height: 86,
              paddingTop: 12,
              resize: "vertical",
              lineHeight: 1.4,
            }}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              height: 44,
              borderRadius: 12,
              border: "none",
              background: colors.primary,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 900,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.72 : 1,
            }}
          >
            <Plus size={16} />
            {saving ? "Salvando..." : "Adicionar à agenda"}
          </button>
        </form>
      </MobileCard>

      <MobileCard>
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {[
            ["today", "Hoje"],
            ["late", "Atrasadas"],
            ["next", "Próximas"],
            ["done", "Concluídas"],
          ].map(([value, label]) => {
            const active = bucket === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setBucket(value as TaskBucket)}
                style={{
                  height: 38,
                  padding: "0 13px",
                  borderRadius: 12,
                  border: `1px solid ${active ? colors.primary : colors.border}`,
                  background: active ? colors.primary : colors.cardBg,
                  color: active ? "#fff" : colors.text,
                  fontSize: 12,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            border: `1px solid ${colors.border}`,
            borderRadius: 14,
            padding: "0 12px",
            height: 44,
            background: colors.cardBg,
          }}
        >
          <Search size={16} color={colors.subtext} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar na agenda"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: colors.text,
              width: "100%",
              fontSize: 14,
            }}
          />
        </div>
      </MobileCard>

      {error ? (
        <MobileCard style={{ borderColor: "#ef4444", color: "#ef4444" }}>
          {error}
        </MobileCard>
      ) : null}

      {loading ? (
        <MobileCard>Carregando agenda...</MobileCard>
      ) : visibleTasks.length === 0 ? (
        <MobileCard>Nenhum item nesta lista.</MobileCard>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleTasks.map((task) => {
            const client = task.client;
            const tel = phoneDigits(client?.phone || client?.whatsapp);
            const whats = whatsappDigits(client?.whatsapp || client?.phone);
            const hasCoords =
              typeof client?.latitude === "number" &&
              typeof client?.longitude === "number";
            const mapsUrl = hasCoords
              ? `https://www.google.com/maps/dir/?api=1&destination=${client?.latitude},${client?.longitude}`
              : "";

            return (
              <MobileCard key={task.id} style={{ padding: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          borderRadius: 999,
                          padding: "5px 8px",
                          background:
                            task.priority === "HIGH"
                              ? colors.isDark
                                ? "#331515"
                                : "#fee2e2"
                              : colors.isDark
                                ? "#111827"
                                : "#eef2ff",
                          color: task.priority === "HIGH" ? "#ef4444" : colors.primary,
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        {taskTypeLabels[task.type] ?? "Tarefa"}
                      </span>

                      {task.dueAt ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: colors.subtext,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          <CalendarDays size={13} />
                          {formatDateBR(task.dueAt)}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 16,
                        fontWeight: 900,
                        color: colors.text,
                        lineHeight: 1.25,
                      }}
                    >
                      {task.title}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: colors.subtext,
                        lineHeight: 1.45,
                      }}
                    >
                      {client ? (
                        <>
                          {clientName(client)}
                          {client.city ? ` - ${client.city}` : ""}
                          {client.state ? `/${client.state}` : ""}
                        </>
                      ) : (
                        "Sem cliente vinculado"
                      )}
                    </div>

                    {task.notes ? (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 13,
                          color: colors.text,
                          lineHeight: 1.45,
                        }}
                      >
                        {task.notes}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleTask(task, task.status !== "DONE")}
                    style={{
                      ...iconButtonStyle,
                      color: task.status === "DONE" ? colors.primary : "#16a34a",
                    }}
                    aria-label={task.status === "DONE" ? "Reabrir" : "Concluir"}
                    title={task.status === "DONE" ? "Reabrir" : "Concluir"}
                  >
                    {task.status === "DONE" ? (
                      <RotateCcw size={17} />
                    ) : (
                      <Check size={18} />
                    )}
                  </button>
                </div>

                {client ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0,1fr))",
                      gap: 8,
                    }}
                  >
                    <Link
                      href={`/m/rep/clients/${client.id}`}
                      style={{ ...iconButtonStyle, width: "100%", textDecoration: "none" }}
                      title="Cliente"
                    >
                      <Search size={16} />
                    </Link>

                    <a
                      href={tel ? `tel:${tel}` : "#"}
                      style={{
                        ...iconButtonStyle,
                        width: "100%",
                        textDecoration: "none",
                        opacity: tel ? 1 : 0.45,
                      }}
                      title="Ligar"
                    >
                      <Phone size={16} />
                    </a>

                    <a
                      href={whats ? `https://wa.me/${whats}` : "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...iconButtonStyle,
                        width: "100%",
                        textDecoration: "none",
                        opacity: whats ? 1 : 0.45,
                      }}
                      title="WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </a>

                    <a
                      href={mapsUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...iconButtonStyle,
                        width: "100%",
                        textDecoration: "none",
                        opacity: mapsUrl ? 1 : 0.45,
                      }}
                      title="Rota"
                    >
                      <MapPin size={16} />
                    </a>
                  </div>
                ) : null}
              </MobileCard>
            );
          })}
        </div>
      )}
    </MobileRepPageFrame>
  );
}
