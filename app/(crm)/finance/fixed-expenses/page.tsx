"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../../providers/theme-provider";
import { getThemeColors } from "../../../../lib/theme";
import {
  Plus, RefreshCw, ToggleLeft, ToggleRight, Pencil, Trash2,
  Building2, MapPin, ArrowLeft, Divide, CalendarClock,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type FixedExpense = {
  id: string;
  description: string;
  amountCents: number;
  category: string;
  scope: "MATRIX" | "REGION";
  regionId: string | null;
  region: { id: string; name: string } | null;
  active: boolean;
  dayOfMonth: number;
  paymentMethod: string | null;
  notes: string | null;
  perRegionCents: number | null;
  activeRegionsCount: number | null;
  createdAt: string;
};

type Region = { id: string; name: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "ADMINISTRATIVE", label: "Administrativo" },
  { value: "PAYROLL", label: "Folha de Pagamento" },
  { value: "RENT", label: "Aluguel" },
  { value: "LOGISTICS", label: "Logística" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ACCOUNTING", label: "Contabilidade" },
  { value: "TAX", label: "Impostos e Taxas" },
  { value: "COMMISSION", label: "Comissão" },
  { value: "UNIFORM", label: "Uniforme" },
  { value: "EXHIBITOR", label: "Expositor" },
  { value: "STOCK_PURCHASE", label: "Compra de Estoque" },
  { value: "OTHER", label: "Outros" },
];

const PAYMENT_METHODS = [
  { value: "", label: "Não informado" },
  { value: "PIX", label: "PIX" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD_DEBIT", label: "Cartão Débito" },
  { value: "CARD_CREDIT", label: "Cartão Crédito" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const PAYMENT_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((p) => [p.value, p.label]));

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

type FormData = {
  description: string;
  amountBRL: string;
  category: string;
  scope: "MATRIX" | "REGION";
  regionId: string;
  dayOfMonth: string;
  paymentMethod: string;
  notes: string;
};

const EMPTY_FORM: FormData = {
  description: "", amountBRL: "", category: "ADMINISTRATIVE",
  scope: "MATRIX", regionId: "", dayOfMonth: "1", paymentMethod: "", notes: "",
};

function Modal({
  open, onClose, onSave, regions, editing, theme,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  regions: Region[];
  editing: FixedExpense | null;
  theme: ReturnType<typeof getThemeColors>;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) {
      setForm({
        description: editing.description,
        amountBRL: (editing.amountCents / 100).toFixed(2).replace(".", ","),
        category: editing.category,
        scope: editing.scope,
        regionId: editing.regionId ?? "",
        dayOfMonth: String(editing.dayOfMonth),
        paymentMethod: editing.paymentMethod ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [editing, open]);

  if (!open) return null;

  const isDark = theme.isDark;
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const inputBg = isDark ? "#0b1324" : "#f8fafc";
  const muted = isDark ? "#94a3b8" : "#64748b";

  function set(field: keyof FormData, val: string) {
    setForm((p) => ({ ...p, [field]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: muted, display: "block", marginBottom: 6 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: theme.text, fontSize: 13, fontWeight: 500 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: cardBg, borderRadius: 18, padding: 28, width: "100%", maxWidth: 540, boxShadow: "0 24px 64px rgba(0,0,0,0.35)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: theme.text, marginBottom: 20 }}>
          {editing ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição *</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} style={inputStyle} placeholder="Ex: Aluguel galpão, Contador, Internet..." required />
          </div>

          {/* Valor + Dia */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Valor Mensal (R$) *</label>
              <input value={form.amountBRL} onChange={(e) => set("amountBRL", e.target.value)} style={inputStyle} placeholder="0,00" required />
            </div>
            <div>
              <label style={labelStyle}>Dia do Vencimento</label>
              <input type="number" min={1} max={28} value={form.dayOfMonth} onChange={(e) => set("dayOfMonth", e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Categoria + Forma de Pagamento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Categoria *</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Forma de Pagamento</label>
              <select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} style={inputStyle}>
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Escopo */}
          <div>
            <label style={labelStyle}>Escopo *</label>
            <div style={{ display: "flex", gap: 10 }}>
              {([["MATRIX", "Matriz (divide entre regiões)", Building2], ["REGION", "Região específica", MapPin]] as const).map(([val, label, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { set("scope", val); if (val === "MATRIX") set("regionId", ""); }}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                    borderRadius: 10, border: `2px solid ${form.scope === val ? "#6366f1" : border}`,
                    background: form.scope === val ? (isDark ? "rgba(99,102,241,0.12)" : "#eef2ff") : inputBg,
                    color: form.scope === val ? "#6366f1" : muted, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Região (se escopo REGION) */}
          {form.scope === "REGION" && (
            <div>
              <label style={labelStyle}>Região *</label>
              <select value={form.regionId} onChange={(e) => set("regionId", e.target.value)} style={inputStyle} required={form.scope === "REGION"}>
                <option value="">Selecione a região...</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {/* Observações */}
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Detalhes adicionais..." />
          </div>

          {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: isDark ? "rgba(239,68,68,0.12)" : "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: muted, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: saving ? "wait" : "pointer", fontWeight: 800, fontSize: 13, opacity: saving ? 0.8 : 1 }}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar despesa fixa"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FixedExpensesPage() {
  const router = useRouter();
  const { theme: mode } = useTheme();
  const theme = getThemeColors(mode);

  const isDark = theme.isDark;
  const pageBg = isDark ? "#081225" : theme.pageBg;
  const cardBg = isDark ? "#0f172a" : "#ffffff";
  const border = isDark ? "#1e293b" : "#e5e7eb";
  const muted = isDark ? "#94a3b8" : "#64748b";
  const subtle = isDark ? "#0b1324" : "#f8fafc";

  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [expRes, regRes] = await Promise.all([
      fetch("/api/finance/fixed-expenses"),
      fetch("/api/regions"),
    ]);
    if (expRes.ok) setExpenses(await expRes.json());
    if (regRes.ok) setRegions(await regRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSave(form: FormData) {
    const amountCents = Math.round(parseFloat(form.amountBRL.replace(",", ".")) * 100);
    if (!amountCents || amountCents <= 0) throw new Error("Valor inválido.");

    const payload = {
      description: form.description,
      amountCents,
      category: form.category,
      scope: form.scope,
      regionId: form.scope === "REGION" ? form.regionId : null,
      dayOfMonth: Number(form.dayOfMonth) || 1,
      paymentMethod: form.paymentMethod || null,
      notes: form.notes || null,
    };

    const url = editing ? `/api/finance/fixed-expenses/${editing.id}` : "/api/finance/fixed-expenses";
    const method = editing ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "Erro ao salvar.");
    }
    await load();
    setEditing(null);
  }

  async function toggleActive(e: FixedExpense) {
    await fetch(`/api/finance/fixed-expenses/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !e.active }),
    });
    await load();
  }

  async function handleDelete(e: FixedExpense) {
    if (!confirm(`Excluir "${e.description}"? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/finance/fixed-expenses/${e.id}`, { method: "DELETE" });
    await load();
  }

  async function handleGenerateMonth() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (!confirm(`Lançar todas as despesas fixas ativas para ${month}/${year}?\n\nDespesas já lançadas neste mês serão ignoradas.`)) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/finance/fixed-expenses/generate-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const json = await res.json();
      setGenResult(res.ok ? `✓ ${json.message}` : `✗ ${json.error}`);
    } catch {
      setGenResult("✗ Erro ao gerar lançamentos.");
    } finally {
      setGenerating(false);
    }
  }

  const active = expenses.filter((e) => e.active);
  const inactive = expenses.filter((e) => !e.active);
  const totalActiveCents = active.reduce((s, e) => s + e.amountCents, 0);
  const matrixExpenses = active.filter((e) => e.scope === "MATRIX");
  const regionExpenses = active.filter((e) => e.scope === "REGION");

  return (
    <>
      <Modal open={modalOpen || !!editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={handleSave} regions={regions} editing={editing} theme={theme} />

      <div style={{ color: theme.text, background: pageBg, minHeight: "100vh", padding: 24 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push("/finance")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: muted, fontWeight: 700, fontSize: 13, marginBottom: 10, padding: 0 }}>
            <ArrowLeft size={14} /> Voltar ao Financeiro
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: isDark ? "rgba(99,102,241,0.18)" : "#eef2ff", color: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarClock size={22} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: theme.text }}>Despesas Fixas</div>
                <div style={{ fontSize: 13, color: muted, marginTop: 3 }}>Despesas recorrentes mensais da empresa</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleGenerateMonth} disabled={generating} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: `1px solid ${border}`, background: cardBg, color: theme.text, cursor: generating ? "wait" : "pointer", fontWeight: 700, fontSize: 13, opacity: generating ? 0.7 : 1 }}>
                <RefreshCw size={15} color="#ea580c" />
                {generating ? "Gerando..." : "Lançar este mês"}
              </button>
              <button onClick={() => { setEditing(null); setModalOpen(true); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
                <Plus size={15} />
                Nova despesa fixa
              </button>
            </div>
          </div>
        </div>

        {/* Generate result */}
        {genResult && (
          <div style={{ marginBottom: 16, padding: "12px 18px", borderRadius: 10, background: genResult.startsWith("✓") ? (isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4") : (isDark ? "rgba(239,68,68,0.12)" : "#fef2f2"), border: `1px solid ${genResult.startsWith("✓") ? "#16a34a" : "#dc2626"}`, fontSize: 13, fontWeight: 700, color: genResult.startsWith("✓") ? "#16a34a" : "#dc2626", display: "flex", justifyContent: "space-between" }}>
            <span>{genResult}</span>
            <button onClick={() => setGenResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Mensal Fixo", value: money(totalActiveCents), color: "#dc2626", sub: `${active.length} despesa${active.length !== 1 ? "s" : ""} ativa${active.length !== 1 ? "s" : ""}` },
            { label: "Despesas da Matriz", value: money(matrixExpenses.reduce((s, e) => s + e.amountCents, 0)), color: "#6366f1", sub: `${matrixExpenses.length} despesa${matrixExpenses.length !== 1 ? "s" : ""}` },
            { label: "Despesas Regionais", value: money(regionExpenses.reduce((s, e) => s + e.amountCents, 0)), color: "#ea580c", sub: `${regionExpenses.length} despesa${regionExpenses.length !== 1 ? "s" : ""}` },
            { label: "Inativas", value: String(inactive.length), color: muted, sub: "Pausadas" },
          ].map((item) => (
            <div key={item.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 16, padding: 18, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
              <div style={{ fontSize: 12, color: muted, marginBottom: 8, fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Expenses list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: muted, fontWeight: 700 }}>Carregando...</div>
        ) : expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: muted }}>
            <CalendarClock size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>Nenhuma despesa fixa cadastrada</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>Adicione aluguel, contador, salários e outras despesas recorrentes</div>
          </div>
        ) : (
          <>
            {/* Active */}
            {active.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden", marginBottom: 20, boxShadow: isDark ? "0 10px 30px rgba(2,6,23,0.35)" : "0 8px 24px rgba(15,23,42,0.06)" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>Despesas Ativas ({active.length})</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{money(totalActiveCents)}/mês</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: subtle }}>
                      {["Descrição", "Escopo", "Categoria", "Vencimento", "Forma Pgto", "Valor Total", "Por Região", "Ações"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((e) => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, color: theme.text }}>{e.description}</div>
                          {e.notes && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{e.notes}</div>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {e.scope === "MATRIX" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: isDark ? "rgba(99,102,241,0.15)" : "#eef2ff", color: "#6366f1" }}>
                              <Building2 size={11} /> Matriz
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: isDark ? "rgba(249,115,22,0.14)" : "#fff7ed", color: "#ea580c" }}>
                              <MapPin size={11} /> {e.region?.name ?? "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", color: muted }}>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                        <td style={{ padding: "12px 16px", color: muted }}>Dia {e.dayOfMonth}</td>
                        <td style={{ padding: "12px 16px", color: muted }}>{PAYMENT_LABELS[e.paymentMethod ?? ""] || "—"}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "#dc2626" }}>{money(e.amountCents)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {e.scope === "MATRIX" && e.perRegionCents !== null ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Divide size={12} color="#6366f1" />
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#6366f1" }}>{money(e.perRegionCents)}</span>
                              <span style={{ fontSize: 11, color: muted }}>/ {e.activeRegionsCount} regiões</span>
                            </div>
                          ) : <span style={{ color: muted }}>—</span>}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => toggleActive(e)} title="Pausar" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
                              <ToggleRight size={16} />
                            </button>
                            <button onClick={() => { setEditing(e); setModalOpen(false); }} title="Editar" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: muted }}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(e)} title="Excluir" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inactive */}
            {inactive.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 18, overflow: "hidden", opacity: 0.65 }}>
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: muted }}>Pausadas ({inactive.length})</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {inactive.map((e) => (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${border}` }}>
                        <td style={{ padding: "10px 16px", color: muted, fontWeight: 600, textDecoration: "line-through" }}>{e.description}</td>
                        <td style={{ padding: "10px 16px", color: muted }}>{e.scope === "MATRIX" ? "Matriz" : e.region?.name}</td>
                        <td style={{ padding: "10px 16px", color: muted }}>{CATEGORY_LABELS[e.category]}</td>
                        <td style={{ padding: "10px 16px", color: muted }}>{money(e.amountCents)}</td>
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => toggleActive(e)} title="Reativar" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: muted }}>
                              <ToggleLeft size={16} />
                            </button>
                            <button onClick={() => handleDelete(e)} title="Excluir" style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
