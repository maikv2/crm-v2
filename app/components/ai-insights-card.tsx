"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowRight, Lightbulb, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useTheme } from "../providers/theme-provider";
import { getThemeColors } from "../../lib/theme";

// Card "Insights da IA" do dashboard. Gera sob demanda (botao) pra controlar
// custo; o ultimo resultado fica guardado no navegador e aparece ao voltar.

type Insight = {
  tipo: "alerta" | "oportunidade" | "tendencia" | "resumo";
  titulo: string;
  mensagem: string;
  acao: string;
  href: string | null;
};

type Stored = { insights: Insight[]; generatedAt: string };

const STORAGE_KEY = "v2_ai_insights_v1";

const TIPO_STYLE: Record<Insight["tipo"], { color: string; label: string; Icon: typeof Lightbulb }> = {
  alerta: { color: "#ef4444", label: "Alerta", Icon: AlertTriangle },
  oportunidade: { color: "#16a34a", label: "Oportunidade", Icon: Lightbulb },
  tendencia: { color: "#2563eb", label: "Tendência", Icon: TrendingUp },
  resumo: { color: "#7c3aed", label: "Resumo", Icon: Sparkles },
};

function boldHtml(text: string) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return { __html: escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") };
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AiInsightsCard({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const [data, setData] = useState<Stored | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storageKey = `${STORAGE_KEY}:${pathname?.startsWith("/m/") ? "m" : "d"}:${pathname?.split("/").slice(0, 3).join("/")}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [storageKey]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json?.insights)) {
        setError(json?.error || "Não foi possível gerar os insights.");
        return;
      }
      const stored: Stored = { insights: json.insights, generatedAt: json.generatedAt };
      setData(stored);
      try {
        localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        /* noop */
      }
    } catch {
      setError("Sem conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: compact ? 18 : 16,
        background: colors.isDark
          ? "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(124,58,237,0.10)), #0f172a"
          : "linear-gradient(135deg, #eff6ff, #f5f3ff)",
        padding: compact ? 14 : 18,
        marginBottom: compact ? 0 : 22,
        color: colors.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: data || error ? 12 : 0 }}>
        <Sparkles size={18} color="#7c3aed" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>Insights da IA</div>
          <div style={{ fontSize: 12, color: colors.subtext }}>
            {data ? `Gerado em ${formatWhen(data.generatedAt)}` : "Análise das suas vendas, clientes e cobranças com dicas práticas."}
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            border: 0,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.75 : 1,
            flexShrink: 0,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "v2-ai-spin 1s linear infinite" : undefined }} />
          {loading ? "Analisando…" : data ? "Atualizar" : "Gerar insights"}
        </button>
      </div>

      {error ? <div style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>{error}</div> : null}

      {data ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 10,
          }}
        >
          {data.insights.map((insight, index) => {
            const style = TIPO_STYLE[insight.tipo] ?? TIPO_STYLE.resumo;
            const Icon = style.Icon;
            return (
              <div
                key={index}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `4px solid ${style.color}`,
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: style.color, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                  <Icon size={13} /> {style.label}
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{insight.titulo}</div>
                <div style={{ fontSize: 13, lineHeight: 1.45, color: colors.text }} dangerouslySetInnerHTML={boldHtml(insight.mensagem)} />
                {insight.href ? (
                  <Link
                    href={insight.href}
                    style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: style.color, textDecoration: "none" }}
                  >
                    {insight.acao} <ArrowRight size={13} />
                  </Link>
                ) : (
                  <div style={{ marginTop: "auto", fontSize: 12, fontWeight: 700, color: colors.subtext }}>{insight.acao}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
      <style>{`@keyframes v2-ai-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
